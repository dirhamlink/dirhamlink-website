import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Notification worker is missing Supabase configuration.");

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: jobs, error } = await admin
      .from("transfer_completion_notifications")
      .select("transfer_id")
      .or("email_status.in.(queued,failed),whatsapp_status.in.(queued,failed)")
      .order("created_at", { ascending: true })
      .limit(20);
    if (error) throw error;

    const origin = new URL(request.url).origin;
    const results = await Promise.all((jobs ?? []).map(async (job) => {
      const response = await fetch(`${origin}/api/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transferId: job.transfer_id }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      return { transferId: job.transfer_id, status: response.status, result: payload };
    }));

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("[notification-cron] queue processing failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Queue processing failed." },
      { status: 500 },
    );
  }
}
