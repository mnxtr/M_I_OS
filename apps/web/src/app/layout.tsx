import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIOS — Manufacturing OS Intelligence",
  description: "Ask your factory anything. RAG-based manufacturing intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
