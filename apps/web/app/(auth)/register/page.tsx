import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Register your factory" };

export default function RegisterPage() {
  return <RegisterForm />;
}
