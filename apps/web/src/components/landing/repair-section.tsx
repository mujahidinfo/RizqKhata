"use client";

import { Check, CheckCheck, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanding } from "./use-landing";

const STATUSES = ["landing.stReceived", "landing.stRepair", "landing.stReady", "landing.stDelivered"] as const;
const CURRENT = 2; // Ready

const LINES = [
  { key: "landing.jobLineScreen", amount: 2400, warranty: 90 },
  { key: "landing.jobLineBattery", amount: 1150, warranty: 30 },
  { key: "landing.jobLineService", amount: 300, warranty: 0 },
] as const;
const ADVANCE = 2500;

/** Logo green owns this band the way a mobile-money brand owns its colour. */
export function RepairSection() {
  const { t, num, tk, digits } = useLanding();
  const total = LINES.reduce((s, l) => s + l.amount, 0);
  const due = total - ADVANCE;

  return (
    <section id="repair" className="rk-on-green scroll-mt-16 bg-[var(--rk-green)] text-white">
      <div className="mx-auto grid max-w-[76rem] items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.05fr]">
        <div className="max-w-[34rem]">
          <h2 className="rk-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15]">{t("landing.repairTitle")}</h2>
          <p className="mt-5 text-[1.05rem] leading-[1.8] text-white/85">{t("landing.repairSub")}</p>
          <ul className="mt-8 space-y-3.5">
            {(["landing.repairPoint1", "landing.repairPoint2", "landing.repairPoint3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3 text-[1rem] text-white">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[30rem]">
          {/* Job card */}
          <div className="rounded-[1.75rem] bg-white p-5 text-[var(--rk-ink)] shadow-[0_40px_80px_-30px_rgba(5,30,22,0.6)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--rk-mint)] text-[var(--rk-green)]">
                  <Smartphone className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rk-num text-[0.78rem] text-[var(--rk-muted)]">{t("landing.jobNo", { n: num(318) })}</p>
                  <p className="text-[1.02rem] font-semibold leading-tight">{t("landing.jobDevice")}</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--rk-ground-2)] px-2.5 py-1 text-[0.7rem] text-[var(--rk-muted)]">
                {t("landing.demoData")}
              </span>
            </div>
            <p className="mt-3 text-[0.9rem] text-[var(--rk-slate)]">{t("landing.jobProblem")}</p>

            {/* Status track */}
            <ol className="mt-5 grid grid-cols-4 gap-1.5">
              {STATUSES.map((s, i) => (
                <li key={s} className="min-w-0">
                  <span
                    className={cn(
                      "block h-1.5 rounded-full",
                      i <= CURRENT ? "bg-[var(--rk-green)]" : "bg-[var(--rk-line)]",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block truncate text-[0.72rem]",
                      i === CURRENT ? "font-semibold text-[var(--rk-green)]" : "text-[var(--rk-muted)]",
                    )}
                    aria-current={i === CURRENT ? "step" : undefined}
                  >
                    {t(s)}
                  </span>
                </li>
              ))}
            </ol>

            <ul className="mt-5 divide-y divide-[var(--rk-line)] border-y border-[var(--rk-line)]">
              {LINES.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9rem]">{t(l.key)}</span>
                    {l.warranty > 0 && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[0.72rem] text-[var(--rk-green)]">
                        <ShieldCheck className="size-3" strokeWidth={2.25} />
                        {t("landing.jobWarranty", { count: num(l.warranty) })}
                      </span>
                    )}
                  </span>
                  <span className="rk-num text-[0.92rem] font-medium">{tk(l.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 text-[0.88rem]">
              <div className="flex justify-between text-[var(--rk-muted)]">
                <span>{t("landing.jobAdvance")}</span>
                <span className="rk-num">−{tk(ADVANCE)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{t("landing.jobDue")}</span>
                <span className="rk-display rk-num text-[1.5rem]">{tk(due)}</span>
              </div>
            </div>
            <p className="mt-2 text-[0.78rem] text-[var(--rk-muted)]">{t("landing.jobPromised")}</p>
          </div>

          {/* WhatsApp ready message */}
          <div className="relative -mt-3 ml-auto w-[88%] rounded-2xl rounded-tr-md bg-[#dff5e3] p-3.5 text-[#10251b] shadow-[0_20px_40px_-20px_rgba(5,30,22,0.6)] sm:-mr-8 sm:w-[78%]">
            <p className="text-[0.74rem] font-semibold text-[var(--rk-green)]">{t("landing.waShop")}</p>
            <p className="mt-1 text-[0.88rem] leading-relaxed">{t("landing.waMessage", { amount: tk(due) })}</p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[0.68rem] text-[#4f6b5c]">
              <span className="rk-num">{digits("4:15")}</span>
              <CheckCheck className="size-3.5 text-[#34a7e0]" strokeWidth={2.25} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
