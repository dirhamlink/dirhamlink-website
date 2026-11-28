import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only diagnostics: exposes webhook delivery metadata, never the bot token or secret.
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, configured: false, error: "Bot token is missing." }, { status: 503 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      return NextResponse.json({ ok: false, error: payload.description ?? "Telegram diagnostics request failed." }, { status: 502 });
    }
    const info = payload.result ?? {};
    return NextResponse.json({
      ok: true,
      configured: true,
      webhookConfigured: Boolean(info.url),
      webhookPath: info.url ? new URL(info.url).pathname : null,
      pendingUpdateCount: info.pending_update_count ?? null,
      lastErrorDate: info.last_error_date ?? null,
      lastErrorMessage: info.last_error_message ?? null,
      allowedUpdates: info.allowed_updates ?? [],
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not contact Telegram." }, { status: 502 });
  }
}
