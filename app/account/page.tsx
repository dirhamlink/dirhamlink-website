"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type Transfer = {
  id: string;
  transaction_reference: string;
  destination_country: string;
  send_amount_aed: number;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  created: "Created",
  under_review: "Under review",
  awaiting_customer_contact: "Awaiting customer contact",
  awaiting_verified_funds: "Awaiting verified funds",
  funds_received_pending_checks: "Funds received — checks pending",
  compliance_review: "Compliance review",
  approved_for_processing: "Approved for processing",
  processing_with_bank_or_partner: "Processing",
  payout_confirmed: "Payout confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferError, setTransferError] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? "");
      const { data: rows, error: rowsError } = await supabase
        .from("transfers")
        .select("id, transaction_reference, destination_country, send_amount_aed, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!active) return;
      if (rowsError) setTransferError("Run the latest database migration to enable transaction tracking.");
      else setTransfers((rows ?? []) as Transfer[]);
      setLoading(false);
    }
    loadAccount();
    return () => { active = false; };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) return <main className="auth-page"><section className="auth-card">Loading your account…</section></main>;

  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer dashboard</p>
        <h1>Welcome to DirhamLink</h1>
        <p className="auth-intro">You are signed in as <strong>{email}</strong>.</p>

        <div className="dashboard-section-title">Your services</div>
        <div className="dashboard-grid">
          <Link className="dashboard-tile" href="/#calculator">
            <span className="dashboard-icon">↗</span>
            <strong>Exchange rates</strong>
            <small>View indicative market reference rates</small>
            <span className="dashboard-action">View rates</span>
          </Link>
          <Link className="dashboard-tile" href="/send-money">
            <span className="dashboard-icon">＋</span>
            <strong>Start a transfer</strong>
            <small>Create a transaction and receive a reference</small>
            <span className="dashboard-action">Start now</span>
          </Link>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">▤</span>
            <strong>Beneficiaries</strong>
            <small>Saved recipients will be added in the next stage</small>
            <span className="dashboard-coming">In development</span>
          </div>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">▣</span>
            <strong>Cash deposits</strong>
            <small>Deposit verification workflow is being built</small>
            <span className="dashboard-coming">In development</span>
          </div>
        </div>

        <div className="dashboard-section-title">Your transactions</div>
        {transferError && <div className="account-notice">{transferError}</div>}
        {!transferError && transfers.length === 0 && (
          <div className="account-notice">You have no transactions yet. Select “Start a transfer” to create your first transaction.</div>
        )}
        {transfers.map(transfer => (
          <div className="dashboard-tile" key={transfer.id} style={{ marginBottom: 10 }}>
            <strong>{transfer.transaction_reference}</strong>
            <small>{transfer.destination_country} · AED {Number(transfer.send_amount_aed).toFixed(2)} · {new Date(transfer.created_at).toLocaleString()}</small>
            <span className="dashboard-action">{statusLabels[transfer.status] || transfer.status}</span>
            {transfer.status !== "payout_confirmed" && transfer.status !== "rejected" && transfer.status !== "cancelled" && (() => { const ms = Math.max(0, 5 * 60 * 60 * 1000 - (clockNow - new Date(transfer.created_at).getTime())); if (ms <= 0) return <small>5-hour target window elapsed. Please contact DirhamLink for an update.</small>; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return <small>Estimated completion target: {h}h {m}m {s}s remaining (within 5 hours of submission).</small>; })()}
          </div>
        ))}
        <div className="account-notice">
          The 5-hour countdown is an estimated service target from submission, not a guarantee or proof of payout. Cash receipt, compliance approval and payout confirmation still require verified, authorised operational processes. No deposit should be made until DirhamLink issues approved instructions.
        </div>
        <button className="btn btn-primary auth-submit" onClick={signOut}>Log out</button>
        <Link className="auth-home" href="/">Back to homepage</Link>
      </section>
    </main>
  );
}
