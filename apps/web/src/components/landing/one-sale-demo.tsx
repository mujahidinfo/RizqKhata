"use client";

import { useState } from "react";
import { BookOpen, Boxes, RotateCcw, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/language-context";
import { useLanding } from "./use-landing";

type Item = { id: string; key: TranslationKey; price: number; cost: number; stock: number; tint: string; ink: string };

const ITEMS: Item[] = [
  { id: "rice", key: "landing.itemRice", price: 390, cost: 352, stock: 14, tint: "#f3e7c9", ink: "#7a5a12" },
  { id: "oil", key: "landing.itemOil", price: 189, cost: 172, stock: 9, tint: "#fcefc2", ink: "#8a6a00" },
  { id: "lentil", key: "landing.itemLentil", price: 135, cost: 118, stock: 22, tint: "#f8dccd", ink: "#9a3f1c" },
  { id: "sugar", key: "landing.itemSugar", price: 130, cost: 121, stock: 6, tint: "#e6e9ef", ink: "#3e4651" },
  { id: "tea", key: "landing.itemTea", price: 220, cost: 188, stock: 11, tint: "#d9ecdf", ink: "#17694c" },
  { id: "soap", key: "landing.itemSoap", price: 55, cost: 44, stock: 30, tint: "#e3e0f5", ink: "#4b3f8f" },
];

const LOW_AT = 5;

const START = {
  stock: Object.fromEntries(ITEMS.map((i) => [i.id, i.stock])) as Record<string, number>,
  takings: 18640,
  sales: 42,
  visits: 17,
  saleNo: 1043,
};

type Last = { item: Item; n: number } | null;

/**
 * The page's memorable moment: one tap sells an item and four ledgers move
 * together. Changed values stay on screen and settle (a brief mint wash); they
 * never animate in from invisible.
 */
export function OneSaleDemo() {
  const { t, num, tk, digits } = useLanding();
  const [stock, setStock] = useState(START.stock);
  const [takings, setTakings] = useState(START.takings);
  const [sales, setSales] = useState(START.sales);
  const [visits, setVisits] = useState(START.visits);
  const [last, setLast] = useState<Last>(null);
  const [tick, setTick] = useState(0);

  const sell = (item: Item) => {
    if (stock[item.id] <= 0) return;
    const n = START.saleNo + (sales - START.sales);
    setStock((s) => ({ ...s, [item.id]: s[item.id] - 1 }));
    setTakings((v) => v + item.price);
    setSales((v) => v + 1);
    setVisits((v) => v + 1);
    setLast({ item, n });
    setTick((v) => v + 1);
  };

  const reset = () => {
    setStock(START.stock);
    setTakings(START.takings);
    setSales(START.sales);
    setVisits(START.visits);
    setLast(null);
    setTick((v) => v + 1);
  };

  const focus = last?.item ?? ITEMS[3];
  const left = stock[focus.id];
  const settle = tick > 0 && last ? "rk-settle" : "";
  // Before the first tap the khata shows the previous sale, so no panel rests empty.
  const entry = last ?? { item: ITEMS[4], n: START.saleNo - 1 };

  return (
    <section id="demo" className="scroll-mt-20 bg-[var(--rk-ground-2)] py-20 sm:py-28">
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
        <div className="max-w-[44rem]">
          <h2 className="rk-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] text-[var(--rk-ink)]">{t("landing.demoTitle")}</h2>
          <p className="mt-4 text-[1.05rem] leading-[1.75] text-[var(--rk-muted)]">{t("landing.demoSub")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-[1fr_1.15fr] lg:gap-5">
          {/* The counter — below the ledgers on phones so a tap and its effect share one screen. */}
          <div className="order-2 rounded-[1.75rem] bg-white p-3 shadow-[var(--rk-shadow)] ring-1 ring-[var(--rk-line)] sm:p-5 lg:order-1">
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-[0.95rem] font-semibold text-[var(--rk-ink)]">{t("landing.demoHint")}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--rk-ground-2)] px-2.5 py-1 text-[0.72rem] text-[var(--rk-muted)]">
                  {t("landing.demoData")}
                </span>
                <button
                  type="button"
                  onClick={reset}
                  disabled={!last}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-medium text-[var(--rk-green)] transition-colors hover:bg-[var(--rk-mint)] disabled:cursor-not-allowed disabled:text-[var(--rk-muted)] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <RotateCcw className="size-3.5" strokeWidth={2.25} />
                  {t("landing.demoReset")}
                </button>
              </div>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {ITEMS.map((item) => {
                const name = t(item.key);
                const s = stock[item.id];
                const out = s <= 0;
                const active = last?.item.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => sell(item)}
                      disabled={out}
                      className={cn(
                        "group flex h-full w-full flex-col items-start gap-2 rounded-2xl p-2.5 text-left sm:gap-3 sm:p-3 ring-1 transition-[box-shadow,transform,background-color] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "bg-[var(--rk-mint)] ring-2 ring-[var(--rk-green)]"
                          : "bg-white ring-[var(--rk-line)] hover:ring-[var(--rk-leaf)] hover:shadow-[0_6px_16px_-10px_rgba(15,67,50,0.5)]",
                      )}
                    >
                      <span
                        className="hidden size-10 place-items-center rounded-xl text-[0.95rem] font-bold sm:grid"
                        style={{ background: item.tint, color: item.ink }}
                        aria-hidden
                      >
                        {name.slice(0, 1)}
                      </span>
                      <span className="block">
                        <span className="block text-[0.8rem] font-medium leading-snug text-[var(--rk-ink)] sm:text-[0.88rem]">{name}</span>
                        <span className="rk-num mt-1 block text-[0.85rem] font-semibold text-[var(--rk-green-deep)]">{tk(item.price)}</span>
                      </span>
                      <span
                        className={cn(
                          "rk-num text-[0.74rem]",
                          s <= LOW_AT ? "font-medium text-[var(--rk-amber)]" : "text-[var(--rk-muted)]",
                        )}
                      >
                        {t("landing.panelStockLeft", { count: num(s) })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The four ledgers */}
          <div className="order-1 grid grid-cols-2 gap-2 sm:gap-3 lg:order-2">
            <p className="sr-only" aria-live="polite">
              {last ? t("landing.demoSold", { item: t(last.item.key) }) : ""}
            </p>

            <Panel icon={Boxes} title={t("landing.panelStock")}>
              <p className="truncate text-[0.88rem] text-[var(--rk-muted)]">{t(focus.key)}</p>
              <p key={`s${tick}`} className={cn("rk-display rk-num -mx-1 mt-1 rounded-lg px-1 text-[1.9rem] leading-tight sm:text-[2.4rem]", settle)}>
                {num(left)}
              </p>
              {left <= LOW_AT ? (
                <span className="mt-1 inline-flex self-start rounded-full bg-[#fdf3e1] px-2.5 py-1 text-[0.75rem] font-medium text-[var(--rk-amber)]">
                  {t("landing.panelLow")}
                </span>
              ) : (
                <span className="rk-num mt-1 block text-[0.78rem] text-[var(--rk-muted)]">{t("landing.panelReorder", { count: num(LOW_AT) })}</span>
              )}
            </Panel>

            <Panel icon={UserRound} title={t("landing.panelCustomer")}>
              <p className="truncate text-[0.95rem] font-semibold text-[var(--rk-ink)] sm:text-[1.02rem]">{t("landing.customerName")}</p>
              <p className="rk-num hidden text-[0.8rem] text-[var(--rk-muted)] sm:block">{digits("01711-452389")}</p>
              <p key={`c${tick}`} className={cn("rk-num -mx-1 mt-2 rounded-lg px-1 text-[0.88rem] font-medium text-[var(--rk-green-deep)] sm:mt-3 sm:text-[0.95rem]", settle)}>
                {t("landing.customerVisits", { count: num(visits) })}
              </p>
              <p className="truncate text-[0.8rem] text-[var(--rk-muted)]">
                {t("landing.customerLast", { item: last ? t(last.item.key) : t("landing.itemTea") })}
              </p>
            </Panel>

            <Panel icon={Wallet} title={t("landing.panelTakings")}>
              <p key={`t${tick}`} className={cn("rk-display rk-num -mx-1 mt-1 rounded-lg px-1 text-[1.45rem] leading-tight sm:text-[2.1rem]", settle)}>
                {tk(takings)}
              </p>
              <p className="rk-num mt-1 text-[0.8rem] text-[var(--rk-muted)]">{t("landing.takingsSales", { count: num(sales) })}</p>
            </Panel>

            <Panel icon={BookOpen} title={t("landing.panelKhata")}>
              <div key={`k${tick}`} className={cn("-mx-1 rounded-lg px-1", settle)}>
                <p className="rk-num text-[0.78rem] text-[var(--rk-muted)]">{t("landing.khataEntry", { n: digits(String(entry.n)) })}</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <p className="hidden truncate text-[0.9rem] text-[var(--rk-ink)] sm:block">{t(entry.item.key)}</p>
                  <p className="rk-num font-semibold text-[var(--rk-ink)]">{tk(entry.item.price)}</p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 border-t border-dashed border-[var(--rk-line)] pt-1.5 sm:mt-2 sm:pt-2">
                  <p className="text-[0.76rem] text-[var(--rk-muted)] sm:text-[0.8rem]">{t("landing.khataProfit")}</p>
                  <p className="rk-num text-[0.9rem] font-semibold text-[var(--rk-green)] sm:text-[0.95rem]">+{tk(entry.item.price - entry.item.cost)}</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-[1.25rem] bg-white p-3.5 ring-1 ring-[var(--rk-line)] sm:min-h-[11.5rem] sm:rounded-[1.5rem] sm:p-5">
      <p className="mb-2 flex items-center gap-2 text-[0.8rem] font-semibold text-[var(--rk-slate)] sm:mb-3 sm:text-[0.82rem]">
        <span className="grid size-6 place-items-center rounded-lg bg-[var(--rk-mint)] text-[var(--rk-green)] sm:size-7">
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}
