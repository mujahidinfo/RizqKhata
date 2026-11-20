"use client";

import Image from "next/image";
import { DOCS } from "./page-content";
import { ClosingBlock } from "./closing";
import { useLanding } from "./use-landing";

/** About: the name, the reason, the beliefs. No invented history or team. */
export function AboutPage() {
  const { language, num } = useLanding();
  const d = DOCS.about[language];
  const [name, why, beliefs, ...rest] = d.sections;

  return (
    <>
      <header className="mx-auto max-w-[76rem] px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <h1 className="rk-display max-w-[48rem] text-[clamp(2.3rem,5.4vw,4.25rem)] leading-[1.12] text-[var(--rk-ink)]">{d.title}</h1>
        <p className="mt-6 max-w-[42rem] text-[1.15rem] leading-[1.8] text-[var(--rk-muted)]">{d.lead}</p>
      </header>

      {/* The name, set on the logo green field with the mark. */}
      <section className="rk-on-green bg-[var(--rk-green)] text-white">
        <div className="mx-auto grid max-w-[76rem] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_auto]">
          <div className="max-w-[42rem]">
            <h2 className="rk-display text-[clamp(1.8rem,3.4vw,2.75rem)] leading-[1.15]">{name.heading}</h2>
            {name.body?.map((p) => (
              <p key={p} className="mt-5 text-[1.12rem] leading-[1.85] text-white/90">
                {p}
              </p>
            ))}
          </div>
          <div className="hidden rounded-[2rem] bg-white p-8 lg:block">
            <Image src="/logo-mark.png" alt="" width={512} height={401} className="h-36 w-auto" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[76rem] gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <h2 className="rk-display text-[clamp(1.8rem,3.4vw,2.75rem)] leading-[1.15] text-[var(--rk-ink)]">{why.heading}</h2>
        <div>
          {why.body?.map((p) => (
            <p key={p} className="mb-5 text-[1.08rem] leading-[1.85] text-[var(--rk-slate)] last:mb-0">
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="bg-[var(--rk-ground-2)] py-20 sm:py-28">
        <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
          <h2 className="rk-display text-[clamp(1.8rem,3.4vw,2.75rem)] leading-[1.15] text-[var(--rk-ink)]">{beliefs.heading}</h2>
          <ol className="mt-10 grid gap-x-12 md:grid-cols-2">
            {beliefs.bullets?.map((b, i) => {
              const [head, ...tail] = b.split(/(?<=[.।])\s/);
              return (
                <li key={b} className="flex gap-5 border-t border-[var(--rk-line)] py-7">
                  <span className="rk-display rk-num text-[1.5rem] leading-none text-[var(--rk-green)]">{num(i + 1)}</span>
                  <div>
                    <p className="rk-display text-[1.2rem] leading-snug text-[var(--rk-ink)]">{head}</p>
                    {tail.length > 0 && <p className="mt-2 text-[1rem] leading-[1.75] text-[var(--rk-muted)]">{tail.join(" ")}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-[76rem] gap-12 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-2">
        {rest.map((s) => (
          <div key={s.id}>
            <h2 className="rk-display text-[1.6rem] leading-snug text-[var(--rk-ink)]">{s.heading}</h2>
            {s.body?.map((p) => (
              <p key={p} className="mt-4 text-[1.05rem] leading-[1.8] text-[var(--rk-slate)]">
                {p}
              </p>
            ))}
          </div>
        ))}
      </section>

      <ClosingBlock />
    </>
  );
}
