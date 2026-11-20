import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  alternates: { canonical: "/privacy" },
  description: "What Rizq Khata collects, why, and the control you have over it.",
};

export default function Page() {
  return (
    <MarketingShell>
      <LegalPage doc="privacy" />
    </MarketingShell>
  );
}
