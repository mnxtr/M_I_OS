import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { getLang } from "@/lib/i18n";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Bengali subset only — the full face is large and every extra byte costs on a
 * shared 3G connection in an industrial area.
 */
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MIOS — Manufacturing Intelligence OS",
    template: "%s · MIOS",
  },
  description:
    "Turn factory data into decisions. Ask your factory anything and get answers grounded in your own documents.",
  applicationName: "MIOS",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved server-side so <html lang> and the font stack are correct on the first byte.
  // A client-side switch would leave a screen reader announcing Bangla in an English voice.
  const lang = await getLang();

  return (
    <html lang={lang} className={`${inter.variable} ${notoBengali.variable}`}>
      <body>
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
