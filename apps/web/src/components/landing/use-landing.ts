"use client";

import { useTranslation } from "@/lib/i18n/language-context";

/**
 * Translation plus number/taka formatting for the landing page. Bangla shows
 * Bangla digits with lakh grouping; English keeps Latin digits, same grouping.
 */
export function useLanding() {
  const { t, language } = useTranslation();
  const locale = language === "bn" ? "bn-BD" : "en-IN";
  const num = (n: number) => n.toLocaleString(locale);
  const tk = (n: number) => `৳${num(n)}`;
  // For digit strings that are not quantities (phone numbers, times).
  const digits = (s: string) =>
    language === "bn" ? s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]) : s;
  return { t, language, num, tk, digits };
}

export const SIGNUP_HREF = "/signup";
export const LOGIN_HREF = "/login";
