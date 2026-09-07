"use client";

import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import LangToggle from "@/components/LangToggle";
import Icon from "@/components/Icon";
import { getAccessToken, supabaseEnabled } from "@/lib/supabase";

export default function AuthPage() {
  const router = useNavigate();
  const [lang, setLang] = useLang();
  const tr = t(lang);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void getAccessToken().then(token => { if (token) router("/workspace"); }).catch(() => setError("Unable to check your session. Please sign in."));
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const token =
        mode === "login"
          ? await login(email, password)
          : await register(companyName, fullName, email, password);
      localStorage.setItem("mios_token", token);
      router("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a className="brand" href="#/"><span className="brand-mark">L</span>Linora<span className="brand-period">.</span></a>
        <div className="auth-story-copy"><span className="eyebrow">{lang === "bn" ? "কারখানার ইন্টেলিজেন্স, সবার জন্য" : "A CLEARER VIEW OF YOUR FACTORY"}</span><h1>{lang === "bn" ? "কম অনুমান। আরও স্পষ্ট সিদ্ধান্ত।" : <>Less guesswork.<br/>More clarity.</>}</h1><p>{lang === "bn" ? "উৎপাদনের ঘাটতি, শিফটের তথ্য ও কারখানার জ্ঞান এক জায়গায় আনুন।" : "Bring your production gaps, shift records and factory knowledge into one focused workspace."}</p></div>
        <div className="auth-feature-list">{[
          {icon:"overview" as const, title:lang === "bn" ? "ঘাটতি দেখুন" : "Spot the shortfall", text:lang === "bn" ? "লক্ষ্য ও প্রকৃত উৎপাদন তুলনা করুন।" : "Compare targets with actual output."},
          {icon:"knowledge" as const, title:lang === "bn" ? "জ্ঞান একসাথে রাখুন" : "Keep knowledge close", text:lang === "bn" ? "এসওপি ও শিফটের রেকর্ড এক জায়গায়।" : "Keep SOPs and shift records in one place."},
          {icon:"assistant" as const, title:lang === "bn" ? "প্রমাণ থেকে উত্তর" : "Ask with context", text:lang === "bn" ? "কারখানার উৎস থেকে উত্তর খুঁজুন।" : "Find answers grounded in your sources."},
        ].map(item => <div key={item.icon}><span className="feature-icon"><Icon name={item.icon}/></span><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div>
        <span className="auth-story-footer">{lang === "bn" ? "বাংলাদেশের কারখানার জন্য তৈরি" : "BUILT AROUND BANGLADESH’S FACTORY FLOOR"}</span>
      </section>
      <section className="auth-form-side">
        <div className="auth-language">
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <div className="auth-form-wrap"><span className="eyebrow">{lang === "bn" ? "আপনার ওয়ার্কস্পেস" : "YOUR LINEORA WORKSPACE"}</span><h2>{mode === "login" ? (lang === "bn" ? "আবার স্বাগতম।" : "Welcome back.") : (lang === "bn" ? "আপনার একাউন্ট তৈরি করুন।" : "Make room for clearer decisions.")}</h2>
        <p className="auth-description">{mode === "login" ? (lang === "bn" ? "আপনার কারখানার কাজ চালিয়ে যেতে সাইন ইন করুন।" : "Sign in to pick up where your team left off.") : (lang === "bn" ? "প্রথমে একাউন্ট তৈরি করুন। কারখানার প্রবেশাধিকার প্রশাসক দেবেন।" : "Create your account. An administrator will arrange your factory access.")}</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-mode" aria-label="Account action">
            <button
              type="button"
              className="btn btn-ghost"
              aria-pressed={mode === "login"}
              disabled={busy}
              onClick={() => { setMode("login"); setError(""); }}
            >
              {tr.signIn}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              aria-pressed={mode === "register"}
              disabled={busy}
              onClick={() => { setMode("register"); setError(""); }}
            >
              {tr.createAccount}
            </button>
          </div>

          {mode === "register" && (
            <>
              <label>{tr.companyName}<input
                className="input"
                placeholder={tr.companyName}
                aria-label={tr.companyName}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              /></label>
              <label>{tr.yourName}<input
                className="input"
                placeholder={tr.yourName}
                aria-label={tr.yourName}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              /></label>
            </>
          )}
          <label>{tr.email}<input
            className="input"
            type="email"
            placeholder={tr.email}
            aria-label={tr.email}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /></label>
          <label htmlFor="auth-password">{tr.password}</label><div className="password-field"><input
            id="auth-password"
            className="input"
            type={showPassword ? "text" : "password"}
            placeholder={tr.password}
            aria-label={tr.password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? (lang === "bn" ? "লুকান" : "Hide password") : (lang === "bn" ? "দেখুন" : "Show password")}</button></div>

          {error && <p role="alert" className="error-text">{error}</p>}

          <button className="btn" disabled={busy}>
            {busy ? tr.pleaseWait : mode === "login" ? tr.signIn : tr.createAccount}<Icon name="arrow"/>
          </button>
        </form>
        <p className="auth-access-note">{supabaseEnabled ? (lang === "bn" ? "কারখানার প্রবেশাধিকার সক্রিয় সদস্যতার ওপর নির্ভর করে।" : "Factory access is limited to your active membership.") : (lang === "bn" ? "ডেভেলপমেন্ট সাইন-ইন। Supabase এখনো কনফিগার করা হয়নি।" : "Development sign-in. Supabase is not configured in this build.")}</p>
        </div>
      </section>
    </main>
  );
}
