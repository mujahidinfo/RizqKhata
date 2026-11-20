"use client";

import Link from "next/link";
import { ArrowRight, Banknote, Check, Languages, Store, WifiOff } from "lucide-react";
import { PhoneMock } from "./phone-mock";
import { SIGNUP_HREF, useLanding } from "./use-landing";

export function Hero() {
  const { t, tk, digits } = useLanding();

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-[76rem] items-center gap-12 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-20 lg:pt-16">
        <div className="max-w-[36rem]">
          <h1 className="rk-display text-[clamp(2.35rem,5.4vw,4.4rem)] leading-[1.12] text-[var(--rk-ink)]">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.08rem] leading-[1.75] text-[var(--rk-muted)] sm:text-[1.15rem]">
            {t("landing.heroSub")}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={SIGNUP_HREF}
              className="group inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-[var(--rk-green)] px-7 text-[1.05rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(23,105,76,0.7)] transition-[background-color,transform] duration-200 hover:bg-[var(--rk-green-deep)] active:translate-y-px"
            >
              {t("landing.startFree")}
              <ArrowRight className="size-[1.1rem] transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
            </Link>
            <a
              href="#demo"
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full px-6 text-[1.02rem] font-medium text-[var(--rk-green-deep)] ring-1 ring-[var(--rk-line)] transition-colors hover:bg-[var(--rk-mint)] hover:ring-[var(--rk-mint-2)]"
            >
              {t("landing.heroSecondary")}
            </a>
          </div>
          <p className="mt-5 text-[0.9rem] text-[var(--rk-muted)]">{t("landing.heroNote")}</p>
        </div>

        {/* The colour field: logo green owns this half of the first screen. */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--rk-green)] px-6 pb-0 pt-10 sm:rounded-[2.5rem] sm:pt-12">
            <svg
              aria-hidden
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -right-24 -top-16 h-[34rem] w-[34rem] text-[var(--rk-green-deep)] opacity-60"
            >
              <path d="M40 470 L230 300 L320 380 L560 130" fill="none" stroke="currentColor" strokeWidth="64" strokeLinejoin="miter" />
              <path d="M470 110 L585 110 L585 225 Z" fill="currentColor" />
            </svg>
            <span className="absolute left-5 top-4 rounded-full bg-white/12 px-2.5 py-1 text-[0.7rem] font-medium text-white/85 ring-1 ring-white/20">
              {t("landing.demoData")}
            </span>

            <div className="relative flex justify-center sm:justify-end sm:pr-6 xl:pr-14">
              <PhoneMock className="translate-y-6" />
            </div>
          </div>

          {/* The receipt for the cart on the phone: what one sale wrote. */}
          <div className="absolute -left-10 top-[38%] hidden w-[14rem] xl:-left-16 rounded-2xl bg-white p-4 shadow-[var(--rk-shadow)] ring-1 ring-[var(--rk-line)] sm:block">
            <div className="flex items-baseline justify-between gap-2">
              <p className="rk-num text-[0.88rem] font-semibold text-[var(--rk-ink)]">{t("landing.khataEntry", { n: digits("1043") })}</p>
              <p className="rk-num text-[0.88rem] font-semibold text-[var(--rk-ink)]">{tk(1123)}</p>
            </div>
            <p className="mt-0.5 text-[0.76rem] text-[var(--rk-muted)]">
              {t("landing.customerName")} · {t("landing.payMobile")}
            </p>
            <ul className="mt-3 space-y-1.5 border-t border-dashed border-[var(--rk-line)] pt-3 text-[0.78rem] text-[var(--rk-slate)]">
              {(["landing.receiptStock", "landing.receiptCustomer", "landing.receiptKhata"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="grid size-4 place-items-center rounded-full bg-[var(--rk-mint)] text-[var(--rk-green)]">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Facts that are true of the product, not borrowed proof. */}
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <ul className="grid grid-cols-1 divide-y divide-[var(--rk-line)] rounded-2xl ring-1 ring-[var(--rk-line)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {[
            { icon: Banknote, key: "landing.factPay" },
            { icon: Languages, key: "landing.factLang" },
            { icon: WifiOff, key: "landing.factOffline" },
            { icon: Store, key: "landing.factBranches" },
          ].map(({ icon: Icon, key }, i) => (
            <li
              key={key}
              className={
                "flex items-center gap-3 px-5 py-4 text-[0.95rem] text-[var(--rk-slate)] " +
                (i > 1 ? "sm:border-t sm:border-[var(--rk-line)] lg:border-t-0 " : "") +
                (i % 2 === 1 ? "sm:border-l sm:border-[var(--rk-line)] lg:border-l-0" : "")
              }
            >
              <Icon className="size-5 shrink-0 text-[var(--rk-green)]" strokeWidth={1.75} />
              {t(key as Parameters<typeof t>[0])}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
