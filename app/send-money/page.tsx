"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { DESTINATION_BANKS } from "../../lib/banks/destination-banks";

const destinations = [
  { country: "India", currency: "INR" },
  { country: "Pakistan", currency: "PKR" },
  { country: "Nepal", currency: "NPR" },
  { country: "Bangladesh", currency: "BDT" },
  { country: "Egypt", currency: "EGP" },
  { country: "Philippines", currency: "PHP" },
  { country: "Sri Lanka", currency: "LKR" },
];

type SavedBeneficiary = { id:string; destination_country:string; recipient_full_name:string; payout_method:string; bank_name:string|null; account_name:string|null; account_number:string|null; ifsc:string|null; bank_branch:string|null; bank_city:string|null; bank_branch_code?:string|null; upi_id:string|null };
type BranchOption={id:string;bank_name:string;city:string|null;district:string|null;branch_name:string;branch_code:string|null;ifsc:string|null};

type RatesResponse = {
  rates?: Record<string, number>;
  customer_rates?: Record<string, number>;
  source?: string;
  timestamp?: number | null;
  data_updated_at?: number | string | null;
  error?: string;
};

export default function SendMoneyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
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
  const [bankBranchCode,setBankBranchCode]=useState("");
  const [branchOptions,setBranchOptions]=useState<BranchOption[]>([]);
  const [branchSearch,setBranchSearch]=useState("");
  const [branchDirectoryMessage,setBranchDirectoryMessage]=useState("");
  const [upiId, setUpiId] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [payout, setPayout] = useState("Bank transfer");
  const [funding, setFunding] = useState("Bank CDM deposit");
  const [note, setNote] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [customerRates, setCustomerRates] = useState<Record<string, number>>({});
  const [rateSource, setRateSource] = useState("");
  const [rateUpdatedAt, setRateUpdatedAt] = useState<number | null>(null);
  const [rateError, setRateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const destination = destinations.find((item) => item.country === country) ?? destinations[0];
  const payoutOptionsByCountry: Record<string, string[]> = {
    India: ["Bank transfer", "UPI transfer", "Wallet: Paytm Wallet", "Cash pickup"],
    Pakistan: ["Bank transfer", "Wallet: Easypaisa", "Wallet: JazzCash", "Cash pickup"],
    Nepal: ["Bank transfer", "Wallet: eSewa", "Wallet: Khalti", "Cash pickup"],
    Bangladesh: ["Bank transfer", "Wallet: bKash", "Wallet: Nagad", "Wallet: Rocket", "Cash pickup"],
    Egypt: ["Bank transfer", "Wallet: Vodafone Cash", "Wallet: Orange Cash", "Wallet: Etisalat Cash", "Cash pickup"],
    Philippines: ["Bank transfer", "Wallet: GCash", "Wallet: Maya", "Cash pickup"],
    "Sri Lanka": ["Bank transfer", "Wallet: eZ Cash", "Wallet: mCash", "Cash pickup"],
  };
  const payoutOptions = payoutOptionsByCountry[country] ?? ["Bank transfer", "Cash pickup"];
  const selectedPayout = payoutOptions.includes(payout) ? payout : payoutOptions[0];
  const isWalletPayout = selectedPayout.startsWith("Wallet:");
  const numericAmount = Number(amount);
  const referenceRate = rates[destination.currency];
  const customerRate = customerRates[destination.currency] ?? referenceRate;
  const estimatedPayout =
    Number.isFinite(numericAmount) && numericAmount > 0 && referenceRate
      ? numericAmount * customerRate
      : null;

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) router.replace("/login");
      else {
        setUserId(data.user.id);
        const savedPhone = String(data.user.user_metadata?.phone ?? data.user.user_metadata?.mobile ?? data.user.phone ?? "");
        const digits = savedPhone.replace(/\D/g, "");
        const local = digits.startsWith("971") ? digits.slice(3) : digits;
        if (local.length === 9) setCustomerMobile(local);
      }
    }
    void checkSession();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function loadBeneficiaries() {
      const { data, error } = await supabase.from("beneficiaries").select("id,destination_country,recipient_full_name,payout_method,bank_name,account_name,account_number,ifsc,bank_branch,bank_city,bank_branch_code,upi_id").eq("customer_id", userId).order("created_at", { ascending: false });
      if (active && !error) setBeneficiaries((data ?? []) as SavedBeneficiary[]);
    }
    void loadBeneficiaries();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    async function loadBranches() {
      setBranchOptions([]);
      setBranchDirectoryMessage("");
      if (!bankName.trim() || !["India", "Nepal", "Pakistan"].includes(country)) return;
      const { data, error } = await supabase.from("bank_branches")
        .select("id,bank_name,city,district,branch_name,branch_code,ifsc")
        .eq("country", country).eq("bank_name", bankName.trim())
        .eq("is_active", true).order("city", { ascending: true }).limit(500);
      if (!active) return;
      if (error) {
        setBranchDirectoryMessage("Branch directory is not available yet. Please enter branch and city manually.");
        return;
      }
      setBranchOptions((data ?? []) as BranchOption[]);
      if (!data?.length) setBranchDirectoryMessage("No imported branch records for this bank yet. Please enter branch and city manually.");
    }
    void loadBranches();
    return () => { active = false; };
  }, [country, bankName]);

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
        setCustomerRates(data.customer_rates ?? data.rates);
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
    if (!/^5\d{8}$/.test(customerMobile)) {
      setError("Enter exactly 9 UAE mobile digits, starting with 5. The +971 prefix is added automatically.");
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
    if (isWalletPayout && !walletNumber.trim()) {
      setError("Enter the recipient's mobile wallet number.");
      return;
    }
    if (selectedPayout !== "Cash pickup" && selectedPayout !== "UPI transfer" && !isWalletPayout) {
      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim() || !bankBranch.trim() || !bankCity.trim()) {
        setError("Enter the recipient bank name, account holder name, account number, branch and city.");
        return;
      }
      if (country === "India" && !ifsc.trim()) {
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
          customer_mobile: "+971" + customerMobile,
          recipient_bank_name: bankName.trim() || null,
          recipient_bank_account_name: accountName.trim() || null,
          recipient_bank_account_number: accountNumber.trim() || null,
          recipient_bank_ifsc: ifsc.trim() || null,
          recipient_bank_branch: bankBranch.trim() || null,
          recipient_bank_city: bankCity.trim() || null,
          recipient_bank_branch_code: bankBranchCode.trim() || null,
          recipient_upi_id: upiId.trim() || null,
          recipient_wallet_number: walletNumber.trim() || null,
          payout_method: selectedPayout,
          funding_method: funding,
          reference_rate: referenceRate ?? null,
          customer_rate: customerRate ?? null,
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
      setWalletNumber("");
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
          Need help? <a href="/support">Contact our support team</a> or use the <a href="https://wa.me/971541797541?text=Hello%20DirhamLink%20Support%2C%20I%20need%20assistance." target="_blank" rel="noreferrer">Chat With Us</a> option. Include your transaction reference when asking about a transfer.
        </div>
        <div className="account-notice">
          Transaction records are available online. Creating a record does not lock an exchange rate, confirm receipt of funds, approve compliance, or send money. The 5-hour period is an estimated service target, not a guarantee. If the transfer is not credited to the recipient’s bank account within the stated timeframe, contact our support team with your transaction reference. Wait for verified instructions from DirhamLink before depositing cash.
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Destination country
            <select
              value={country}
              onChange={(event) => {
                const nextCountry = event.target.value;
                setCountry(nextCountry);
                setPayout("Bank transfer");
                setWalletNumber("");
                setUpiId("");
                setBankName("");
                setAccountName("");
                setAccountNumber("");
                setIfsc("");
                setBankBranch("");
                setBankCity("");
                setBankBranchCode("");
                setBranchSearch("");
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
            <small>Indicative DirhamLink customer estimate</small>
            <strong>
              {estimatedPayout !== null
                ? estimatedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + destination.currency
                : "Rate unavailable"}
            </strong>
            <small>
              {referenceRate
                ? "Market: 1 AED = " + referenceRate + " " + destination.currency + (destination.currency === "INR" ? " · DirhamLink: 1 AED = " + customerRate + " INR" : "")
                : rateError || "Waiting for the rate provider."}
            </small>
            <small>India rate includes INR 1 extra per AED over the market reference where applicable. Indicative only; final rate and fees require staff confirmation.</small>
            {rateUpdatedAt !== null && (
              <small>
                Provider: {rateSource || "Market reference"} · Updated: {new Date(rateUpdatedAt * 1000).toLocaleString()}
              </small>
            )}
          </div>

          <label>
            Your UAE mobile number
            <div className="mobile-input-row"><span className="mobile-prefix">+971</span><input
              type="tel"
              inputMode="numeric"
              value={customerMobile}
              onChange={(event) => setCustomerMobile(event.target.value.replace(/\D/g, "").slice(0, 9))}
              autoComplete="tel-national"
              maxLength={9}
              minLength={9}
              pattern="5[0-9]{8}"
              placeholder="5XXXXXXXX"
              required
            /></div>
            <small>Enter 9 digits only, starting with 5. +971 is added automatically.</small>
          </label>

          {beneficiaries.length > 0 && <label>
            Use a saved beneficiary (optional)
            <select value={selectedBeneficiaryId} onChange={(event) => {
              const id = event.target.value;
              setSelectedBeneficiaryId(id);
              const saved = beneficiaries.find((item) => item.id === id);
              if (saved) {
                setCountry(saved.destination_country);
                setRecipient(saved.recipient_full_name);
                setPayout(saved.payout_method);
                setBankName(saved.bank_name ?? "");
                setAccountName(saved.account_name ?? "");
                setAccountNumber(saved.account_number ?? "");
                setIfsc(saved.ifsc ?? "");
                setBankBranch(saved.bank_branch ?? "");
                setBankCity(saved.bank_city ?? "");
                setBankBranchCode(saved.bank_branch_code ?? "");
                setBranchSearch(saved.bank_branch ?? "");
                setUpiId(saved.upi_id ?? "");
              }
            }}>
              <option value="">Enter a new recipient</option>
              {beneficiaries.map((item) => <option key={item.id} value={item.id}>{item.recipient_full_name} — {item.destination_country}</option>)}
            </select>
          </label>}
          <p className="auth-disclaimer"><Link href="/beneficiaries">Manage saved beneficiaries</Link></p>

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
            Payout option
            <select value={selectedPayout} onChange={(event) => setPayout(event.target.value)}>
              {payoutOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <p className="auth-disclaimer">Receiving currency: <strong>{destination.currency}</strong>. These are payout preferences for your request only. Availability, provider support, recipient eligibility, fees and final currency are subject to confirmation by DirhamLink staff. Selecting an option does not mean a payout partner is connected or that payment is guaranteed.</p>

          {isWalletPayout ? (
            <label>
              {selectedPayout.replace("Wallet: ", "")} mobile number
              <input value={walletNumber} onChange={(event) => setWalletNumber(event.target.value)} maxLength={40} autoComplete="off" placeholder="Enter wallet-registered mobile number" required />
            </label>
          ) : selectedPayout === "Bank transfer" || selectedPayout === "Bank account" ? (
            <>
              <label>
                Search or enter recipient bank name
                <input
                  value={bankName}
                  onChange={(event) => {
                    setBankName(event.target.value);
                    setBankBranch("");
                    setBankBranchCode("");
                    setIfsc("");
                  }}
                  maxLength={120}
                  placeholder="Search or type bank name manually"
                  list="transfer-bank-options"
                  required
                />
                <datalist id="transfer-bank-options">{(DESTINATION_BANKS[country] ?? []).map((item) => <option key={item} value={item} />)}</datalist>
                <small>{country === "India"
                  ? "If your Indian bank is not shown in the suggestions, type its full bank name manually. Enter the IFSC and branch details below."
                  : "If your bank is not listed, type its full name manually and enter the branch details below."}</small>
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
                IFSC (India) / local routing code (if required)
                <input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} maxLength={20} autoComplete="off" placeholder={country === "India" ? "Enter 11-character IFSC" : "Enter local routing code if applicable"} required={country === "India"} />
              </label>
              <label>
                Search branch name or area
                <input value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} maxLength={120} placeholder="Type branch, city or area" />
              </label>
              {branchOptions.length > 0 && <label>
                Select branch
                <select value={bankBranchCode + "|" + bankBranch} onChange={(event) => {
                  const item = branchOptions.find((x) => (x.branch_code ?? "") + "|" + x.branch_name === event.target.value);
                  if (item) {
                    setBankBranch(item.branch_name);
                    setBranchSearch(item.branch_name);
                    setBankCity(item.city ?? item.district ?? "");
                    setBankBranchCode(item.branch_code ?? "");
                    if (item.ifsc) setIfsc(item.ifsc);
                  }
                }}>
                  <option value="">Choose a listed branch</option>
                  {branchOptions.filter((item) => (item.branch_name + " " + (item.city ?? "") + " " + (item.district ?? "")).toLowerCase().includes(branchSearch.toLowerCase())).map((item) => <option key={item.id} value={(item.branch_code ?? "") + "|" + item.branch_name}>{item.branch_name} — {item.city ?? item.district ?? "Location unavailable"}{item.branch_code ? " · " + item.branch_code : ""}</option>)}
                </select>
              </label>}
              {branchDirectoryMessage && <p className="auth-disclaimer">{branchDirectoryMessage}</p>}
              <label>
                Branch code
                <input value={bankBranchCode} onChange={(event) => setBankBranchCode(event.target.value)} maxLength={40} placeholder="Automatically filled when listed" />
              </label>
              <label>
                Bank branch city
                <input value={bankCity} onChange={(event) => setBankCity(event.target.value)} maxLength={100} placeholder="Enter city" required />
              </label>
              {(country === "Nepal" || country === "Pakistan") && <p className="auth-disclaimer">Search and select your bank name from the suggestions. Enter the branch and city exactly as shown by your bank. Bank account and branch details are not independently verified.</p>}
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
          Do not deposit money until DirhamLink has verified your transaction and issued approved instructions. Uploading a receipt alone is not proof that funds have been received. Payout is not yet automated. If the recipient’s bank account has not been credited within the stated timeframe, contact our support team through the Support page or Chat With Us with your transaction reference.
        </p>
        <Link className="auth-home" href="/account">← Back to dashboard</Link>
      </section>
    </main>
  );
}
