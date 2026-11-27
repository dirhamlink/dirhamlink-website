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
  const [clockNow, setClockNow] = useState(Date.now());
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState("");

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

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    return !q || [
      row.transaction_reference, row.destination_country, row.recipient_full_name, row.status,
    ].some((value) => value?.toLowerCase().includes(q));
  });

  async function markCompleted(transfer: TeamTransfer) {
    if (transfer.status === "payout_confirmed" || completingId) return;
    const confirmed = window.confirm(
      `Only continue if AED ${Number(transfer.send_amount_aed).toFixed(2)} has actually been paid out and the recipient credit has been independently verified. Mark ${transfer.transaction_reference} as completed?`
    );
    if (!confirmed) return;
    setCompletionError("");
    setCompletingId(transfer.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("mark_dirhamlink_transfer_completed", {
        p_transfer_id: transfer.id,
      });
      if (rpcError) throw rpcError;
      setRows((current) => current.map((item) => item.id === transfer.id
        ? { ...item, status: "payout_confirmed", completion_reference: typeof data === "string" ? data : item.completion_reference }
        : item
      ));
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : "Could not update the transaction. Check the database migration and try again.");
    } finally {
      setCompletingId(null);
    }
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
          {completionError && <div className="auth-error" role="alert">{completionError}</div>}
          <div className="account-notice"><Link href="/team/deposits">Open cash deposit review queue →</Link></div>
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
                <p className="team-warning">Reference rate is indicative only. The 5-hour countdown is a target from submission, not proof that funds have been received or paid out.</p>
                {row.status !== "payout_confirmed" && row.status !== "rejected" && row.status !== "cancelled" && <div className="account-notice"><strong>5-hour target: </strong>{Math.max(0, 5 * 60 * 60 * 1000 - (clockNow - new Date(row.created_at).getTime())) > 0 ? (() => { const ms = Math.max(0, 5 * 60 * 60 * 1000 - (clockNow - new Date(row.created_at).getTime())); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return `${h}h ${m}m ${s}s remaining`; })() : "Target window elapsed — follow up with the payout partner."}</div>}

                {row.status === "payout_confirmed" ? (
                  <p className="auth-success">Payout confirmed — marked by authorised team staff.</p>
                ) : row.status !== "rejected" && row.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="btn btn-primary auth-submit"
                    onClick={() => void markCompleted(row)}
                    disabled={completingId !== null}
                    aria-label={`Mark ${row.transaction_reference} as completed`}
                  >
                    {completingId === row.id ? "Updating transaction…" : "Mark transaction completed"}
                  </button>
                ) : null}
              </article>;
            })}
          </div>
        </>}
        <div className="account-notice">The countdown is an estimated service target only. Transfers must still pass funding, compliance and payout checks. A transaction is marked payout-confirmed only after an authorised payout system supplies verified confirmation.</div>
        <button className="btn btn-outline auth-submit" onClick={signOut}>Log out</button>
        <Link className="auth-home" href="/account">Customer account</Link>
      </section>
    </main>
  );
}
