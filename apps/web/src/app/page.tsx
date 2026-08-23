"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("mios_token")) router.replace("/workspace");
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
      router.push("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div style={{ maxWidth: 420, margin: "8vh auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>MIOS</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Manufacturing OS Intelligence — ask your factory anything.
        </p>

        <form onSubmit={onSubmit} className="panel" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, ...(mode === "login" ? activeTab : {}) }}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, ...(mode === "register" ? activeTab : {}) }}
              onClick={() => setMode("register")}
            >
              Register factory
            </button>
          </div>

          {mode === "register" && (
            <>
              <input
                className="input"
                placeholder="Company name (e.g. Meghna Apparels Ltd)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </>
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 8 chars)"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}

          <button className="btn" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
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
