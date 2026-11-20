"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock, Smartphone, WifiOff } from "lucide-react";
import { SIGNUP_HREF, useLanding } from "./use-landing";

const PLATFORMS = ["landing.appsAndroid", "landing.appsIos"] as const;

/**
 * Android and iOS apps: announced, not yet listed. Plain platform rows, not
 * store badges — a badge promises a download that does not exist yet.
 */
export function AppsComingSoon() {
  const { t } = useLanding();

  return (
    <section id="apps" className="scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative mx-auto grid max-w-[76rem] overflow-hidden rounded-[2rem] bg-[var(--rk-mint)] ring-1 ring-[var(--rk-mint-2)] sm:rounded-[2.5rem] lg:grid-cols-[1.2fr_1fr]">
        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16">
          <h2 className="rk-display max-w-[30rem] text-[clamp(1.8rem,3.4vw,2.75rem)] leading-[1.15] text-[var(--rk-green-ink)]">
            {t("landing.appsTitle")}
          </h2>
          <p className="mt-4 max-w-[32rem] text-[1.02rem] leading-[1.75] text-[#2f4a3e]">{t("landing.appsSub")}</p>

          <ul className="mt-8 flex flex-col gap-3 sm:flex-row">
            {PLATFORMS.map((p) => (
              <li
                key={p}
                className="flex min-w-[13rem] items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-[var(--rk-mint-2)]"
              >
                <Smartphone className="size-5 shrink-0 text-[var(--rk-green)]" strokeWidth={1.75} />
                <span className="flex-1 text-[1rem] font-semibold text-[var(--rk-ink)]">{t(p)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--rk-mint)] px-2.5 py-1 text-[0.74rem] font-medium text-[var(--rk-green)]">
                  <Clock className="size-3" strokeWidth={2.25} />
                  {t("landing.appsSoon")}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={SIGNUP_HREF}
            className="group mt-7 inline-flex items-center gap-1.5 text-[0.98rem] font-semibold text-[var(--rk-green)] underline decoration-[var(--rk-leaf)] underline-offset-4 hover:text-[var(--rk-green-deep)]"
          >
            {t("landing.appsWebNow")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
          </Link>
        </div>

        <ScanMock />
      </div>
    </section>
  );
}

/** The phone app's camera scanner — the one thing only the phone can do. */
function ScanMock() {
  const { t, tk, digits } = useLanding();
  return (
    <div className="relative hidden min-h-[24rem] lg:block" aria-hidden>
      <div className="absolute left-1/2 top-10 w-[17rem] -translate-x-1/2 rounded-[2.6rem] bg-[#151a20] p-[0.55rem] shadow-[var(--rk-shadow-lg)]">
        <div className="relative h-[23.5rem] overflow-hidden rounded-[2.1rem] bg-[#20272f]">
          <div className="flex items-center justify-between px-5 pt-3 text-[0.66rem] font-semibold text-white/80">
            <span className="rk-num">{digits("10:42")}</span>
            <span className="h-[1.3rem] w-[4.8rem] rounded-full bg-[#151a20]" />
            <span className="inline-flex items-center gap-1 text-[#f6c87a]">
              <WifiOff className="size-3" strokeWidth={2.5} />
            </span>
          </div>
          {/* Viewfinder with a barcode in frame */}
          <div className="mx-auto mt-7 grid h-32 w-48 place-items-center rounded-3xl border-2 border-white/80">
            <div className="flex h-14 items-stretch gap-[3px]">
              {[2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2].map((w, i) => (
                <span key={i} className="bg-white/90" style={{ width: w }} />
              ))}
            </div>
            <span className="absolute h-px w-48 bg-[var(--rk-leaf)] shadow-[0_0_10px_var(--rk-leaf)]" />
          </div>
          {/* Result sheet */}
          <div className="absolute inset-x-2 bottom-2 rounded-[1.6rem] bg-white p-4">
            <p className="rk-num text-[0.68rem] tracking-wider text-[var(--rk-muted)]">8 941100 512347</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-[0.95rem] font-semibold text-[var(--rk-ink)]">{t("landing.itemSugar")}</p>
              <p className="rk-num text-[0.95rem] font-semibold text-[var(--rk-green-deep)]">{tk(130)}</p>
            </div>
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-[var(--rk-mint)] px-3 py-2 text-[0.78rem] font-medium text-[var(--rk-green)]">
              <Check className="size-3.5" strokeWidth={2.75} />
              {t("landing.appsScanAdded")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
