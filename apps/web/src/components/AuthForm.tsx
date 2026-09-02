"use client";

import { FormEvent, useEffect, useState } from "react";

import LangToggle from "@/components/LangToggle";
import { t } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";

const RESEND_SECONDS = 60;

export default function AuthForm({ reason }: { reason?: string }) {
  const [lang, setLang] = useLang();
  const tr = t(lang);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(
      () => setResendIn((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || resendIn > 0) return;

    setError("");
    setNotice("");
    setBusy(true);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/workspace`;
      const { error: signInError } = await getSupabase().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: callbackUrl, shouldCreateUser: false },
      });
      if (signInError) throw signInError;
      setNotice(tr.otpNotice);
      setResendIn(RESEND_SECONDS);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : tr.genericSignInError;
      setError(message.includes("Signups not allowed") ? tr.invitationRequired : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-labelledby="mios-value-proposition">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>{tr.appName}</span>
        </div>
        <div className="auth-story-content">
          <p className="eyebrow">{tr.authEyebrow}</p>
          <h1 id="mios-value-proposition">{tr.authTitle}</h1>
          <p className="auth-story-copy">{tr.authDescription}</p>
          <div className="trust-list" aria-label={tr.productPrinciples}>
            <span>{tr.evidenceFirst}</span>
            <span>{tr.bilingualReady}</span>
            <span>{tr.tenantSecure}</span>
          </div>
        </div>
        <p className="auth-footnote">{tr.tagline}</p>
      </section>

      <section className="auth-entry">
        <div className="auth-toolbar">
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">{tr.invitationOnly}</p>
            <h2>{tr.welcomeBack}</h2>
            <p>{tr.otpDescription}</p>
          </div>

          {reason === "session_expired" ? (
            <p className="notice-text" role="status">{tr.sessionExpired}</p>
          ) : null}
          {reason === "invalid_invitation" ? (
            <p className="error-text" role="alert">{tr.invalidInvitation}</p>
          ) : null}

          <form onSubmit={onSubmit} className="form-stack">
            <label className="field-label" htmlFor="work-email">
              <span>{tr.email}</span>
              <input
                id="work-email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
            {notice ? <p className="notice-text" role="status">{notice}</p> : null}
            <button className="btn btn-primary btn-large" disabled={busy || resendIn > 0}>
              {busy
                ? tr.pleaseWait
                : resendIn > 0
                  ? tr.resendIn(resendIn)
                  : tr.emailSecureLink}
            </button>
          </form>
          <p className="secure-note">{tr.protectedWorkspace} · {tr.invitationRequired}</p>
        </div>
      </section>
    </main>
  );
}
