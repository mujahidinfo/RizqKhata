"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CloudUpload, Loader2, ReceiptText, ShoppingBag, Truck, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanding } from "./use-landing";

const QUEUE = [
  { key: "landing.qSale", icon: ShoppingBag, amount: 1123 },
  { key: "landing.qExpense", icon: ReceiptText, amount: 2840 },
  { key: "landing.qStock", icon: Truck, amount: 2420 },
] as const;

type Mode = "offline" | "syncing" | "done";

/** The phone app's outbox, played forward: offline entries wait, then send one by one. */
export function OfflineSection() {
  const { t, num, tk } = useLanding();
  const [mode, setMode] = useState<Mode>("offline");
  const [sent, setSent] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const goOnline = () => {
    setMode("syncing");
    setSent(0);
    QUEUE.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setSent(i + 1);
          if (i === QUEUE.length - 1) setMode("done");
        }, 700 * (i + 1)),
      );
    });
  };

  const goOffline = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSent(0);
    setMode("offline");
  };

  const waiting = QUEUE.length - sent;

  return (
    <section id="offline" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[76rem] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        {/* Outbox */}
        <div className="order-2 lg:order-1">
          <div className="mx-auto max-w-[28rem] rounded-[1.75rem] bg-[var(--rk-ground-2)] p-3 ring-1 ring-[var(--rk-line)]">
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[0.9rem] font-medium transition-colors duration-500",
                mode === "offline" && "bg-[#fdf3e1] text-[#8a5a12]",
                mode === "syncing" && "bg-[var(--rk-mint)] text-[var(--rk-green-deep)]",
                mode === "done" && "bg-[var(--rk-green)] text-white",
              )}
              aria-live="polite"
            >
              {mode === "offline" && <WifiOff className="size-4.5" strokeWidth={2} />}
              {mode === "syncing" && <CloudUpload className="size-4.5" strokeWidth={2} />}
              {mode === "done" && <Check className="size-4.5" strokeWidth={2.5} />}
              <span className="rk-num">
                {mode === "offline" && t("landing.qOffline", { count: num(waiting) })}
                {mode === "syncing" && t("landing.qSyncing")}
                {mode === "done" && t("landing.qDone")}
              </span>
            </div>

            <ul className="mt-2 space-y-2">
              {QUEUE.map((q, i) => {
                const done = i < sent;
                const busy = mode === "syncing" && i === sent;
                const Icon = q.icon;
                return (
                  <li key={q.key} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-[var(--rk-line)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--rk-ground-2)] text-[var(--rk-slate)]">
                      <Icon className="size-[1.1rem]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.92rem] font-medium text-[var(--rk-ink)]">{t(q.key)}</span>
                      <span className="rk-num block text-[0.8rem] text-[var(--rk-muted)]">{tk(q.amount)}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.74rem] font-medium transition-colors duration-300",
                        done ? "bg-[var(--rk-mint)] text-[var(--rk-green)]" : "bg-[var(--rk-ground-2)] text-[var(--rk-muted)]",
                      )}
                    >
                      {done ? (
                        <Check className="size-3" strokeWidth={2.75} />
                      ) : busy ? (
                        <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />
                      ) : null}
                      {done ? t("landing.qSent") : t("landing.qWaiting")}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 pb-1 pt-3 text-[0.74rem] text-[var(--rk-muted)]">{t("landing.demoData")}</p>
          </div>
        </div>

        <div className="order-1 max-w-[34rem] lg:order-2">
          <h2 className="rk-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] text-[var(--rk-ink)]">{t("landing.offlineTitle")}</h2>
          <p className="mt-5 text-[1.05rem] leading-[1.8] text-[var(--rk-muted)]">{t("landing.offlineSub")}</p>
          <button
            type="button"
            onClick={mode === "offline" ? goOnline : goOffline}
            disabled={mode === "syncing"}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--rk-ink)] px-6 text-[0.98rem] font-medium text-white transition-colors hover:bg-[var(--rk-slate)] disabled:cursor-wait disabled:opacity-70"
          >
            {mode === "offline" ? <Wifi className="size-4" strokeWidth={2} /> : <WifiOff className="size-4" strokeWidth={2} />}
            {mode === "offline" ? t("landing.qGoOnline") : t("landing.qGoOffline")}
          </button>
          <p className="mt-4 text-[0.9rem] text-[var(--rk-muted)]">{t("landing.offlineBeta")}</p>
        </div>
      </div>
    </section>
  );
}
