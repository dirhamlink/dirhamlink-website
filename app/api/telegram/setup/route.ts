import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const suppliedKey = url.searchParams.get("key");
  const setupKey = process.env.TELEGRAM_SETUP_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!setupKey || !suppliedKey || suppliedKey !== setupKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!token || !webhookSecret) {
    return NextResponse.json({ error: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in Vercel first." }, { status: 503 });
  }

  const webhookUrl = new URL("/api/telegram/webhook", url.origin).toString();
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
      }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return NextResponse.json({ error: "Telegram rejected the webhook setup.", details: result.description ?? "Unknown Telegram API error." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: "Telegram webhook connected.", webhook: webhookUrl });
  } catch {
    return NextResponse.json({ error: "Could not reach Telegram to register the webhook." }, { status: 502 });
  }
}
