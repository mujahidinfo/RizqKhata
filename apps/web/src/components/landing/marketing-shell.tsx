"use client";

import { LandingLanguageProvider } from "@/lib/i18n/landing-language-context";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./closing";

/** Header, footer, language and brand tokens shared by every public page. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingLanguageProvider>
      <div className="rk min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </div>
    </LandingLanguageProvider>
  );
}
