import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductionDraftSync from "./ProductionDraftSync";
import { loadProductionDraft, saveProductionDraft, SavedDraft } from "@/lib/productionDrafts";

vi.mock("@/lib/productionDrafts", () => ({ loadProductionDraft:vi.fn(), saveProductionDraft:vi.fn() }));
const saved: SavedDraft = { revision:1, updated_at:"2026-09-07T10:00:00Z", payload:{interval_minutes:60,observations:[{line:"L1",start:"2026-09-01T09:00:00+06:00",target:100,actual:null}]}};
function Harness({initial = ""}: {initial?:string}) {
  const [value,setValue] = useState(initial);
  return <><textarea aria-label="Current draft" value={value} onChange={e => setValue(e.target.value)}/><ProductionDraftSync value={value} onRestore={setValue} disabled={false} lang="en"/></>;
}
beforeEach(() => { vi.mocked(loadProductionDraft).mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("offers recovery after remount without silently replacing input", async () => {
  vi.mocked(loadProductionDraft).mockResolvedValue(saved);
  const view = render(<Harness initial='{"local":true}'/>);
  await screen.findByRole("button", {name:"Restore saved draft"});
  expect((screen.getByLabelText("Current draft") as HTMLTextAreaElement).value).toContain("local");
  await userEvent.click(screen.getByRole("button", {name:"Restore saved draft"}));
  expect((screen.getByLabelText("Current draft") as HTMLTextAreaElement).value).toContain('"actual": null');
  view.unmount();
  render(<Harness/>);
  await userEvent.click(await screen.findByRole("button", {name:"Restore saved draft"}));
  expect((screen.getByLabelText("Current draft") as HTMLTextAreaElement).value).toContain("L1");
});

it("acknowledges saves only after the server responds and retains edits made during save", async () => {
  let resolve!: (value: SavedDraft) => void;
  vi.mocked(saveProductionDraft).mockReturnValue(new Promise(r => { resolve = r; }));
  render(<Harness initial={JSON.stringify(saved.payload)}/>);
  await waitFor(() => expect((screen.getByRole("button",{name:"Save draft"}) as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(screen.getByRole("button",{name:"Save draft"}));
  expect(screen.queryByText("Saved on the server.")).toBeNull();
  fireEvent.change(screen.getByLabelText("Current draft"), {target:{value:'{"changed":true}'}});
  resolve(saved);
  await screen.findByText(/Revision 1/);
  expect((screen.getByLabelText("Current draft") as HTMLTextAreaElement).value).toContain("changed");
  expect(screen.queryByText("Saved on the server.")).toBeNull();
});

it("preserves local work on conflict until the user reviews and chooses", async () => {
  vi.mocked(saveProductionDraft).mockRejectedValue(new Error("DRAFT_CONFLICT"));
  render(<Harness initial={JSON.stringify(saved.payload)}/>);
  await waitFor(() => expect((screen.getByRole("button",{name:"Save draft"}) as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(screen.getByRole("button", {name:"Save draft"}));
  expect((await screen.findByRole("alert")).textContent).toContain("local input is unchanged");
  const newer = {...saved,revision:2};
  vi.mocked(loadProductionDraft).mockResolvedValue(newer);
  await userEvent.click(screen.getByRole("button",{name:"Review latest saved draft"}));
  await userEvent.click(await screen.findByRole("button",{name:"Use my local draft instead"}));
  fireEvent.change(screen.getByLabelText("Current draft"),{target:{value:JSON.stringify({...saved.payload,interval_minutes:30})}});
  vi.mocked(saveProductionDraft).mockResolvedValue({...saved,revision:3});
  await userEvent.click(screen.getByRole("button",{name:"Save draft"}));
  await screen.findByText("Saved on the server.");
  expect(vi.mocked(saveProductionDraft).mock.calls[1][1]).toBe(2);
});

it("keeps the draft editable when storage is unavailable", async () => {
  vi.mocked(loadProductionDraft).mockRejectedValue(new Error("DRAFT_UNAVAILABLE"));
  render(<Harness initial="my draft"/>);
  expect((await screen.findByRole("alert")).textContent).toContain("unavailable");
  expect((screen.getByLabelText("Current draft") as HTMLTextAreaElement).value).toBe("my draft");
  expect((screen.getByRole("button",{name:"Save draft"}) as HTMLButtonElement).disabled).toBe(true);
});
