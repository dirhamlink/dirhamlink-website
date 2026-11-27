"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const destinations = [
  { country: "India", currency: "INR" },
  { country: "Pakistan", currency: "PKR" },
  { country: "Nepal", currency: "NPR" },
  { country: "Bangladesh", currency: "BDT" },
  { country: "Egypt", currency: "EGP" },
  { country: "Philippines", currency: "PHP" },
  { country: "Sri Lanka", currency: "LKR" },
];

type RatesResponse = {
  rates?: Record<string, number>;
  source?: string;
  timestamp?: number | null;
  data_updated_at?: number | string | null;
  delayed_minutes?: number;
  error?: string;
};

export default function SendMoneyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("India");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [payout, setPayout] = useState("Bank transfer");
  const [funding, setFunding] = useState("Bank CDM deposit");
  const [note, setNote] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateSource, setRateSource] = useState("");
  const [rateUpdatedAt, setRateUpdatedAt] = useState<number | null>(null);
  const [rateError, setRateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const destination = destinations.find(item => item.country === country) ?? destinations[0];
  const payoutOptions = country === "India"
    ? ["Bank transfer", "UPI transfer", "Cash pickup"]
    : ["Bank account", "Cash pickup"];
  const numericAmount = Number(amount);
  const referenceRate = rates[destination.currency];
  const estimatedPayout = Number.isFinite(numericAmount) && numericAmount > 0 && referenceRate
    ? numericAmount * referenceRate
    : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) router.replace("/login");
      else setUserId(data.user.id);
    });
  }, [router]);

  useEffect(() => {
    let active = true;
    async function loadRates() {
      try {
        const response = await fetch("/api/rates", { cache: "no-store" });
        const data = await response.json() as RatesResponse;
        if (!response.ok || !data.rates) throw new Error(data.error || "Rates are temporarily unavailable.");
        if (active) {
          setRates(data.rates);
          setRateSource(data.source || "Market reference provider");
          const rawUpdatedAt = data.data_updated_at ?? data.timestamp ?? null;
          const parsedUpdatedAt = typeof rawUpdatedAt === "number"
            ? rawUpdatedAt
            : rawUpdatedAt ? Date.parse(rawUpdatedAt) / 1000 : null;
          setRateUpdatedAt(parsedUpdatedAt && Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : null);
          setRateError("");
        }
      } catch (err) {
        if (active) setRateError(err instanceof Error ? err.message : "Rates are temporarily unavailable.");
      }
    }
    loadRates();
    const timer = window.setInterval(loadRates, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!userId) return setError("Please log in again and try once more.");
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 100000) {
      return setError("Enter an amount between AED 1 and AED 100,000.");
    }
    setLoading(true);
    const { data, error: insertError } = await supabase.from("transfers").insert({
      customer_id: userId,
      destination_country: country,
      destination_currency: destination.currency,
      send_amount_aed: numericAmount,
      recipient_full_name: recipient.trim(),
      payout_method: payout,
      funding_method: funding,
      reference_rate: referenceRate ?? null,
      rate_source: referenceRate ? rateSource : null,
      rate_captured_at: referenceRate ? new Date().toISOString() : null,
      customer_note: note.trim() || null,
    }).select("id, transaction_reference, status").single();
    setLoading(false);
    if (insertError) {
      setError(insertError.message.includes("transfers")
        ? "Transaction setup is not finished. Please ask the administrator to run the latest Supabase migration."
        : insertError.message);
      return;
    }
    setSuccess("Your transaction record has been created. Reference: " + data.transaction_reference + ". Status: Created. DirhamLink staff must review it and confirm the final customer rate and authorised funding instructions before any payment is made.");
    setAmount("");
    setRecipient("");
    setNote("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/account"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer transfers</p>
        <h1>Start a transfer</h1>
        <p className="auth-intro">Create and track your transfer on DirhamLink. Your transaction receives a unique reference as soon as it is created.</p>
        <div className="account-notice">Transaction creation is live. This does not itself lock an exchange rate, confirm receipt of funds, approve compliance, or send money. Wait for verified instructions from DirhamLink before depositing cash.</div>
        <form className="auth-form" onSubmit={submit}>
          <label>Destination country
            <select value={country} onChange={e => setCountry(e.target.value)}>{destinations.map(item => <option key={item.country} value={item.country}>{item.country} ({item.currency})</option>)}</select>
          </label>
          <label>Amount to send (AED)
            <input type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" required />
          </label>
          <div className="calc-result">
            <small>Indicative market reference estimate</small>
            <strong>{estimatedPayout !== null ? estimatedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + destination.currency : "Rate unavailable"}</strong>
            <small>{referenceRate ? "1 AED = " + referenceRate + " " + destination.currency : rateError || "Waiting for the rate provider."}</small>
            <small>Not a confirmed DirhamLink selling rate. Final rate and fees require staff confirmation.</small>
            {rateUpdatedAt && <small>Provider: {rateSource || "Market reference"} · Updated: {new Date(rateUpdatedAt * 1000).toLocaleString()}</small>}
          </div>
          <label>Recipient full name
            <input value={recipient} onChange={e => setRecipient(e.target.value)} minLength={2} maxLength={120} autoComplete="name" placeholder="Name of the person receiving money" required />
          </label>
          <label>How should the recipient receive the money?
            <select value={payoutOptions.includes(payout) ? payout : payoutOptions[0]} onChange={e => setPayout(e.target.value)}>{payoutOptions.map(option => <option key={option}>{option}</option>)}</select>
          </label>
          <label>Planned funding method
            <select value={funding} onChange={e => setFunding(e.target.value)}><option>Bank CDM deposit</option><option>Office cash deposit</option><option>Cash pickup arrangement</option></select>
          </label>
          <label>Additional note (optional)
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Anything our team should know?" />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Creating transaction…" : "Create transaction"}</button>
        </form>
        <p className="auth-disclaimer">Do not deposit money until DirhamLink staff have verified your transaction and issued approved instructions. Uploading a receipt alone is not proof that funds have been received. Payout is not yet automated.</p>
        <Link className="auth-home" href="/account">← Back to dashboard</Link>
      </section>
    </main>
  );
}
