"use client";

import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useLandingLanguage } from "@/lib/i18n/landing-language-context";
import { useTranslation } from "@/lib/i18n/language-context";

/**
 * Two-state segmented control. With two languages a dropdown is a click tax;
 * Bangla leads because it is the default.
 */
export function LanguageSwitcher({ className, tone = "light" }: { className?: string; tone?: "light" | "green" }) {
  const { language, setLanguage } = useLandingLanguage();
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("landing.languageLabel")}
      className={cn(
        "inline-flex items-center rounded-full p-0.5 text-[0.8rem] font-semibold",
        tone === "light" ? "bg-[var(--rk-ground-2)] ring-1 ring-[var(--rk-line)]" : "bg-white/10 ring-1 ring-white/25",
        className,
      )}
    >
      {[...LANGUAGES]
        .sort((a) => (a.code === "bn" ? -1 : 1))
        .map((lang) => {
          const on = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              lang={lang.code}
              aria-pressed={on}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "min-h-8 rounded-full px-3 transition-colors duration-200",
                tone === "light"
                  ? on
                    ? "bg-white text-[var(--rk-green-deep)] shadow-[0_1px_2px_rgba(15,67,50,0.15)]"
                    : "text-[var(--rk-muted)] hover:text-[var(--rk-ink)]"
                  : on
                    ? "bg-white text-[var(--rk-green-deep)]"
                    : "text-white/80 hover:text-white",
              )}
            >
              {lang.code === "bn" ? "বাংলা" : "EN"}
            </button>
          );
        })}
    </div>
  );
}
