"use client";

import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import LangToggle from "@/components/LangToggle";

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

  useEffect(() => {
    if (localStorage.getItem("mios_token")) router("/workspace");
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
    <main className="container">
      <div style={{ maxWidth: 420, margin: "8vh auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>{tr.appName}</h1>
        <p className="muted" style={{ marginTop: 0 }}>{tr.tagline}</p>

        <form onSubmit={onSubmit} className="panel" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, ...(mode === "login" ? activeTab : {}) }}
              onClick={() => setMode("login")}
            >
              {tr.signIn}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, ...(mode === "register" ? activeTab : {}) }}
              onClick={() => setMode("register")}
            >
              {tr.registerFactory}
            </button>
          </div>

          {mode === "register" && (
            <>
              <input
                className="input"
                placeholder={tr.companyName}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder={tr.yourName}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </>
          )}
          <input
            className="input"
            type="email"
            placeholder={tr.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder={tr.password}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}

          <button className="btn" disabled={busy}>
            {busy ? tr.pleaseWait : mode === "login" ? tr.signIn : tr.createAccount}
          </button>
        </form>
      </div>
    </main>
  );
}

const activeTab: React.CSSProperties = {
  borderColor: "var(--accent)",
  color: "var(--accent)",
};
