import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const event = await request.json();
    if (event?.type !== "INSERT" ||
        event?.schema !== "public" ||
        event?.table !== "transfer_completion_notifications" ||
        typeof event?.record?.transfer_id !== "string") {
      return NextResponse.json({ error: "Unsupported notification webhook event." }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transferId: event.record.transfer_id }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(
      { triggered: true, transferId: event.record.transfer_id, notification: payload },
      { status: response.status },
    );
  } catch (error) {
    console.error("[notification-webhook] dispatch failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification webhook failed." },
      { status: 500 },
    );
  }
}
