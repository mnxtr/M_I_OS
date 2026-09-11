import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  Gauge,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import LangToggle from '@/components/LangToggle';
import { t } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { useLang } from '@/lib/useLang';

const RESEND_SECONDS = 60;
type AuthMethod = 'password' | 'magic-link';

interface AuthFormProps {
  reason?: string;
  onAuthenticated: () => void;
}

function getAuthErrorMessage(error: unknown, tr: ReturnType<typeof t>): string {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) return tr.invalidCredentials;
  if (normalized.includes('email not confirmed')) return tr.emailNotConfirmed;
  if (normalized.includes('signups not allowed')) return tr.invitationRequired;
  return message || tr.genericSignInError;
}

export default function AuthForm({ reason, onAuthenticated }: AuthFormProps) {
  const [lang, setLang] = useLang();
  const tr = t(lang);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<AuthMethod>('password');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
    if (busy || (method === 'magic-link' && resendIn > 0)) return;

    setError('');
    setNotice('');
    setBusy(true);
    try {
      const supabase = getSupabase();
      const normalizedEmail = email.trim().toLowerCase();

      if (method === 'password') {
        if (!password) {
          setError(tr.passwordRequired);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
        onAuthenticated();
        return;
      }

      const callbackUrl = `${window.location.origin}/auth/callback?next=/workspace`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: callbackUrl, shouldCreateUser: false },
      });
      if (signInError) throw signInError;
      setNotice(tr.otpNotice);
      setResendIn(RESEND_SECONDS);
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, tr));
    } finally {
      setBusy(false);
    }
  }

  function selectMethod(nextMethod: AuthMethod): void {
    setMethod(nextMethod);
    setError('');
    setNotice('');
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-labelledby="mios-value-proposition">
        <div className="auth-grid" aria-hidden="true" />
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>{tr.appName}</span>
          <span className="brand-edition">INTELLIGENCE OS</span>
        </div>

        <div className="auth-story-content">
          <div className="system-status">
            <span className="status-dot" />
            FACTORY INTELLIGENCE · ONLINE
          </div>
          <p className="eyebrow">{tr.authEyebrow}</p>
          <h1 id="mios-value-proposition">{tr.authTitle}</h1>
          <p className="auth-story-copy">{tr.authDescription}</p>

          <div className="trust-list" aria-label={tr.productPrinciples}>
            <span><CheckCircle2 aria-hidden="true" size={16} />{tr.evidenceFirst}</span>
            <span><CheckCircle2 aria-hidden="true" size={16} />{tr.bilingualReady}</span>
            <span><CheckCircle2 aria-hidden="true" size={16} />{tr.tenantSecure}</span>
          </div>

          <div
            className="signal-map"
            aria-label={
              lang === 'bn'
                ? 'তথ্য থেকে সিদ্ধান্ত'
                : 'From factory sources to grounded decisions'
            }
          >
            <div className="signal-caption">
              <span>MIOS / DECISION PIPELINE</span>
              <span>LIVE · 03 NODES</span>
            </div>
            <div className="signal-flow">
              <div className="signal-node">
                <Database className="signal-icon" aria-hidden="true" />
                <strong>{lang === 'bn' ? 'উৎস' : 'Sources'}</strong>
                <small>SOP · CSV · PDF</small>
              </div>
              <span className="signal-connector" aria-hidden="true" />
              <div className="signal-node signal-core">
                <BrainCircuit className="signal-icon" aria-hidden="true" />
                <strong>{lang === 'bn' ? 'ইন্টেলিজেন্স' : 'Intelligence'}</strong>
                <small>RETRIEVE · REASON</small>
              </div>
              <span className="signal-connector" aria-hidden="true" />
              <div className="signal-node">
                <Gauge className="signal-icon" aria-hidden="true" />
                <strong>{lang === 'bn' ? 'সিদ্ধান্ত' : 'Decisions'}</strong>
                <small>INSIGHT · EVIDENCE</small>
              </div>
            </div>
            <div className="signal-footer">
              <span className="status-dot" />
              {lang === 'bn' ? 'প্রতিটি উত্তরের সাথে উৎস' : 'A source behind every answer.'}
            </div>
          </div>
        </div>

        <p className="auth-footnote">
          <span>BUILT FOR THE FACTORY FLOOR.</span>
          <span>MIOS © {new Date().getFullYear()}</span>
        </p>
      </section>

      <section className="auth-entry">
        <div className="auth-toolbar">
          <span className="encrypted-label">
            <LockKeyhole aria-hidden="true" size={14} />
            256-BIT SESSION
          </span>
          <LangToggle lang={lang} onChange={setLang} />
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="entry-symbol" aria-hidden="true">
              <LockKeyhole size={20} />
            </span>
            <p className="eyebrow">{tr.invitationOnly}</p>
            <h2>{tr.welcomeBack}</h2>
            <p>{method === 'password' ? tr.passwordDescription : tr.otpDescription}</p>
          </div>

          {reason === 'session_expired' ? (
            <p className="notice-text" role="status">{tr.sessionExpired}</p>
          ) : null}
          {reason === 'invalid_invitation' ? (
            <p className="error-text" role="alert">{tr.invalidInvitation}</p>
          ) : null}

          <div className="auth-tabs" role="tablist" aria-label={tr.authMethod}>
            <button
              className={'auth-tab' + (method === 'password' ? ' is-active' : '')}
              type="button"
              role="tab"
              aria-selected={method === 'password'}
              onClick={() => selectMethod('password')}
            >
              <LockKeyhole aria-hidden="true" size={15} />
              {tr.passwordSignIn}
            </button>
            <button
              className={'auth-tab' + (method === 'magic-link' ? ' is-active' : '')}
              type="button"
              role="tab"
              aria-selected={method === 'magic-link'}
              onClick={() => selectMethod('magic-link')}
            >
              <Mail aria-hidden="true" size={15} />
              {tr.magicLinkSignIn}
            </button>
          </div>

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
                placeholder="you@company.com"
                spellCheck={false}
                required
              />
            </label>

            {method === 'password' ? (
              <label className="field-label" htmlFor="work-password">
                <span>{tr.password}</span>
                <input
                  id="work-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder={tr.passwordHint}
                  required
                />
              </label>
            ) : null}

            {error ? <p className="error-text" role="alert">{error}</p> : null}
            {notice ? <p className="notice-text" role="status">{notice}</p> : null}

            <button
              className="btn btn-primary btn-large"
              type="submit"
              disabled={busy || (method === 'magic-link' && resendIn > 0)}
            >
              <span>
                {busy
                  ? tr.pleaseWait
                  : method === 'magic-link' && resendIn > 0
                    ? tr.resendIn(resendIn)
                    : method === 'password'
                      ? tr.passwordSignInButton
                      : tr.emailSecureLink}
              </span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>

          <p className="secure-note">
            <LockKeyhole aria-hidden="true" size={14} />
            {tr.protectedWorkspace} · {tr.invitationRequired}
          </p>
        </div>
      </section>
    </main>
  );
}
