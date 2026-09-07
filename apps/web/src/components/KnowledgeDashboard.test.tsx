import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KnowledgeDashboard from "./KnowledgeDashboard";
import { getKnowledgeSnapshot } from "@/lib/dashboard";

vi.mock("@/lib/dashboard", () => ({ getKnowledgeSnapshot: vi.fn() }));
const request = vi.mocked(getKnowledgeSnapshot);
const snapshot = { fetched_at: "2026-09-07T12:00:00Z", total: 2,
  counts: { ready: 1, processing: 0, failed: 1 }, ready_percent: 50,
  matched: 2, offset: 0, limit: 20, records: [{ id: "a", filename: "SOP.pdf",
  status: "ready" as const, department: "Sewing", created_at: "2026-09-07T11:00:00Z" }] };
beforeEach(() => request.mockReset());
afterEach(cleanup);

describe("Knowledge readiness", () => {
  it("shows loading, then real values and source records", async () => {
    request.mockResolvedValue(snapshot); render(<KnowledgeDashboard lang="en" />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    expect(await screen.findByText("SOP.pdf")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
  });
  it("uses a chart button to request a filtered drill-down", async () => {
    request.mockResolvedValue(snapshot); render(<KnowledgeDashboard lang="en" />);
    await screen.findByText("SOP.pdf");
    await userEvent.click(screen.getByRole("button", {name: "Failed 1"}));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith("failed", 0, expect.any(AbortSignal)));
  });
  it("shows errors instead of false zero values and supports retry", async () => {
    request.mockRejectedValueOnce(new Error("DASHBOARD_UNAVAILABLE")).mockResolvedValue(snapshot);
    render(<KnowledgeDashboard lang="en" />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("0%")).toBeNull();
    await userEvent.click(screen.getByRole("button", {name: "Retry"}));
    expect(await screen.findByText("SOP.pdf")).toBeTruthy();
  });
  it("keeps empty readiness unknown", async () => {
    request.mockResolvedValue({...snapshot, total: 0, counts: {ready:0,processing:0,failed:0}, ready_percent:null, matched:0, records:[]});
    render(<KnowledgeDashboard lang="en" />);
    expect(await screen.findByText("Start with the files you already have")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });
  it("provides Bangla headings", async () => {
    request.mockResolvedValue(snapshot); render(<KnowledgeDashboard lang="bn" />);
    expect(await screen.findByText("আপনার তথ্য কতটা প্রস্তুত?")).toBeTruthy();
  });
});
