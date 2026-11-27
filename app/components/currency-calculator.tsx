"use client";

import { useMemo, useState } from "react";

const currencies = [
  { code: "INR", country: "India", rate: 22.7 },
  { code: "PKR", country: "Pakistan", rate: 75.9 },
  { code: "NPR", country: "Nepal", rate: 36.2 },
  { code: "BDT", country: "Bangladesh", rate: 33.1 },
  { code: "EGP", country: "Egypt", rate: 13.25 },
  { code: "PHP", country: "Philippines", rate: 15.85 },
];

export default function CurrencyCalculator() {
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("INR");
  const selected = currencies.find((item) => item.code === currency) ?? currencies[0];
  const estimate = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) && value > 0 ? value * selected.rate : 0;
  }, [amount, selected.rate]);

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
        <small>Estimated recipient amount · {selected.code}</small>
        <strong>{estimate.toLocaleString("en-US", { maximumFractionDigits: 2 })} {selected.code}</strong>
      </div>
      <p className="disclaimer">Illustrative calculation using sample rates only. Not a live quote or confirmation of a transfer. Final rates, fees and eligibility are confirmed separately.</p>
    </div>
  );
}
