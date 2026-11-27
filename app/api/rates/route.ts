import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const symbols = "INR,PKR,NPR,BDT,EGP,PHP,LKR,IDR,THB,VND,CNY,UGX";

export async function GET() {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  const headers: HeadersInit = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  try {
    const response = await fetch(
      `https://api.exchangerate.dev/v1/latest/AED?symbols=${symbols}`,
      { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();
    if (!response.ok || data.result !== "success" || !data.rates) {
      return NextResponse.json({ error: "Live rate provider is temporarily unavailable." }, { status: 502 });
    }
    return NextResponse.json({
      base: data.base,
      rates: data.rates,
      source: data.source ?? "unknown",
      delayed_minutes: data.delayed_minutes ?? 0,
      market_session: data.market_session ?? "unknown",
      timestamp: data.timestamp ?? null,
      data_updated_at: data.data_updated_at ?? data.timestamp ?? null,
      stale: data.stale ?? {},
      notice: data.notice ?? "Indicative rates only; not for settlement.",
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve exchange rates right now." }, { status: 503 });
  }
}
