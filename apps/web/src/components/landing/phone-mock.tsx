"use client";

import { Minus, Plus, ScanLine, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanding } from "./use-landing";

const CART = [
  { key: "landing.itemRice", price: 390, qty: 1, tint: "#f3e7c9", ink: "#7a5a12" },
  { key: "landing.itemOil", price: 189, qty: 2, tint: "#fcefc2", ink: "#8a6a00" },
  { key: "landing.itemLentil", price: 135, qty: 1, tint: "#f8dccd", ink: "#9a3f1c" },
  { key: "landing.itemTea", price: 220, qty: 1, tint: "#d9ecdf", ink: "#17694c" },
] as const;

const PAYMENTS = ["landing.payCash", "landing.payMobile", "landing.payCard", "landing.payBank"] as const;

/**
 * The Sell screen of the phone app, drawn in code so it follows the page's
 * language and stays sharp at any density. Sample data only.
 */
export function PhoneMock({ className }: { className?: string }) {
  const { t, num, tk, digits } = useLanding();
  const total = CART.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div
      className={cn(
        "relative w-[17.5rem] rounded-[2.75rem] bg-[#151a20] p-[0.6rem] shadow-[var(--rk-shadow-lg)] sm:w-[19rem]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[2.2rem] bg-[var(--rk-ground-2)]">
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[0.68rem] font-semibold text-[var(--rk-ink)]">
          <span className="rk-num">{digits("10:42")}</span>
          <span className="h-[1.35rem] w-[5.2rem] rounded-full bg-[#151a20]" aria-hidden />
          <span className="inline-flex items-center gap-1 text-[var(--rk-green)]">
            <span className="size-1.5 rounded-full bg-[var(--rk-green)]" />
            {t("landing.phoneSynced")}
          </span>
        </div>

        <div className="px-4 pb-4 pt-2">
          <div className="flex items-baseline justify-between">
            <p className="rk-display text-[1.35rem] leading-tight text-[var(--rk-ink)]">{t("landing.phoneSell")}</p>
            <p className="text-[0.7rem] text-[var(--rk-muted)]">{t("landing.phoneShop")}</p>
          </div>

          <div className="mt-2.5 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[0.72rem] text-[var(--rk-muted)] ring-1 ring-[var(--rk-line)]">
            <Search className="size-3.5" strokeWidth={2} />
            <span className="flex-1 truncate">{t("landing.phoneSearch")}</span>
            <ScanLine className="size-4 text-[var(--rk-green)]" strokeWidth={2} />
          </div>

          <p className="mt-3.5 text-[0.7rem] font-semibold text-[var(--rk-muted)]">
            {t("landing.phoneCart")}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {CART.map((item) => {
              const name = t(item.key);
              return (
                <li key={item.key} className="flex items-center gap-2.5 rounded-2xl bg-white p-2 ring-1 ring-[var(--rk-line)]">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-[0.8rem] font-bold"
                    style={{ background: item.tint, color: item.ink }}
                    aria-hidden
                  >
                    {name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.74rem] font-medium leading-tight text-[var(--rk-ink)]">{name}</span>
                    <span className="rk-num block text-[0.68rem] text-[var(--rk-muted)]">{tk(item.price)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--rk-ground-2)] px-1 py-0.5">
                    <Minus className="size-3 text-[var(--rk-muted)]" strokeWidth={2.25} aria-hidden />
                    <span className="rk-num w-3 text-center text-[0.72rem] font-semibold">{num(item.qty)}</span>
                    <Plus className="size-3 text-[var(--rk-green)]" strokeWidth={2.25} aria-hidden />
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap gap-1">
            {PAYMENTS.map((p, i) => (
              <span
                key={p}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.64rem] font-medium",
                  i === 1 ? "bg-[var(--rk-green)] text-white" : "bg-white text-[var(--rk-slate)] ring-1 ring-[var(--rk-line)]",
                )}
              >
                {t(p)}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-[var(--rk-green)] px-4 py-3 text-white">
            <span className="text-[0.78rem] font-semibold">{t("landing.phoneCharge")}</span>
            <span className="rk-num rk-display text-[1.05rem]">{tk(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
