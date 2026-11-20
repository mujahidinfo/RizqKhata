import type { Metadata, Viewport } from "next";
import { Inter, Anek_Bangla } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Anek Bangla: the brand display face. One variable family covers Bangla and
// Latin with real weights, so landing headlines hold their hierarchy in both
// languages without synthetic bold.
const display = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-display",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Rizq Khata";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "Point of sale and khata for shops in Bangladesh: sales, stock, customers, repair jobs and every taka going out, in Bangla and English.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Rizq Khata – Point of Sale & Khata", template: "%s · Rizq Khata" },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: "Rizq Khata – Point of Sale & Khata",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Rizq Khata" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    // "default" keeps the iOS status bar legible against the light shell.
    statusBarStyle: "default",
  },
  // Phone numbers in receipts/orders shouldn't become tap-to-call links.
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately NOT setting maximumScale/userScalable — pinch-zoom stays
  // available. The focus-zoom problem is solved with a 16px font on touch
  // devices in globals.css instead.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#17694C" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Bangla is the default; the language switch updates this client-side.
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable}`}
        style={{ fontFamily: "var(--font-inter), var(--font-display), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
