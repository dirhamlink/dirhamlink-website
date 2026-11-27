"use client";

import { useEffect, useMemo, useState } from "react";

const currencies = [
  { code: "INR", country: "India" },
  { code: "PKR", country: "Pakistan" },
  { code: "NPR", country: "Nepal" },
  { code: "BDT", country: "Bangladesh" },
  { code: "EGP", country: "Egypt" },
  { code: "PHP", country: "Philippines" },
];

export default function CurrencyCalculator() {
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("INR");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("Loading market rates…");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/rates", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Rates unavailable");
        if (active) {
          setRates(data.rates || {});
          setStatus(data.delayed_minutes ? `Market data delayed by ${data.delayed_minutes} minutes` : "Live market reference");
        }
      } catch {
        if (active) setStatus("Market rates temporarily unavailable");
      }
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const selected = currencies.find((item) => item.code === currency) ?? currencies[0];
  const rate = rates[currency];
  const estimate = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 && rate ? value * rate : 0;
  }, [amount, rate]);

  return (
    <div className="calc-box">
      <label className="field-label" htmlFor="aed-amount">You send (AED)</label>
      <div className="calc-row">
        <input id="aed-amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <select aria-label="Destination currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {currencies.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.country}</option>)}
        </select>
      </div>
      <div className="calc-result">
        <small>Estimated amount at market reference · {selected.code}</small>
        <strong>{rate ? estimate.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " " + selected.code : "Rate unavailable"}</strong>
      </div>
      <p className="disclaimer">{status}. This is an indicative market reference, not DirhamLink's approved customer selling quote. Final customer rate, fees and transfer eligibility must be confirmed separately.</p>
    </div>
  );
}
