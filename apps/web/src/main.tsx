import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Suspense fallback={<main className="container"><p role="status">Opening Linora…</p></main>}><Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </HashRouter>
  </StrictMode>,
);
