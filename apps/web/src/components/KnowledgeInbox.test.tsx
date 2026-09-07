import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import KnowledgeInbox from "./KnowledgeInbox";
import { uploadDocument } from "@/lib/api";

vi.mock("@/lib/api", () => ({ uploadDocument: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("shows per-file acceptance and failure without claiming files are indexed", async () => {
  vi.mocked(uploadDocument).mockResolvedValueOnce({} as never).mockRejectedValueOnce(new Error("offline"));
  const refresh = vi.fn();
  const { container } = render(<KnowledgeInbox lang="en" onUploaded={refresh} />);
  fireEvent.change(container.querySelector("input")!, {target: {files: [
    new File(["manual"], "manual.txt"), new File(["sheet"], "shift.csv"),
  ]}});
  expect(await screen.findByText("manual.txt: accepted for processing")).toBeTruthy();
  expect(await screen.findByText(/shift.csv: upload failed/)).toBeTruthy();
  expect(refresh).toHaveBeenCalledOnce();
});

it("rejects unsupported files without uploading", async () => {
  const { container } = render(<KnowledgeInbox lang="en" onUploaded={() => {}} />);
  fireEvent.change(container.querySelector("input")!, {target: {files: [new File(["x"], "run.exe")]}});
  expect(await screen.findByText(/unsupported type/)).toBeTruthy();
  expect(uploadDocument).not.toHaveBeenCalled();
});
