import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Channel = "email" | "whatsapp";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

async function sendEmail(input: {
  to: string; reference: string; country: string; completionReference: string;
  transferId: string;
}): Promise<string> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `dirhamlink-payout-email-${input.transferId}`,
    },
    body: JSON.stringify({
      from: requiredEnv("RESEND_FROM_EMAIL"),
      to: [input.to],
      subject: `Your DirhamLink transfer ${input.reference} has been completed`,
      text: `Dear Customer,\n\nYour transfer ${input.reference} to ${input.country} has been marked successfully delivered after payout confirmation by our team.\n\nCompletion reference: ${input.completionReference}\n\nThank you for choosing DirhamLink.\n\nThis notice confirms the status recorded by DirhamLink; please contact our team if you believe there is an issue.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h2>DirhamLink — Transfer completed</h2><p>Dear Customer,</p><p>Your transfer <strong>${escapeHtml(input.reference)}</strong> to <strong>${escapeHtml(input.country)}</strong> has been marked successfully delivered after payout confirmation by our team.</p><p>Completion reference: <strong>${escapeHtml(input.completionReference)}</strong></p><p>Thank you for choosing DirhamLink.</p><small>This notice confirms the status recorded by DirhamLink; please contact our team if you believe there is an issue.</small></div>`,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 700)}`);
  return String(payload.id ?? "");
}

async function sendWhatsApp(input: {
  to: string; reference: string; country: string; completionReference: string;
  transferId: string;
}): Promise<string> {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const phoneNumberId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = requiredEnv("WHATSAPP_COMPLETION_TEMPLATE_NAME");
  const language = process.env.WHATSAPP_COMPLETION_TEMPLATE_LANGUAGE || "en";
  const to = input.to.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(to)) throw new Error("Customer mobile is not in international format.");
  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("WHATSAPP_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: input.reference },
              { type: "text", text: input.country },
              { type: "text", text: input.completionReference },
            ],
          }],
        },
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 700)}`);
  return String(payload.messages?.[0]?.id ?? "");
}

async function deliverChannel(
  admin: ReturnType<typeof createClient>,
  job: Record<string, any>,
  channel: Channel,
  recipient: string | null,
  send: () => Promise<string>,
) {
  const statusColumn = channel === "email" ? "email_status" : "whatsapp_status";
  const attemptsColumn = channel === "email" ? "email_attempts" : "whatsapp_attempts";
  const errorColumn = channel === "email" ? "email_last_error" : "whatsapp_last_error";
  const providerColumn = channel === "email" ? "email_provider_id" : "whatsapp_provider_id";

  if (!recipient) {
    await admin.from("transfer_completion_notifications")
      .update({ [statusColumn]: "skipped", [errorColumn]: "No customer recipient address/number is available.", updated_at: new Date().toISOString() } as never)
      .eq("id", job.id);
    return;
  }

  // Atomic claim: concurrent requests cannot both send the same channel.
  const { data: claimed, error: claimError } = await admin
    .from("transfer_completion_notifications")
    .update({
      [statusColumn]: "sending",
      [attemptsColumn]: Number(job[attemptsColumn] ?? 0) + 1,
      [errorColumn]: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", job.id)
    .in(statusColumn, ["queued", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claimed) return;

  try {
    const providerId = await send();
    await admin.from("transfer_completion_notifications")
      .update({ [statusColumn]: "sent", [providerColumn]: providerId || null, [errorColumn]: null, updated_at: new Date().toISOString() } as never)
      .eq("id", job.id)
      .eq(statusColumn, "sending");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown delivery error";
    // An explicit provider rejection is retryable. Network/unknown outcomes are
    // held for manual review to avoid sending a duplicate if the provider accepted it.
    const uncertain = /fetch failed|network|timeout|aborted|socket|econnreset/i.test(message);
    await admin.from("transfer_completion_notifications")
      .update({
        [statusColumn]: uncertain ? "needs_review" : "failed",
        [errorColumn]: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", job.id)
      .eq(statusColumn, "sending");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });

    const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: membership, error: membershipError } = await admin
      .from("team_members").select("role, active").eq("user_id", authData.user.id).maybeSingle();
    if (membershipError || !membership?.active || !["owner", "admin", "staff"].includes(membership.role)) {
      return NextResponse.json({ error: "Active team permission required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const transferId = typeof body.transferId === "string" ? body.transferId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(transferId)) {
      return NextResponse.json({ error: "A valid transfer ID is required." }, { status: 400 });
    }

    const { data: transfer, error: transferError } = await admin
      .from("transfers")
      .select("id, customer_id, transaction_reference, destination_country, customer_mobile, status, completion_reference")
      .eq("id", transferId).maybeSingle();
    if (transferError || !transfer) return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
    if (transfer.status !== "payout_confirmed" || !transfer.completion_reference) {
      return NextResponse.json({ error: "Notifications are only available after payout_confirmed." }, { status: 409 });
    }

    const { data: job, error: jobError } = await admin
      .from("transfer_completion_notifications")
      .select("*").eq("transfer_id", transferId).maybeSingle();
    if (jobError || !job) {
      return NextResponse.json({ error: "Notification queue entry is missing. Apply the notification migration first." }, { status: 409 });
    }

    const { data: customerResult } = await admin.auth.admin.getUserById(transfer.customer_id);
    const customerEmail = customerResult.user?.email ?? null;
    const common = {
      reference: transfer.transaction_reference,
      country: transfer.destination_country,
      completionReference: transfer.completion_reference,
      transferId,
    };

    await Promise.all([
      deliverChannel(admin, job, "email", customerEmail, () => {
        if (!customerEmail) throw new Error("Customer email is not available.");
        return sendEmail({ ...common, to: customerEmail });
      }),
      deliverChannel(admin, job, "whatsapp", transfer.customer_mobile, () => {
        if (!transfer.customer_mobile) throw new Error("Customer mobile is not available.");
        return sendWhatsApp({ ...common, to: transfer.customer_mobile });
      }),
    ]);

    const { data: latest } = await admin
      .from("transfer_completion_notifications")
      .select("email_status, whatsapp_status, email_last_error, whatsapp_last_error")
      .eq("id", job.id).maybeSingle();

    return NextResponse.json({ success: true, notification: latest });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification dispatch failed." },
      { status: 500 },
    );
  }
}
