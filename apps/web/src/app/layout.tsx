import type { Metadata, Viewport } from "next";
import { Inter, Tiro_Bangla, Anek_Bangla } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Tiro Bangla ships a single weight (400). The UI leans on 600–900 for headings,
// so browsers synthesise those — `font-synthesis: weight` in globals.css keeps
// that on deliberately, since disabling it would flatten the whole type hierarchy.
const bengali = Tiro_Bangla({
  subsets: ["bengali"],
  weight: "400",
  display: "swap",
  variable: "--font-bengali",
});

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

export const metadata: Metadata = {
  title: "Rizq Khata – Point of Sale",
  description: "Point of sale and khata for shops in Bangladesh: sales, stock, customers, repair jobs and every taka going out, in Bangla and English.",
  applicationName: APP_NAME,
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
    // Bangla is the default; LanguageProvider updates this client-side when the
    // shop (or a landing visitor) selects English.
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bengali.variable} ${display.variable}`}
        style={{ fontFamily: "var(--font-inter), var(--font-bengali), sans-serif" }}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
