"use client";

import { Mail } from "lucide-react";
import { DOCS, LEGAL_UPDATED } from "./page-content";
import { useLanding } from "./use-landing";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/** Privacy policy and terms: a readable document with a section index. */
export function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const { t, language } = useLanding();
  const d = DOCS[doc][language];
  const updated = new Date(`${LEGAL_UPDATED}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <header className="border-b border-[var(--rk-line)] bg-[var(--rk-ground-2)]">
        <div className="mx-auto max-w-[76rem] px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
          <h1 className="rk-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[1.12] text-[var(--rk-ink)]">{d.title}</h1>
          <p className="mt-5 max-w-[44rem] text-[1.08rem] leading-[1.8] text-[var(--rk-muted)]">{d.lead}</p>
          <p className="mt-6 text-[0.9rem] font-medium text-[var(--rk-green)]">{t("landing.legalUpdated", { date: updated })}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[76rem] gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label={t("landing.legalContents")} className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-[0.82rem] font-semibold text-[var(--rk-ink)]">{t("landing.legalContents")}</p>
            <ol className="mt-3 space-y-1 border-l border-[var(--rk-line)]">
              {d.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.9rem] text-[var(--rk-muted)] transition-colors hover:border-[var(--rk-green)] hover:text-[var(--rk-green)]"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-[44rem]">
          {d.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-[var(--rk-line)] py-8 first:pt-0 last:border-0">
              <h2 className="rk-display text-[1.45rem] leading-snug text-[var(--rk-ink)]">{s.heading}</h2>
              {s.bullets && (
                <ul className="mt-4 space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-[1.02rem] leading-[1.75] text-[var(--rk-slate)]">
                      <span aria-hidden className="mt-[0.7rem] size-1.5 shrink-0 rounded-full bg-[var(--rk-green)]" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {s.body?.map((p) => (
                <p key={p} className="mt-4 text-[1.02rem] leading-[1.8] text-[var(--rk-slate)]">
                  {p}
                </p>
              ))}
            </section>
          ))}

          {CONTACT_EMAIL && (
            <section id="contact" className="mt-4 flex items-start gap-4 rounded-2xl bg-[var(--rk-mint)] p-5">
              <Mail className="mt-0.5 size-5 shrink-0 text-[var(--rk-green)]" strokeWidth={1.75} />
              <p className="text-[1rem] leading-relaxed text-[var(--rk-green-ink)]">
                {t("landing.legalContact")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>
          )}
        </article>
      </div>
    </>
  );
}
