import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPage() {
  return <ResetPasswordForm />;
}
