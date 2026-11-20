import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { AboutPage } from "@/components/landing/about-page";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
  description: "Rizq Khata is a point of sale and khata for small shops in Bangladesh, built Bangla first.",
};

export default function Page() {
  return (
    <MarketingShell>
      <AboutPage />
    </MarketingShell>
  );
}
