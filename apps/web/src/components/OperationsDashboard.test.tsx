import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OperationsDashboard from "./OperationsDashboard";

vi.mock("@/lib/supabase", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("never invents live metrics and labels the demo input", async () => {
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} />);
  expect(screen.getByText(/No live production feed/)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", {name: "Load labeled demo records"}));
  expect((screen.getByLabelText("Production intervals (JSON)") as HTMLTextAreaElement).value).toContain("Demo Line 01");
  expect(screen.queryByText("Target attainment")).toBeNull();
});

it("submits hourly actuals and displays the server gap with an activity event", async () => {
  const onActivity = vi.fn();
  const fetchMock = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({
    observed_intervals: 1, missing_actual_intervals: 0, unscheduled_intervals: 0,
    target_units: 100, actual_units: 75, gap_units: 25, attainment_percent: 75,
    cycles: [], recurring_slots: [],
    points: [{line: "Line 01", start: "2026-09-01T09:00:00+06:00", target: 100, actual: 75, gap: 25}],
  })});
  vi.stubGlobal("fetch", fetchMock);
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} onActivity={onActivity} />);
  await userEvent.type(screen.getByLabelText("Line"), "Line 01");
  const { fireEvent } = await import("@testing-library/react");
  fireEvent.change(screen.getByLabelText("Start (Dhaka)"), {target: {value: "2026-09-01T09:00"}});
  await userEvent.type(screen.getByLabelText("Target (pieces)"), "100");
  await userEvent.type(screen.getByLabelText("Actual (blank = unknown)"), "75");
  await userEvent.click(screen.getByRole("button", {name: "Add hourly interval"}));
  await userEvent.click(screen.getByRole("button", {name: "Analyze gaps"}));
  expect(await screen.findByText("75%")).toBeTruthy();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).observations[0].actual).toBe(75);
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  expect(onActivity).toHaveBeenCalledOnce();
});

it("does not turn an API failure into a zero-output result", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false, status: 503}));
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} />);
  await userEvent.click(screen.getByRole("button", {name: "Load labeled demo records"}));
  await userEvent.click(screen.getByRole("button", {name: "Analyze gaps"}));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Target attainment")).toBeNull();
});
