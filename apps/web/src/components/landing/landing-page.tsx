import { MarketingShell } from "./marketing-shell";
import { Hero } from "./hero";
import { OneSaleDemo } from "./one-sale-demo";
import { RepairSection } from "./repair-section";
import { OfflineSection } from "./offline-section";
import { AppsComingSoon } from "./apps-coming-soon";
import { FeaturesBento } from "./features-bento";
import { ClosingBlock, StartSteps } from "./closing";

/**
 * Public landing page: hero with the Sell screen, the one-sale demo, repair
 * jobs, offline selling, the apps, the rest of the shop, three steps, the close.
 * Every mock is rendered in code with labelled sample data.
 */
export function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <OneSaleDemo />
      <RepairSection />
      <OfflineSection />
      <AppsComingSoon />
      <FeaturesBento />
      <StartSteps />
      <ClosingBlock />
    </MarketingShell>
  );
}
