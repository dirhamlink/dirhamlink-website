"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const countries = ["India", "Pakistan", "Nepal", "Bangladesh", "Egypt", "Philippines", "Sri Lanka"];

export default function SendMoneyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("India");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [payout, setPayout] = useState("Bank account");
  const [funding, setFunding] = useState("Bank CDM deposit");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) router.replace("/login");
      else setUserId(data.user.id);
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!userId) return setError("Please log in again and try once more.");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 100000) {
      return setError("Enter an amount between AED 1 and AED 100,000.");
    }
    setLoading(true);
    const { data, error: insertError } = await supabase.from("transfer_requests").insert({
      customer_id: userId,
      destination_country: country,
      send_amount_aed: numericAmount,
      recipient_full_name: recipient.trim(),
      payout_method: payout,
      funding_method: funding,
      customer_note: note.trim() || null,
    }).select("id").single();
    setLoading(false);
    if (insertError) {
      setError(insertError.message.includes("transfer_requests")
        ? "The request form is ready, but the database setup is not finished yet. Please contact DirhamLink support."
        : insertError.message);
      return;
    }
    setSuccess("Your inquiry has been submitted. Reference: " + data.id + ". Our team will contact you. This is not a confirmed transfer or payment instruction.");
    setAmount("");
    setRecipient("");
    setNote("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/account"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer service</p>
        <h1>Send money inquiry</h1>
        <p className="auth-intro">Tell us what you need. Our team will review your request and contact you with the next steps.</p>
        <div className="account-notice">This form submits an inquiry only. It does not book an exchange rate, accept cash, or initiate a money transfer. Please wait for verified instructions from DirhamLink staff.</div>
        <form className="auth-form" onSubmit={submit}>
          <label>Destination country
            <select value={country} onChange={e => setCountry(e.target.value)}>{countries.map(c => <option key={c}>{c}</option>)}</select>
          </label>
          <label>Amount you want to send (AED)
            <input type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000" required />
          </label>
          <label>Recipient full name
            <input value={recipient} onChange={e => setRecipient(e.target.value)} minLength={2} maxLength={120} autoComplete="name" placeholder="Name of the person receiving money" required />
          </label>
          <label>How should the recipient receive the money?
            <select value={payout} onChange={e => setPayout(e.target.value)}><option>Bank account</option><option>Cash pickup</option></select>
          </label>
          <label>How do you expect to fund the transfer?
            <select value={funding} onChange={e => setFunding(e.target.value)}><option>Bank CDM deposit</option><option>Office cash deposit</option><option>Cash pickup arrangement</option></select>
          </label>
          <label>Additional note (optional)
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Anything our team should know?" />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Submitting…" : "Submit inquiry"}</button>
        </form>
        <p className="auth-disclaimer">Do not deposit money until our staff has contacted you and confirmed the approved process for your request. Uploading a receipt will not by itself confirm that funds have been received.</p>
        <Link className="auth-home" href="/account">← Back to dashboard</Link>
      </section>
    </main>
  );
}
