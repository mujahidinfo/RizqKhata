import type { Metadata } from "next";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms of use · Rizq Khata",
  description: "The terms for using the Rizq Khata website, dashboard and phone apps.",
};

export default function Page() {
  return (
    <MarketingShell>
      <LegalPage doc="terms" />
    </MarketingShell>
  );
}
