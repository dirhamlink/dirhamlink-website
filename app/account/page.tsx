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
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer area</p>
        <h1>Your account</h1>
        <p className="auth-intro">You are logged in as <strong>{email}</strong>.</p>
        <div className="account-notice">
          Your customer account is active. Transfer requests, beneficiary management and cash deposit submission are the next features to be added. No money transfer can be placed from this page yet.
        </div>
        <button className="btn btn-primary auth-submit" onClick={signOut}>Log out</button>
        <Link className="auth-home" href="/">Back to homepage</Link>
      </section>
    </main>
  );
}
