import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkspacePage from "./WorkspacePage";
import { fetchDocuments, listTables, fetchUsage } from "@/lib/api";

vi.mock("@/lib/supabase", () => ({ getAccessToken: vi.fn().mockResolvedValue("session"), signOut: vi.fn() }));
vi.mock("@/lib/api", () => ({
  API_URL: "https://example.test", fetchDocuments: vi.fn(), listTables: vi.fn(), fetchUsage: vi.fn(),
  askStream: vi.fn(), runQuery: vi.fn(), uploadDocument: vi.fn(),
}));
vi.mock("@/components/KnowledgeInbox", () => ({ default: () => <h2>Test knowledge inbox</h2> }));
vi.mock("@/components/KnowledgeDashboard", () => ({ default: () => <p>Test source status</p> }));
vi.mock("@/components/ProductionDraftSync", () => ({ default: () => null }));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchDocuments).mockResolvedValue([]);
  vi.mocked(listTables).mockResolvedValue([]);
  vi.mocked(fetchUsage).mockResolvedValue({plan:{name:"Pilot"},usage:{},limits:{}} as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps an unsaved production entry when moving between sections", async () => {
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  await userEvent.type(await screen.findByLabelText("Line"), "Line 08");
  await userEvent.click(within(screen.getByRole("navigation")).getByRole("button", {name:"Knowledge inbox"}));
  expect(await screen.findByText("Test knowledge inbox")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", {name:"Overview"}));
  expect((screen.getByLabelText("Line") as HTMLInputElement).value).toBe("Line 08");
  expect(fetchDocuments).not.toHaveBeenCalled();
});

it("loads assistant resources only when needed and does not repeat on navigation", async () => {
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  await screen.findByLabelText("Line");
  expect(fetchDocuments).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", {name:"Intelligence assistant"}));
  await waitFor(() => expect(fetchDocuments).toHaveBeenCalledTimes(1));
  expect(listTables).toHaveBeenCalledTimes(1);
  expect(fetchUsage).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", {name:"Overview"}));
  await userEvent.click(screen.getByRole("button", {name:"Intelligence assistant"}));
  expect(fetchDocuments).toHaveBeenCalledTimes(1);
});

it("lets a suggested question fill the composer without sending it", async () => {
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  await userEvent.click(await screen.findByRole("button", {name:"Intelligence assistant"}));
  await userEvent.click(screen.getByRole("button", {name:"Find the SOP for machine maintenance."}));
  expect((screen.getByLabelText("Ask a question… (Bangla or English)") as HTMLInputElement).value).toBe("Find the SOP for machine maintenance.");
});
