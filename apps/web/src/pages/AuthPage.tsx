"use client";

import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import LangToggle from "@/components/LangToggle";
import Icon from "@/components/Icon";
import { getAccessToken, persistLegacyToken, supabaseEnabled } from "@/lib/supabase";

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
      persistLegacyToken(token);
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
        <div className="auth-story-copy"><span className="eyebrow">{lang === "bn" ? "à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦à¦¨à§à¦à§à¦²à¦¿à¦à§à¦¨à§à¦¸, à¦¸à¦¬à¦¾à¦° à¦à¦¨à§à¦¯" : "A CLEARER VIEW OF YOUR FACTORY"}</span><h1>{lang === "bn" ? "à¦à¦® à¦à¦¨à§à¦®à¦¾à¦¨à¥¤ à¦à¦°à¦ à¦¸à§à¦ªà¦·à§à¦ à¦¸à¦¿à¦¦à§à¦§à¦¾à¦¨à§à¦¤à¥¤" : <>Less guesswork.<br/>More clarity.</>}</h1><p>{lang === "bn" ? "à¦à§à¦ªà¦¾à¦¦à¦¨à§à¦° à¦à¦¾à¦à¦¤à¦¿, à¦¶à¦¿à¦«à¦à§à¦° à¦¤à¦¥à§à¦¯ à¦ à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦à§à¦à¦¾à¦¨ à¦à¦ à¦à¦¾à¦¯à¦¼à¦à¦¾à¦¯à¦¼ à¦à¦¨à§à¦¨à¥¤" : "Bring your production gaps, shift records and factory knowledge into one focused workspace."}</p></div>
        <div className="auth-feature-list">{[
          {icon:"overview" as const, title:lang === "bn" ? "à¦à¦¾à¦à¦¤à¦¿ à¦¦à§à¦à§à¦¨" : "Spot the shortfall", text:lang === "bn" ? "à¦²à¦à§à¦·à§à¦¯ à¦ à¦ªà§à¦°à¦à§à¦¤ à¦à§à¦ªà¦¾à¦¦à¦¨ à¦¤à§à¦²à¦¨à¦¾ à¦à¦°à§à¦¨à¥¤" : "Compare targets with actual output."},
          {icon:"knowledge" as const, title:lang === "bn" ? "à¦à§à¦à¦¾à¦¨ à¦à¦à¦¸à¦¾à¦¥à§ à¦°à¦¾à¦à§à¦¨" : "Keep knowledge close", text:lang === "bn" ? "à¦à¦¸à¦à¦ªà¦¿ à¦ à¦¶à¦¿à¦«à¦à§à¦° à¦°à§à¦à¦°à§à¦¡ à¦à¦ à¦à¦¾à¦¯à¦¼à¦à¦¾à¦¯à¦¼à¥¤" : "Keep SOPs and shift records in one place."},
          {icon:"assistant" as const, title:lang === "bn" ? "à¦ªà§à¦°à¦®à¦¾à¦£ à¦¥à§à¦à§ à¦à¦¤à§à¦¤à¦°" : "Ask with context", text:lang === "bn" ? "à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦à§à¦¸ à¦¥à§à¦à§ à¦à¦¤à§à¦¤à¦° à¦à§à¦à¦à§à¦¨à¥¤" : "Find answers grounded in your sources."},
        ].map(item => <div key={item.icon}><span className="feature-icon"><Icon name={item.icon}/></span><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div>
        <span className="auth-story-footer">{lang === "bn" ? "à¦¬à¦¾à¦à¦²à¦¾à¦¦à§à¦¶à§à¦° à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦à¦¨à§à¦¯ à¦¤à§à¦°à¦¿" : "BUILT AROUND BANGLADESHâS FACTORY FLOOR"}</span>
      </section>
      <section className="auth-form-side">
        <div className="auth-language">
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <div className="auth-form-wrap"><span className="eyebrow">{lang === "bn" ? "à¦à¦ªà¦¨à¦¾à¦° à¦à¦¯à¦¼à¦¾à¦°à§à¦à¦¸à§à¦ªà§à¦¸" : "YOUR LINEORA WORKSPACE"}</span><h2>{mode === "login" ? (lang === "bn" ? "à¦à¦¬à¦¾à¦° à¦¸à§à¦¬à¦¾à¦à¦¤à¦®à¥¤" : "Welcome back.") : (lang === "bn" ? "à¦à¦ªà¦¨à¦¾à¦° à¦à¦à¦¾à¦à¦¨à§à¦ à¦¤à§à¦°à¦¿ à¦à¦°à§à¦¨à¥¤" : "Make room for clearer decisions.")}</h2>
        <p className="auth-description">{mode === "login" ? (lang === "bn" ? "à¦à¦ªà¦¨à¦¾à¦° à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦à¦¾à¦ à¦à¦¾à¦²à¦¿à¦¯à¦¼à§ à¦¯à§à¦¤à§ à¦¸à¦¾à¦à¦¨ à¦à¦¨ à¦à¦°à§à¦¨à¥¤" : "Sign in to pick up where your team left off.") : (lang === "bn" ? "à¦ªà§à¦°à¦¥à¦®à§ à¦à¦à¦¾à¦à¦¨à§à¦ à¦¤à§à¦°à¦¿ à¦à¦°à§à¦¨à¥¤ à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦ªà§à¦°à¦¬à§à¦¶à¦¾à¦§à¦¿à¦à¦¾à¦° à¦ªà§à¦°à¦¶à¦¾à¦¸à¦ à¦¦à§à¦¬à§à¦¨à¥¤" : "Create your account. An administrator will arrange your factory access.")}</p>

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
          /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? (lang === "bn" ? "à¦²à§à¦à¦¾à¦¨" : "Hide password") : (lang === "bn" ? "à¦¦à§à¦à§à¦¨" : "Show password")}</button></div>

          {error && <p role="alert" className="error-text">{error}</p>}

          <button className="btn" disabled={busy}>
            {busy ? tr.pleaseWait : mode === "login" ? tr.signIn : tr.createAccount}<Icon name="arrow"/>
          </button>
        </form>
        <p className="auth-access-note">{supabaseEnabled ? (lang === "bn" ? "à¦à¦¾à¦°à¦à¦¾à¦¨à¦¾à¦° à¦ªà§à¦°à¦¬à§à¦¶à¦¾à¦§à¦¿à¦à¦¾à¦° à¦¸à¦à§à¦°à¦¿à¦¯à¦¼ à¦¸à¦¦à¦¸à§à¦¯à¦¤à¦¾à¦° à¦à¦ªà¦° à¦¨à¦¿à¦°à§à¦­à¦° à¦à¦°à§à¥¤" : "Factory access is limited to your active membership.") : (lang === "bn" ? "à¦¡à§à¦­à§à¦²à¦ªà¦®à§à¦¨à§à¦ à¦¸à¦¾à¦à¦¨-à¦à¦¨à¥¤ Supabase à¦à¦à¦¨à§ à¦à¦¨à¦«à¦¿à¦à¦¾à¦° à¦à¦°à¦¾ à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤" : "Development sign-in. Supabase is not configured in this build.")}</p>
        </div>
      </section>
    </main>
  );
}
