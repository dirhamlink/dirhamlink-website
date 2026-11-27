"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  error?: string;
};

export default function SendMoneyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("India");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankCity, setBankCity] = useState("");
  const [upiId, setUpiId] = useState("");
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

  const destination = destinations.find((item) => item.country === country) ?? destinations[0];
  const payoutOptions = useMemo(
    () => country === "India"
      ? ["Bank transfer", "UPI transfer", "Cash pickup"]
      : ["Bank account", "Cash pickup"],
    [country]
  );
  const selectedPayout = payoutOptions.includes(payout) ? payout : payoutOptions[0];
  const numericAmount = Number(amount);
  const referenceRate = rates[destination.currency];
  const estimatedPayout =
    Number.isFinite(numericAmount) && numericAmount > 0 && referenceRate
      ? numericAmount * referenceRate
      : null;

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) router.replace("/login");
      else setUserId(data.user.id);
    }
    void checkSession();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;
    async function loadRates() {
      try {
        const response = await fetch("/api/rates", { cache: "no-store" });
        const data = await response.json() as RatesResponse;
        if (!response.ok || !data.rates) {
          throw new Error(data.error || "Rates are temporarily unavailable.");
        }
        if (!active) return;
        setRates(data.rates);
        setRateSource(data.source || "Market reference provider");
        const rawUpdatedAt = data.data_updated_at ?? data.timestamp ?? null;
        const parsedUpdatedAt = typeof rawUpdatedAt === "number"
          ? rawUpdatedAt
          : rawUpdatedAt ? Date.parse(rawUpdatedAt) / 1000 : null;
        setRateUpdatedAt(
          parsedUpdatedAt !== null && Number.isFinite(parsedUpdatedAt)
            ? parsedUpdatedAt
            : null
        );
        setRateError("");
      } catch (err) {
        if (active) {
          setRateError(err instanceof Error ? err.message : "Rates are temporarily unavailable.");
        }
      }
    }
    void loadRates();
    const timer = window.setInterval(loadRates, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Your login session is not ready. Please log in again.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 100000) {
      setError("Enter an amount between AED 1 and AED 100,000.");
      return;
    }
    if (!customerMobile.trim() || customerMobile.replace(/[\s()+-]/g, "").length < 7) {
      setError("Enter a valid mobile number with country code so our team can contact you.");
      return;
    }
    if (recipient.trim().length < 2) {
      setError("Enter the recipient's full name.");
      return;
    }
    if (selectedPayout === "UPI transfer" && !upiId.trim()) {
      setError("Enter the recipient UPI ID.");
      return;
    }
    if (selectedPayout !== "Cash pickup" && selectedPayout !== "UPI transfer") {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim() || !bankBranch.trim() || !bankCity.trim()) {
        setError("Enter the recipient bank name, account holder name, account number, branch and city.");
        return;
      }
      if (!ifsc.trim()) {
        setError("Enter the recipient bank IFSC code.");
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from("transfers")
        .insert({
          customer_id: userId,
          destination_country: country,
          destination_currency: destination.currency,
          send_amount_aed: numericAmount,
          recipient_full_name: recipient.trim(),
          customer_mobile: customerMobile.trim(),
          recipient_bank_name: bankName.trim() || null,
          recipient_bank_account_name: accountName.trim() || null,
          recipient_bank_account_number: accountNumber.trim() || null,
          recipient_bank_ifsc: ifsc.trim() || null,
          recipient_bank_branch: bankBranch.trim() || null,
          recipient_bank_city: bankCity.trim() || null,
          recipient_upi_id: upiId.trim() || null,
          payout_method: selectedPayout,
          funding_method: funding,
          reference_rate: referenceRate ?? null,
          rate_source: referenceRate ? rateSource : null,
          rate_captured_at: referenceRate ? new Date().toISOString() : null,
          customer_note: note.trim() || null,
        })
        .select("id, transaction_reference, status")
        .single();

      if (insertError) {
        console.error("DirhamLink transfer insert failed:", insertError);
        setError("Transaction could not be created: " + insertError.message);
        return;
      }
      if (!data) {
        setError("The database did not return a transaction reference. Please try again.");
        return;
      }

      setSuccess(
        "Your transaction record has been created. Reference: " +
        data.transaction_reference +
        ". Status: " +
        data.status +
        ". DirhamLink staff must review it and confirm the final customer rate and authorised funding instructions before any payment is made."
      );
      setAmount("");
      setRecipient("");
      setCustomerMobile("");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setIfsc("");
      setBankBranch("");
      setBankCity("");
      setUpiId("");
      setNote("");
    } catch (err) {
      console.error("Unexpected DirhamLink transaction error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/account">
          <span className="brand-mark">D</span>DirhamLink
        </Link>
        <p className="eyebrow auth-eyebrow">Customer transfers</p>
        <h1>Start a transfer</h1>
        <p className="auth-intro">
          Create and track your transfer on DirhamLink. Your transaction receives a unique reference when it is saved.
        </p>
        <div className="account-notice">
          Transaction records are available online. Creating a record does not lock an exchange rate, confirm receipt of funds, approve compliance, or send money. Wait for verified instructions from DirhamLink before depositing cash.
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Destination country
            <select
              value={country}
              onChange={(event) => {
                const nextCountry = event.target.value;
                setCountry(nextCountry);
                setPayout(nextCountry === "India" ? "Bank transfer" : "Bank account");
              }}
            >
              {destinations.map((item) => (
                <option key={item.country} value={item.country}>
                  {item.country} ({item.currency})
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount to send (AED)
            <input
              type="number"
              inputMode="decimal"
              min="1"
              max="100000"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 1000"
              required
            />
          </label>

          <div className="calc-result">
            <small>Indicative market reference estimate</small>
            <strong>
              {estimatedPayout !== null
                ? estimatedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + destination.currency
                : "Rate unavailable"}
            </strong>
            <small>
              {referenceRate
                ? "1 AED = " + referenceRate + " " + destination.currency
                : rateError || "Waiting for the rate provider."}
            </small>
            <small>Not a confirmed DirhamLink selling rate. Final rate and fees require staff confirmation.</small>
            {rateUpdatedAt !== null && (
              <small>
                Provider: {rateSource || "Market reference"} · Updated: {new Date(rateUpdatedAt * 1000).toLocaleString()}
              </small>
            )}
          </div>

          <label>
            Your mobile number (with country code)
            <input
              type="tel"
              inputMode="tel"
              value={customerMobile}
              onChange={(event) => setCustomerMobile(event.target.value)}
              autoComplete="tel"
              maxLength={25}
              placeholder="e.g. +971 5X XXX XXXX"
              required
            />
          </label>

          <label>
            Recipient full name
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              minLength={2}
              maxLength={120}
              autoComplete="name"
              placeholder="Name of the person receiving money"
              required
            />
          </label>

          <label>
            How should the recipient receive the money?
            <select value={selectedPayout} onChange={(event) => setPayout(event.target.value)}>
              {payoutOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          {selectedPayout === "Bank transfer" || selectedPayout === "Bank account" ? (
            <>
              <label>
                Recipient bank name
                <input value={bankName} onChange={(event) => setBankName(event.target.value)} maxLength={120} placeholder="e.g. State Bank of India" required />
              </label>
              <label>
                Bank account holder name
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength={120} placeholder="Name exactly as shown by the bank" required />
              </label>
              <label>
                Recipient bank account number
                <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} maxLength={40} autoComplete="off" placeholder="Enter beneficiary account number" required />
              </label>
              <label>
                IFSC / bank routing code
                <input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} maxLength={20} autoComplete="off" placeholder="Enter IFSC or local routing code" required />
              </label>
              <label>
                Bank branch name
                <input value={bankBranch} onChange={(event) => setBankBranch(event.target.value)} maxLength={120} placeholder="Enter bank branch" required />
              </label>
              <label>
                Bank branch city
                <input value={bankCity} onChange={(event) => setBankCity(event.target.value)} maxLength={100} placeholder="Enter city" required />
              </label>
              <p className="auth-disclaimer">Please check beneficiary details carefully. They are confidential and visible to the customer and authorised DirhamLink team members.</p>
            </>
          ) : selectedPayout === "UPI transfer" ? (
            <label>
              Recipient UPI ID
              <input value={upiId} onChange={(event) => setUpiId(event.target.value)} maxLength={120} autoComplete="off" placeholder="name@bank" required />
            </label>
          ) : null}

          <label>
            Planned funding method
            <select value={funding} onChange={(event) => setFunding(event.target.value)}>
              <option>Bank CDM deposit</option>
              <option>Office cash deposit</option>
              <option>Cash pickup arrangement</option>
            </select>
          </label>

          <label>
            Additional note (optional)
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything our team should know?"
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading || !userId}>
            {loading ? "Creating transaction…" : !userId ? "Checking login…" : "Create transaction"}
          </button>
        </form>

        <p className="auth-disclaimer">
          Do not deposit money until DirhamLink staff have verified your transaction and issued approved instructions. Uploading a receipt alone is not proof that funds have been received. Payout is not yet automated.
        </p>
        <Link className="auth-home" href="/account">← Back to dashboard</Link>
      </section>
    </main>
  );
}
