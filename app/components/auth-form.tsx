"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) router.replace("/account");
    });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push("/account");
          router.refresh();
        } else {
          setMessage("Your account is created. Open the confirmation link in your email. It will return you to DirhamLink and sign you in automatically.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/account");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Customer account</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-intro">{isRegister ? "Register to access your DirhamLink customer area." : "Log in to continue to your DirhamLink customer area."}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>Full name
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </label>
          )}
          <label>Email address
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {isRegister && <small>Use at least 8 characters.</small>}
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : isRegister ? "Create account" : "Log in"}</button>
        </form>
        <p className="auth-switch">{isRegister ? "Already have an account?" : "New to DirhamLink?"}{" "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link></p>
        <p className="auth-disclaimer">Creating an account does not itself authorize or initiate a money transfer. All services remain subject to eligibility, verification and applicable checks.</p>
        <Link className="auth-home" href="/">← Back to homepage</Link>
      </section>
    </main>
  );
}
