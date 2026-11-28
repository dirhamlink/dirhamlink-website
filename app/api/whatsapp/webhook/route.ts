import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("WhatsApp integration is not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WhatsApp Cloud API credentials are missing.");
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("WhatsApp send failed", response.status, detail.slice(0, 500));
    throw new Error("Could not send WhatsApp reply.");
  }
}

type WhatsAppMessage = { from?: string; type?: string; text?: { body?: string } };
type WebhookPayload = {
  entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }> }>;
};

async function handleMessage(from: string, text: string) {
  const db = getAdminClient();
  const normalized = text.trim();
  const lower = normalized.toLowerCase();
  const { data: session } = await db.from("whatsapp_bot_sessions")
    .select("state,pending_name,consent_at").eq("wa_id", from).maybeSingle();

  if (["hi", "hello", "hey", "menu", "start"].includes(lower)) {
    await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "idle", pending_name: null, updated_at: new Date().toISOString() });
    await sendWhatsAppText(from,
      "Welcome to DirhamLink!\n\nReply with:\n1 - Exchange-rate information\n2 - Register for a DirhamLink account\n3 - Speak to our team\n\nYou can type MENU at any time.");
    return;
  }

  if (lower === "1") {
    await sendWhatsAppText(from, "You can view DirhamLink's current indicative rates on our website. Rates, fees and availability are confirmed by our team before any transfer. Reply MENU to return to the main menu.");
    return;
  }

  if (lower === "2" || lower === "register") {
    await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "consent", pending_name: null, consent_at: null, updated_at: new Date().toISOString() });
    await sendWhatsAppText(from, "To begin registration, DirhamLink will use your WhatsApp number and the details you provide to create a registration request and contact you about your account. This does not verify your identity or initiate a transfer. Reply YES to consent, or NO to cancel.");
    return;
  }

  if (lower === "no" && session?.state === "consent") {
    await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "idle", pending_name: null, consent_at: null, updated_at: new Date().toISOString() });
    await sendWhatsAppText(from, "No problem. No registration request was created. Reply MENU whenever you need help.");
    return;
  }

  if (lower === "yes" && session?.state === "consent") {
    await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "name", consent_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await sendWhatsAppText(from, "Thank you. Please enter your full name as shown on your identity document.");
    return;
  }

  if (session?.state === "name") {
    if (normalized.length < 2 || normalized.length > 100) {
      await sendWhatsAppText(from, "Please enter a name between 2 and 100 characters.");
      return;
    }
    await db.from("whatsapp_bot_sessions").update({ state: "email", pending_name: normalized, updated_at: new Date().toISOString() }).eq("wa_id", from);
    await sendWhatsAppText(from, "Thank you. Please enter your email address, or reply SKIP if you do not want to provide one.");
    return;
  }

  if (session?.state === "email") {
    const email = lower === "skip" ? null : normalized.toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendWhatsAppText(from, "That email address does not look valid. Please try again or reply SKIP.");
      return;
    }
    if (!session.consent_at || !session.pending_name) {
      await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "idle", pending_name: null, consent_at: null, updated_at: new Date().toISOString() });
      await sendWhatsAppText(from, "Your registration session expired. Reply MENU and start again.");
      return;
    }
    const { error } = await db.from("whatsapp_customer_registrations").upsert({
      wa_id: from,
      full_name: session.pending_name,
      email,
      consent_at: session.consent_at,
      status: "pending_review",
      updated_at: new Date().toISOString(),
    }, { onConflict: "wa_id" });
    if (error) {
      console.error("WhatsApp registration save failed", error.message);
      await sendWhatsAppText(from, "We could not save your registration just now. Please try again later or contact our team.");
      return;
    }
    await db.from("whatsapp_bot_sessions").upsert({ wa_id: from, state: "idle", pending_name: null, consent_at: null, updated_at: new Date().toISOString() });
    await sendWhatsAppText(from, "Thank you. Your DirhamLink registration request has been received. Our team will review it and help link it to your secure website account. This is not identity verification, transfer approval or a payout confirmation. Reply MENU for other options.");
    return;
  }

  if (lower === "3" || lower === "support") {
    await sendWhatsAppText(from, "Our team can help you with your inquiry. Please describe what you need, or visit the Support page on the DirhamLink website.");
    return;
  }

  await sendWhatsAppText(from, "Sorry, I didn't understand that. Reply MENU to see the available options.");
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const messages = payload.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
  ) ?? [];

  for (const message of messages) {
    if (message.from && message.type === "text" && message.text?.body) {
      try {
        await handleMessage(message.from, message.text.body);
      } catch (error) {
        console.error("WhatsApp webhook message handling failed", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
