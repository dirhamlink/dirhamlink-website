"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type TeamTransfer = {
  id: string;
  transaction_reference: string;
  completion_reference: string | null;
  customer_id: string;
  customer_mobile: string | null;
  destination_country: string;
  destination_currency: string;
  send_amount_aed: number;
  recipient_full_name: string;
  payout_method: string;
  funding_method: string;
  reference_rate: number | null;
  rate_source: string | null;
  status: string;
  created_at: string;
  recipient_bank_name: string | null;
  recipient_bank_account_name: string | null;
  recipient_bank_account_number: string | null;
  recipient_bank_ifsc: string | null;
  recipient_bank_branch: string | null;
  recipient_bank_city: string | null;
  recipient_upi_id: string | null;
};

const statusNames: Record<string, string> = {
  created: "Created",
  under_review: "Under review",
  awaiting_customer_contact: "Awaiting customer contact",
  awaiting_verified_funds: "Awaiting verified funds",
  funds_received_pending_checks: "Funds received — checks pending",
  compliance_review: "Compliance review",
  approved_for_processing: "Approved for processing",
  processing_with_bank_or_partner: "Processing with bank / partner",
  payout_confirmed: "Payout confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function TeamPortalPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TeamTransfer[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        router.replace("/login?next=/team");
        return;
      }
      setEmail(auth.user.email ?? "");
      const { data: membership, error: memberError } = await supabase
        .from("team_members")
        .select("role, active")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!active) return;
      if (memberError || !membership?.active) {
        setError("This account is not authorised for the DirhamLink Team Portal. Ask the owner to grant team access.");
        setLoading(false);
        return;
      }
      const { data, error: rowsError } = await supabase
        .from("transfers")
        .select("id, transaction_reference, completion_reference, customer_id, destination_country, destination_currency, send_amount_aed, recipient_full_name, payout_method, funding_method, reference_rate, rate_source, status, created_at, recipient_bank_name, recipient_bank_account_name, recipient_bank_account_number, recipient_bank_ifsc, recipient_bank_branch, recipient_bank_city, recipient_upi_id, customer_mobile")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!active) return;
      if (rowsError) setError("Could not load transactions: " + rowsError.message);
      else setRows((data ?? []) as TeamTransfer[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    return !q || [
      row.transaction_reference, row.destination_country, row.recipient_full_name, row.status,
    ].some((value) => value?.toLowerCase().includes(q));
  });

  async function markCompleted(row: TeamTransfer) {
    setActionMessage("");
    const confirmationReference = window.prompt(
      `Only continue if the payout has actually been completed and independently verified. Enter the bank or payout confirmation reference for ${row.transaction_reference}:`
    );
    if (confirmationReference === null) return;
    if (confirmationReference.trim().length < 3) {
      setActionMessage("A valid payout confirmation reference is required. The transaction was not changed.");
      return;
    }
    const confirmed = window.confirm(`Confirm that payout for ${row.transaction_reference} has actually reached the recipient? This will mark the transaction as Payout confirmed.`);
    if (!confirmed) return;
    setUpdatingId(row.id);
    const { data: completionReference, error: updateError } = await supabase.rpc("mark_dirhamlink_transfer_completed", {
      p_transfer_id: row.id,
      p_confirmation_reference: confirmationReference.trim(),
    });
    if (updateError) {
      setActionMessage("Could not mark transaction completed: " + updateError.message);
    } else {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "payout_confirmed", completion_reference: completionReference as string } : item));
      setActionMessage(`${row.transaction_reference} completed. DirhamLink virtual completion reference: ${completionReference}.`);
    }
    setUpdatingId("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="auth-page team-page">
      <section className="auth-card dashboard-card team-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Restricted staff access</p>
        <h1>Team transaction portal</h1>
        <p className="auth-intro">Signed in as <strong>{email}</strong>. This portal is for authorised staff only.</p>
        {loading && <div className="account-notice">Loading secure team transactions…</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {!loading && !error && <>
          <div className="team-toolbar">
            <div><strong>{rows.length}</strong><small> recent transactions</small></div>
            <input aria-label="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, recipient or country" />
          </div>
          {filtered.length === 0 && <div className="account-notice">No matching transactions found.</div>}
          <div className="team-list">
            {filtered.map((row) => {
              const estimate = row.reference_rate ? Number(row.send_amount_aed) * Number(row.reference_rate) : null;
              return <article className="team-transaction" key={row.id}>
                <div className="team-transaction-head">
                  <div><strong>{row.transaction_reference}</strong><small>{new Date(row.created_at).toLocaleString()}</small></div>
                  <span className="team-status">{statusNames[row.status] || row.status}</span>
                </div>
                <div className="team-metrics">
                  {row.completion_reference && <div className="team-completion-reference"><small>DirhamLink virtual completion reference</small><strong>{row.completion_reference}</strong></div>}
                <div><small>Send amount</small><strong>AED {Number(row.send_amount_aed).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
                  <div><small>Destination</small><strong>{row.destination_country} ({row.destination_currency})</strong></div>
                  <div><small>Indicative estimate</small><strong>{estimate === null ? "Not available" : estimate.toLocaleString(undefined, {maximumFractionDigits:2}) + " " + row.destination_currency}</strong></div>
                </div>
                <div className="team-detail-grid">
                  <div><small>Recipient</small><strong>{row.recipient_full_name}</strong></div>
                  <div><small>Payout method</small><strong>{row.payout_method}</strong></div>
                  <div><small>Planned funding</small><strong>{row.funding_method}</strong></div>
                  <div><small>Reference rate</small><strong>{row.reference_rate ? "1 AED = " + row.reference_rate + " " + row.destination_currency : "Not captured"}</strong></div>
                  <div><small>Beneficiary bank</small><strong>{row.recipient_bank_name || "Not provided"}</strong></div>
                  <div><small>Account holder</small><strong>{row.recipient_bank_account_name || "Not provided"}</strong></div>
                  <div><small>Account number</small><strong>{row.recipient_bank_account_number || "Not provided"}</strong></div>
                  <div><small>IFSC / routing code</small><strong>{row.recipient_bank_ifsc || "Not provided"}</strong></div>
                  <div><small>UPI ID</small><strong>{row.recipient_upi_id || "Not provided"}</strong></div>
                  <div><small>Customer mobile</small><strong>{row.customer_mobile || "Not provided"}</strong></div>
                  <div><small>Bank branch</small><strong>{row.recipient_bank_branch || "Not provided"}</strong></div>
                  <div><small>Bank city</small><strong>{row.recipient_bank_city || "Not provided"}</strong></div>
                  <div><small>Customer ID</small><strong className="team-id">{row.customer_id}</strong></div>
                </div>
                <p className="team-warning">Reference rate is indicative only. Verify the actual incoming payment, complete compliance checks, and independently confirm that the recipient has received the payout before marking this transaction completed.</p>
                {row.status !== "payout_confirmed" && row.status !== "rejected" && row.status !== "cancelled" && <button className="btn btn-primary auth-submit" type="button" disabled={updatingId === row.id} onClick={() => void markCompleted(row)}>{updatingId === row.id ? "Updating…" : "Mark transaction completed"}</button>}
                {row.status === "payout_confirmed" && <p className="auth-success">Payout confirmed</p>}
              </article>;
            })}
          </div>
        </>}
        {actionMessage && <div className="account-notice" role="status">{actionMessage}</div>}
        <div className="account-notice">The completion button records a staff confirmation only. It does not send money or verify a bank transfer automatically. Use it only after the payout has actually been completed and independently verified. Each action requires a confirmation reference and is audit-logged.</div>
        <button className="btn btn-outline auth-submit" onClick={signOut}>Log out</button>
        <Link className="auth-home" href="/account">Customer account</Link>
      </section>
    </main>
  );
}
