"use client";

import { ArrowDownRight, CalendarClock, MapPin, Repeat, ScanLine, StickyNote, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLandingLanguage } from "@/lib/i18n/landing-language-context";
import type { TranslationKey } from "@/lib/i18n/language-context";
import { useLanding } from "./use-landing";

const MONEY: { key: TranslationKey; src: TranslationKey; amount: number; tone: string }[] = [
  { key: "landing.mRent", src: "landing.srcBill", amount: 18000, tone: "bg-[#e8eefb] text-[#2f4f9a]" },
  { key: "landing.mSalary", src: "landing.srcSalary", amount: 12000, tone: "bg-[#f3e8fb] text-[#6a3f99]" },
  { key: "landing.mSupplier", src: "landing.srcSupplier", amount: 24500, tone: "bg-[#fdf0e1] text-[#8a5a12]" },
  { key: "landing.mPower", src: "landing.srcManual", amount: 2840, tone: "bg-[var(--rk-ground-2)] text-[var(--rk-slate)]" },
];

const LANG_CART: { key: TranslationKey; qty: number; price: number }[] = [
  { key: "landing.itemSugar", qty: 2, price: 130 },
  { key: "landing.itemTea", qty: 1, price: 220 },
];

export function FeaturesBento() {
  const { t, num, tk, digits } = useLanding();
  const { language, setLanguage } = useLandingLanguage();
  const total = MONEY.reduce((s, m) => s + m.amount, 0);

  return (
    <section id="features" className="scroll-mt-16 bg-[var(--rk-ground-2)] py-20 sm:py-28">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <h2 className="rk-display max-w-[40rem] text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] text-[var(--rk-ink)]">
          {t("landing.featuresTitle")}
        </h2>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-6">
          {/* Money out */}
          <Tile className="lg:col-span-4 lg:row-span-2">
            <TileHead title={t("landing.moneyTitle")} body={t("landing.moneySub")} />
            <ul className="mt-6 divide-y divide-[var(--rk-line)] rounded-2xl ring-1 ring-[var(--rk-line)]">
              {MONEY.map((m) => (
                <li key={m.key} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--rk-ground-2)] text-[var(--rk-slate)]">
                    {m.src === "landing.srcBill" ? (
                      <Repeat className="size-4" strokeWidth={1.9} />
                    ) : (
                      <ArrowDownRight className="size-4" strokeWidth={1.9} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.95rem] text-[var(--rk-ink)]">{t(m.key)}</span>
                  <span className={cn("hidden rounded-full px-2.5 py-1 text-[0.74rem] font-medium sm:inline", m.tone)}>{t(m.src)}</span>
                  <span className="rk-num w-[5.5rem] text-right text-[0.95rem] font-medium text-[var(--rk-ink)]">{tk(m.amount)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-[var(--rk-ground-2)] px-4 py-3.5">
                <span className="text-[0.9rem] font-medium text-[var(--rk-slate)]">{t("landing.mTotal")}</span>
                <span className="rk-display rk-num text-[1.35rem] text-[var(--rk-ink)]">{tk(total)}</span>
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[var(--rk-mint)] p-3.5 sm:px-4">
              <CalendarClock className="size-5 shrink-0 text-[var(--rk-green)]" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[0.92rem] text-[var(--rk-green-ink)]">
                {t("landing.mNext", { days: num(11) })}
              </span>
              <span className="rounded-full bg-[var(--rk-green)] px-3.5 py-1.5 text-[0.82rem] font-semibold text-white">{t("landing.mPay")}</span>
            </div>
            <p className="mt-3 text-[0.75rem] text-[var(--rk-muted)]">{t("landing.demoData")}</p>
          </Tile>

          {/* Branches & staff */}
          <Tile className="lg:col-span-2">
            <TileHead title={t("landing.branchTitle")} body={t("landing.branchSub")} />
            <div className="mt-5 flex flex-wrap gap-2">
              {(["landing.branchA", "landing.branchB"] as const).map((b, i) => (
                <span
                  key={b}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.85rem] font-medium",
                    i === 0 ? "bg-[var(--rk-green)] text-white" : "bg-[var(--rk-ground-2)] text-[var(--rk-slate)] ring-1 ring-[var(--rk-line)]",
                  )}
                >
                  <MapPin className="size-3.5" strokeWidth={2} />
                  {t(b)}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["landing.roleOwner", "landing.roleManager", "landing.roleCashier", "landing.roleStock"] as const).map((r) => (
                <span key={r} className="rounded-md bg-[var(--rk-mint)] px-2 py-1 text-[0.76rem] text-[var(--rk-green-deep)]">
                  {t(r)}
                </span>
              ))}
            </div>
          </Tile>

          {/* Customers & notes */}
          <Tile className="lg:col-span-2">
            <TileHead title={t("landing.custTitle")} body={t("landing.custSub")} />
            <div className="mt-5 rounded-2xl p-3.5 ring-1 ring-[var(--rk-line)]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--rk-mint-2)] text-[0.9rem] font-semibold text-[var(--rk-green-deep)]">
                  {t("landing.customerName").slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9rem] font-medium text-[var(--rk-ink)]">{t("landing.customerName")}</span>
                  <span className="rk-num block text-[0.76rem] text-[var(--rk-muted)]">{digits("01711-452389")}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[0.7rem] text-[var(--rk-muted)]">{t("landing.custDue")}</span>
                  <span className="rk-num block text-[0.9rem] font-semibold text-[var(--rk-amber)]">{tk(640)}</span>
                </span>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff8e1] px-3 py-2 text-[0.8rem] text-[#6b5210]">
                <StickyNote className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                {t("landing.custNote")}
              </p>
            </div>
          </Tile>

          {/* Stock */}
          <Tile className="lg:col-span-3">
            <TileHead title={t("landing.stockTitle")} body={t("landing.stockSub")} />
            <div className="mt-5 flex items-center gap-3 rounded-2xl p-3 ring-1 ring-[var(--rk-line)]">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--rk-ink)] text-white">
                <ScanLine className="size-5" strokeWidth={1.75} />
              </span>
              <span className="rk-num flex-1 font-mono text-[0.85rem] tracking-wider text-[var(--rk-slate)]">8 941100 512347</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {([["landing.itemSugar", 4], ["landing.itemOil", 5]] as const).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between rounded-xl bg-[#fdf6ea] px-3 py-2 text-[0.85rem]">
                  <span className="flex items-center gap-2 text-[var(--rk-ink)]">
                    <TriangleAlert className="size-3.5 text-[var(--rk-amber)]" strokeWidth={2.25} />
                    {t(k)}
                  </span>
                  <span className="rk-num font-medium text-[var(--rk-amber)]">{t("landing.panelStockLeft", { count: num(n) })}</span>
                </li>
              ))}
            </ul>
          </Tile>

          {/* Language: the same cart, flipped between scripts by a live control */}
          <Tile className="bg-[var(--rk-green)] text-white ring-0 lg:col-span-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-[22rem]">
                <h3 className="rk-display text-[1.35rem] leading-snug">{t("landing.langTitle")}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">{t("landing.langSub")}</p>
              </div>
              <div role="group" aria-label={t("landing.languageLabel")} className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/25">
                {(["bn", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    lang={l}
                    aria-pressed={language === l}
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "min-h-10 rounded-full px-4 text-[0.9rem] font-semibold transition-colors",
                      language === l ? "bg-white text-[var(--rk-green-deep)]" : "text-white/85 hover:text-white",
                    )}
                  >
                    {l === "bn" ? "বাংলা" : "English"}
                  </button>
                ))}
              </div>
            </div>
            <div key={language} className="rk-rise mt-6 rounded-2xl bg-white p-3 text-[var(--rk-ink)]">
              {LANG_CART.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 border-b border-[var(--rk-line)] px-1.5 py-2.5 text-[0.92rem]">
                  <span className="min-w-0 truncate">{t(row.key)}</span>
                  <span className="rk-num shrink-0 text-[var(--rk-muted)]">× {num(row.qty)}</span>
                  <span className="rk-num w-[4.5rem] shrink-0 text-right font-medium">{tk(row.price * row.qty)}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--rk-green)] px-3.5 py-2.5 text-white">
                <span className="text-[0.88rem] font-semibold">{t("landing.phoneCharge")}</span>
                <span className="rk-display rk-num text-[1.1rem]">{tk(LANG_CART.reduce((x, r) => x + r.price * r.qty, 0))}</span>
              </div>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("min-w-0 rounded-[1.75rem] bg-white p-6 ring-1 ring-[var(--rk-line)] sm:p-7", className)}>{children}</div>;
}

function TileHead({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h3 className="rk-display text-[1.35rem] leading-snug text-[var(--rk-ink)]">{title}</h3>
      <p className="mt-2 max-w-[36rem] text-[0.95rem] leading-relaxed text-[var(--rk-muted)]">{body}</p>
    </>
  );
}
