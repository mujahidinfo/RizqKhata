"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { LOGIN_HREF, SIGNUP_HREF, useLanding } from "./use-landing";

const LINKS = [
  { href: "/#features", key: "landing.navFeatures" },
  { href: "/#repair", key: "landing.navRepair" },
  { href: "/#apps", key: "landing.navApps" },
  { href: "/#start", key: "landing.navStart" },
] as const;

export function SiteHeader() {
  const { t } = useLanding();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white transition-shadow duration-300",
        scrolled || open ? "shadow-[0_1px_0_var(--rk-line),0_8px_24px_-16px_rgba(15,67,50,0.25)]" : "shadow-[0_1px_0_transparent]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[76rem] items-center gap-6 px-4 sm:px-6 lg:h-[4.5rem]">
        <Link href="/" className="shrink-0" aria-label="Rizq Khata">
          <Image src="/logo-wordmark.png" alt="Rizq Khata" width={1200} height={261} priority className="h-7 w-auto lg:h-8" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[0.95rem] text-[var(--rk-slate)] transition-colors hover:bg-[var(--rk-ground-2)] hover:text-[var(--rk-ink)]"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Link
            href={LOGIN_HREF}
            className="hidden rounded-full px-3.5 py-2 text-[0.95rem] font-medium text-[var(--rk-slate)] transition-colors hover:text-[var(--rk-green)] md:block"
          >
            {t("landing.signIn")}
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="inline-flex min-h-10 items-center rounded-full bg-[var(--rk-green)] px-4 text-[0.92rem] font-semibold text-white transition-colors hover:bg-[var(--rk-green-deep)] sm:px-5"
          >
            {t("landing.startFree")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="rk-mobile-nav"
            aria-label={open ? t("landing.closeMenu") : t("landing.openMenu")}
            className="grid size-10 place-items-center rounded-full text-[var(--rk-slate)] hover:bg-[var(--rk-ground-2)] lg:hidden"
          >
            {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="rk-mobile-nav" className="border-t border-[var(--rk-line)] bg-white px-4 pb-5 pt-2 lg:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--rk-line)] py-3.5 text-[1.05rem] text-[var(--rk-ink)]"
              >
                {t(l.key)}
              </a>
            ))}
            <Link href={LOGIN_HREF} className="py-3.5 text-[1.05rem] font-medium text-[var(--rk-green)]">
              {t("landing.signIn")}
            </Link>
          </nav>
          <LanguageSwitcher className="mt-2 sm:hidden" />
        </div>
      )}
    </header>
  );
}
