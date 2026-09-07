import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "./AuthPage";

vi.mock("@/lib/supabase", () => ({ getAccessToken: vi.fn().mockResolvedValue(null), supabaseEnabled:true }));
afterEach(() => { cleanup(); localStorage.clear(); });

it("can reveal the password without changing its value or submitting", async () => {
  render(<MemoryRouter><AuthPage /></MemoryRouter>);
  const input = screen.getByLabelText("Password (min 8 chars)") as HTMLInputElement;
  await userEvent.type(input, "sample-password");
  await userEvent.click(screen.getByRole("button", {name:"Show password"}));
  expect(input.type).toBe("text");
  expect(input.value).toBe("sample-password");
  await userEvent.click(screen.getByRole("button", {name:"Hide password"}));
  expect(input.type).toBe("password");
});

it("explains membership provisioning when switching to account creation", async () => {
  render(<MemoryRouter><AuthPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", {name:"Create account"}));
  expect(screen.getByText(/An administrator will arrange/)).toBeTruthy();
  expect(screen.getByLabelText("Your name")).toBeTruthy();
});
