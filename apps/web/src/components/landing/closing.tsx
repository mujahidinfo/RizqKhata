"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LOGIN_HREF, SIGNUP_HREF, useLanding } from "./use-landing";

const STEPS = [
  { title: "landing.step1", body: "landing.step1Body" },
  { title: "landing.step2", body: "landing.step2Body" },
  { title: "landing.step3", body: "landing.step3Body" },
] as const;

export function StartSteps() {
  const { t, num } = useLanding();
  return (
    <section id="start" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <h2 className="rk-display max-w-[36rem] text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] text-[var(--rk-ink)]">
          {t("landing.stepsTitle")}
        </h2>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="absolute left-5 right-5 top-5 hidden h-px bg-[var(--rk-line)] md:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="rk-display rk-num relative grid size-10 place-items-center rounded-full bg-[var(--rk-green)] text-[1.05rem] text-white ring-8 ring-white">
                {num(i + 1)}
              </span>
              <h3 className="rk-display mt-5 text-[1.3rem] text-[var(--rk-ink)]">{t(s.title)}</h3>
              <p className="mt-2 max-w-[22rem] text-[0.98rem] leading-relaxed text-[var(--rk-muted)]">{t(s.body)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The close owns a full logo-green band, edge to edge, like the repair section. */
export function ClosingBlock() {
  const { t } = useLanding();
  return (
    <section className="rk-on-green relative overflow-hidden bg-[var(--rk-green)] text-white">
      <svg
        aria-hidden
        viewBox="0 0 600 600"
        className="pointer-events-none absolute -bottom-40 right-[-8rem] h-[38rem] w-[38rem] text-[var(--rk-green-deep)] opacity-70 sm:right-[-2rem]"
      >
        <path d="M40 470 L230 300 L320 380 L560 130" fill="none" stroke="currentColor" strokeWidth="64" />
        <path d="M470 110 L585 110 L585 225 Z" fill="currentColor" />
      </svg>
      <div className="relative mx-auto max-w-[76rem] px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-[38rem]">
          <h2 className="rk-display text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.12]">{t("landing.closeTitle")}</h2>
          <p className="mt-5 text-[1.08rem] leading-relaxed text-white/85">{t("landing.closeSub")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={SIGNUP_HREF}
              className="group inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-white px-7 text-[1.05rem] font-semibold text-[var(--rk-green-deep)] transition-colors hover:bg-[var(--rk-mint)]"
            >
              {t("landing.startFree")}
              <ArrowRight className="size-[1.1rem] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full px-6 text-[1.02rem] font-medium text-white ring-1 ring-white/35 transition-colors hover:bg-white/10"
            >
              {t("landing.signIn")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const { t } = useLanding();
  const link = "transition-colors hover:text-[var(--rk-green)]";
  return (
    <footer className="mx-auto max-w-[76rem] px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/" aria-label="Rizq Khata">
            <Image src="/logo-wordmark.png" alt="Rizq Khata" width={1200} height={261} className="h-8 w-auto" />
          </Link>
          <p className="mt-3 max-w-[22rem] text-[0.92rem] text-[var(--rk-muted)]">{t("landing.footerTagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-[0.95rem] text-[var(--rk-slate)]">
          <nav aria-label={t("landing.footerProduct")} className="flex flex-col gap-2.5">
            <p className="text-[0.82rem] font-semibold text-[var(--rk-ink)]">{t("landing.footerProduct")}</p>
            <a href="/#features" className={link}>{t("landing.navFeatures")}</a>
            <a href="/#repair" className={link}>{t("landing.navRepair")}</a>
            <a href="/#apps" className={link}>{t("landing.navApps")}</a>
            <Link href={LOGIN_HREF} className={link}>{t("landing.signIn")}</Link>
          </nav>
          <nav aria-label={t("landing.footerCompany")} className="flex flex-col gap-2.5">
            <p className="text-[0.82rem] font-semibold text-[var(--rk-ink)]">{t("landing.footerCompany")}</p>
            <Link href="/about" className={link}>{t("landing.navAbout")}</Link>
            <Link href="/privacy" className={link}>{t("landing.navPrivacy")}</Link>
            <Link href="/terms" className={link}>{t("landing.navTerms")}</Link>
          </nav>
        </div>
      </div>
      <p className="mt-10 border-t border-[var(--rk-line)] pt-6 text-[0.85rem] text-[var(--rk-muted)]">
        {t("landing.footerRights", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
