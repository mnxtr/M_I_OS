import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

it("reviews unknown actuals and removes draft rows before analysis", async () => {
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} />);
  await userEvent.type(screen.getByLabelText("Line"), "Line 02");
  fireEvent.change(screen.getByLabelText("Start (Dhaka)"), {target:{value:"2026-09-01T10:00"}});
  await userEvent.type(screen.getByLabelText("Target (pieces)"), "100");
  await userEvent.click(screen.getByRole("button", {name:"Add hourly interval"}));
  expect(screen.getByText("Unknown")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Interval added");
  await userEvent.click(screen.getByRole("button", {name:"Remove interval 1"}));
  expect(screen.queryByRole("table", {name:"Review intervals before analysis"})).toBeNull();
  expect((screen.getByRole("button", {name:"Analyze gaps"}) as HTMLButtonElement).disabled).toBe(true);
});

it("requires an explicit choice before replacing an existing draft with demo records", async () => {
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} />);
  const input = screen.getByLabelText("Production intervals (JSON)") as HTMLTextAreaElement;
  fireEvent.change(input, {target:{value:'{"interval_minutes":60,"observations":[]}'}});
  await userEvent.click(screen.getByRole("button", {name:"Load labeled demo records"}));
  expect(input.value).not.toContain("Demo Line");
  await userEvent.click(screen.getByRole("button", {name:"Keep my draft"}));
  expect(input.value).not.toContain("Demo Line");
  await userEvent.click(screen.getByRole("button", {name:"Load labeled demo records"}));
  await userEvent.click(screen.getByRole("button", {name:"Use demo records"}));
  expect(input.value).toContain("Demo Line");
});

it("paginates evidence and resets the page after selecting a line", async () => {
  const points = Array.from({length:25}, (_,i) => ({line:i < 24 ? "Line A" : "Line B", start:"2026-09-01T09:00:00+06:00",target:100,actual:90,gap:10}));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,status:200,json:async () => ({
    observed_intervals:25,missing_actual_intervals:0,unscheduled_intervals:0,target_units:2500,actual_units:2250,gap_units:250,attainment_percent:90,cycles:[],recurring_slots:[],points,
  })}));
  render(<OperationsDashboard lang="en" onKnowledge={() => {}} />);
  await userEvent.click(screen.getByRole("button", {name:"Load labeled demo records"}));
  await userEvent.click(screen.getByRole("button", {name:"Analyze gaps"}));
  const table = await screen.findByRole("table", {name:"Source records behind the production gaps"});
  expect(within(table).getAllByRole("row")).toHaveLength(21);
  await userEvent.click(screen.getByRole("button", {name:"Next records"}));
  expect(within(table).getAllByRole("row")).toHaveLength(6);
  await userEvent.selectOptions(screen.getByLabelText("Line records"), "Line B");
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  expect((screen.getByRole("button", {name:"Previous records"}) as HTMLButtonElement).disabled).toBe(true);
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
