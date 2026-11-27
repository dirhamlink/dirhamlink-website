"use client";

import { useEffect, useState } from "react";

const countries = [
  { name: "India", flag: "🇮🇳", code: "INR" },
  { name: "Pakistan", flag: "🇵🇰", code: "PKR" },
  { name: "Nepal", flag: "🇳🇵", code: "NPR" },
  { name: "Bangladesh", flag: "🇧🇩", code: "BDT" },
  { name: "Egypt", flag: "🇪🇬", code: "EGP" },
  { name: "Philippines", flag: "🇵🇭", code: "PHP" },
];

type RateData = {
  rates: Record<string, number>;
  customer_rates?: Record<string, number>;
  source: string;
  delayed_minutes: number;
  timestamp: string | null;
  data_updated_at: string | null;
};

export default function LiveRateBoard() {
  const [data, setData] = useState<RateData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/rates", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Rates unavailable");
        if (active) { setData(result); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Rates unavailable");
      }
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const updated = data?.data_updated_at
    ? new Date(data.data_updated_at).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })
    : null;

  return (
    <>
      <div className="rate-grid">
        {countries.map((country) => (
          <article className="rate-card" key={country.code}>
            <div className="country-top"><span className="flag">{country.flag}</span>{country.name}</div>
            <div className="currency">1 AED to {country.code}</div>
            <div className="rate-value">{data?.rates?.[country.code] ? data.rates[country.code].toFixed(4) : "—"}</div>
            <div className="rate-note">{error ? "Rate temporarily unavailable" : data ? "Market reference" : "Loading rate…"}</div>
            {country.code === "INR" && data?.customer_rates?.INR && <><div className="rate-value">{data.customer_rates.INR.toFixed(4)}</div><div className="rate-note">DirhamLink customer rate · +1 INR per AED</div></>}
          </article>
        ))}
      </div>
      <div className="rate-status" aria-live="polite">
        {error ? error : data ? `Provider: exchangerate.dev · ${data.delayed_minutes ? `${data.delayed_minutes} minutes delayed` : "Live feed"} · Updated: ${updated ?? "time unavailable"} · Auto-refreshes every minute` : "Connecting to exchange-rate provider…"}
      </div>
    </>
  );
}
