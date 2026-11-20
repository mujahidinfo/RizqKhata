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

// Sign-up and sign-in live in the Rizq Khata app (Expo web build), not on this site.
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
export const SIGNUP_HREF = `${APP_URL}/sign-up`;
export const LOGIN_HREF = `${APP_URL}/sign-in`;
