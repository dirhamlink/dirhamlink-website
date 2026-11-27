"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? "");
      setLoading(false);
    });
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
            <small>View indicative rates</small>
            <span className="dashboard-action">View rates</span>
          </Link>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">＋</span>
            <strong>Send money</strong>
            <small>Transfer requests are being built</small>
            <span className="dashboard-coming">Coming soon</span>
          </div>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">▤</span>
            <strong>Beneficiaries</strong>
            <small>Manage people you send money to</small>
            <span className="dashboard-coming">Coming soon</span>
          </div>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">▣</span>
            <strong>Cash deposits</strong>
            <small>Submit deposit details and receipts</small>
            <span className="dashboard-coming">Coming soon</span>
          </div>
          <div className="dashboard-tile dashboard-disabled">
            <span className="dashboard-icon">⌕</span>
            <strong>Track transfers</strong>
            <small>Follow your transfer progress</small>
            <span className="dashboard-coming">Coming soon</span>
          </div>
        </div>

        <div className="account-notice">
          Your customer login is working. The services marked “Coming soon” are not active yet. No payment or money transfer can be made through this dashboard at this stage.
        </div>
        <button className="btn btn-primary auth-submit" onClick={signOut}>Log out</button>
        <Link className="auth-home" href="/">Back to homepage</Link>
      </section>
    </main>
  );
}
