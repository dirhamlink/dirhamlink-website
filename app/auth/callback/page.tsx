"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email and opening your account…");

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        router.replace("/account");
        router.refresh();
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (data.session) {
        router.replace("/account");
        router.refresh();
      } else if (error) {
        setMessage("We could not confirm your session. Please open the email link again or log in.");
      } else {
        setMessage("Waiting for email confirmation. If this page does not continue, please log in.");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="brand auth-brand"><span className="brand-mark">D</span>DirhamLink</span>
        <p className="eyebrow auth-eyebrow">Email confirmation</p>
        <h1>Welcome to DirhamLink</h1>
        <p className="auth-intro" role="status">{message}</p>
      </section>
    </main>
  );
}
