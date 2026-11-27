"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type Transfer = {
  id: string;
  transaction_reference: string;
  destination_country: string;
  destination_currency: string;
  send_amount_aed: number;
  recipient_full_name: string;
  status: string;
  created_at: string;
  customer_mobile: string | null;
};

const supportEmail = "deepdxb2004@gmail.com";
const whatsappNumber = "971541797541";
const issueTypes = [
  "Transfer",
  "Bank details incorrect",
  "Incorrect amount transferred",
  "Beneficiary correction",
  "Related to an inquiry",
  "Cash deposit / payment verification",
  "Payout delay or missing payout",
  "Other issue",
];

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState("");
  const [issue, setIssue] = useState(issueTypes[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !auth.user) {
        router.replace("/login?next=/support");
        return;
      }
      const user = auth.user;
      setName(String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""));
      setEmail(user.email ?? "");
      const accountMobile = String(user.user_metadata?.phone ?? user.user_metadata?.mobile ?? user.phone ?? "");
      setMobile(accountMobile);
      const { data, error: transferError } = await supabase
        .from("transfers")
        .select("id,transaction_reference,destination_country,destination_currency,send_amount_aed,recipient_full_name,status,created_at,customer_mobile")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (!transferError && data) {
        const rows = data as Transfer[];
        setTransfers(rows);
        const requested = searchParams.get("transfer");
        const initial = rows.find(row => row.id === requested) ?? rows[0];
        if (initial) {
          setSelectedTransfer(initial.id);
          if (!accountMobile && initial.customer_mobile) setMobile(initial.customer_mobile);
        }
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router, searchParams]);

  const chosenTransfer = useMemo(
    () => transfers.find(row => row.id === selectedTransfer),
    [transfers, selectedTransfer]
  );

  const message = useMemo(() => [
    "Hello DirhamLink Support Team,",
    "",
    "I need assistance with the following issue:",
    "Issue category: " + issue,
    "",
    "Customer account details:",
    "Name: " + (name || "Not available in account profile"),
    "Mobile: " + (mobile || "Not available in account profile or transfer record"),
    "Email: " + (email || "Not available"),
    "",
    "Transfer details:",
    chosenTransfer
      ? [
          "Transaction reference: " + chosenTransfer.transaction_reference,
          "Destination: " + chosenTransfer.destination_country + " (" + chosenTransfer.destination_currency + ")",
          "Send amount: AED " + Number(chosenTransfer.send_amount_aed).toFixed(2),
          "Recipient: " + chosenTransfer.recipient_full_name,
          "Current status: " + chosenTransfer.status,
          "Created: " + new Date(chosenTransfer.created_at).toLocaleString(),
        ].join("\n")
      : "No transfer selected / inquiry only",
    "",
    "Customer's explanation:",
    details.trim() || "Please contact me to discuss this issue.",
    "",
    "Please review the details, contact me using the account information above, and advise on the appropriate resolution. Any transaction or beneficiary changes must be verified and approved by authorised DirhamLink staff.",
    "",
    "Thank you.",
  ].join("\n"), [issue, name, mobile, email, chosenTransfer, details]);

  function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = "DirhamLink Support - " + issue + (chosenTransfer ? " - " + chosenTransfer.transaction_reference : "");
    window.location.href = "mailto:" + supportEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
  }

  const chatMessage = "Hello DirhamLink Support Team, I need help.\nName: " + name + "\nMobile: " + mobile + "\nEmail: " + email + (chosenTransfer ? "\nTransfer: " + chosenTransfer.transaction_reference : "") + "\nIssue: " + issue;
  const chatUrl = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(chatMessage);

  if (loading) return <main className="auth-page"><section className="auth-card">Loading your support details…</section></main>;

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/account"><span className="brand-mark">↔</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer care</p>
        <h1>Contact Support</h1>
        <p className="auth-intro">Choose the issue you need help with. We will prepare a message using your account details and any transfer you select.</p>
        <div className="account-notice">
          <strong>Your account details</strong>
          <p>Name: {name || "Not available"}</p>
          <p>Mobile: {mobile || "Not available — add it to your profile or a transfer"}</p>
          <p>Email: {email || "Not available"}</p>
        </div>
        <form className="auth-form" onSubmit={sendEmail}>
          <label>What do you need help with?
            <select value={issue} onChange={event => setIssue(event.target.value)}>
              {issueTypes.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Related transfer (optional)
            <select value={selectedTransfer} onChange={event => setSelectedTransfer(event.target.value)}>
              <option value="">No transfer / general inquiry</option>
              {transfers.map(row => <option key={row.id} value={row.id}>{row.transaction_reference} · {row.destination_country} · AED {Number(row.send_amount_aed).toFixed(2)}</option>)}
            </select>
          </label>
          {chosenTransfer && <div className="account-notice">
            <strong>Selected transfer</strong>
            <p>{chosenTransfer.transaction_reference} · {chosenTransfer.destination_country} ({chosenTransfer.destination_currency})</p>
            <p>AED {Number(chosenTransfer.send_amount_aed).toFixed(2)} · {chosenTransfer.status}</p>
            <p>Recipient: {chosenTransfer.recipient_full_name}</p>
          </div>}
          <label>Tell us what happened
            <textarea value={details} onChange={event => setDetails(event.target.value)} rows={5} maxLength={2000} placeholder="Describe the problem and what help you need…" />
          </label>
          <div className="account-notice">
            <strong>What happens next?</strong>
            <p>Your email app will open with the support address, issue category, account details and selected transfer information already filled in. Review and press Send. Our team can then contact you. Any change to a transaction or beneficiary requires identity checks and authorised staff approval.</p>
          </div>
          <button className="btn btn-primary auth-submit" type="submit">Prepare Support Email</button>
          <a className="btn btn-outline auth-submit" href={chatUrl} target="_blank" rel="noreferrer">Chat With Us</a>
        </form>
        <p className="auth-disclaimer">If your email app does not open, email {supportEmail} and include your transaction reference.</p>
        <Link className="auth-home" href="/account">← Back to dashboard</Link>
      </section>
    </main>
  );
}
