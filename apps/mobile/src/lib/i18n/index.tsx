import { useQuery } from '@tanstack/react-query';
import Storage from 'expo-sqlite/kv-store';
import { createContext, use, useEffect, useLayoutEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Shop } from '@/api/types';
import { api } from '@/lib/api-client';
import { bn } from '@/lib/i18n/bn';
import { en, type Dictionary } from '@/lib/i18n/en';
import { useSession } from '@/lib/session';

/**
 * App language. Like the web dashboard, it's the business setting
 * (`shop.language`, changed in Profile): everyone in the shop sees the same
 * language. The last one used is remembered on the phone so sign-in and the
 * splash already speak it; on a first launch the phone's language decides.
 */
export type Language = 'en' | 'bn';
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

const DICTIONARIES: Record<Language, Dictionary> = { en, bn };
const STORAGE_KEY = 'rizq.language';

const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'bn';

function initialLanguage(): Language {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // No saved choice yet.
  }
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  return deviceLocale.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}

// Module-level copy so plain helpers (date formatting in lib/format.ts) follow
// the language too; the provider re-renders the tree whenever it changes.
let current: Language = initialLanguage();
export const getLanguage = () => current;

/** Locale for Intl: Bengali words with Western digits (same rule as money). */
export const localeFor = (language: Language = current) => (language === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US');

// ─── Lookup ──────────────────────────────────────────────────────────────────

type Plural = { one: string; other: string };
type Leaf = string | Plural;

/** Dot paths to every string, e.g. "checkout.charge"; checked at compile time. */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TranslationKey = Paths<Dictionary>;
export type Vars = Record<string, string | number>;

function lookup(language: Language, key: string): Leaf | undefined {
  let node: unknown = DICTIONARIES[language];
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node as Leaf | undefined;
}

/**
 * `t('cart.items', { count: 3 })` → "3 items". A `{ one, other }` entry picks
 * by `count`; `{name}` placeholders are filled from `vars`. Falls back to
 * English, then to the key, so a gap never shows a blank.
 */
export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const entry = lookup(language, key) ?? lookup('en', key);
  if (entry === undefined) return key;
  const text = typeof entry === 'string' ? entry : vars?.count === 1 ? entry.one : entry.other;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
}

/** A bound `t`, which also says its language (date helpers take it so they re-run on a switch). */
export type Translator = ((key: TranslationKey, vars?: Vars) => string) & { language: Language };

const makeTranslator = (language: Language): Translator =>
  Object.assign((key: TranslationKey, vars?: Vars) => translate(language, key, vars), { language });

/** Translate outside React (e.g. in a mutation); prefer `useT` in components. */
export const t = (key: TranslationKey, vars?: Vars) => translate(current, key, vars);

// ─── React ───────────────────────────────────────────────────────────────────

type LanguageState = { language: Language; setDeviceLanguage: (language: Language) => void };
const LanguageContext = createContext<LanguageState>({ language: current, setDeviceLanguage: () => {} });

export function LanguageProvider({ children }: PropsWithChildren) {
  const { status } = useSession();
  // Before sign-in (and until the shop has loaded) the phone's own choice applies.
  const [deviceLanguage, setDeviceLanguage] = useState<Language>(current);
  // Same cache entry as useShop(); only asked for once signed in.
  const shop = useQuery({
    queryKey: ['shop'],
    queryFn: () => api<Shop | null>('/shop'),
    staleTime: 5 * 60_000,
    enabled: status === 'ready',
  });
  const fromShop = shop.data?.language;
  const language: Language = status === 'ready' && isLanguage(fromShop) ? fromShop : deviceLanguage;

  // Plain helpers (t() outside components, default date formatting) read the
  // module copy; update it before paint. Components pass their `t` instead.
  useLayoutEffect(() => {
    current = language;
  }, [language]);

  useEffect(() => {
    try {
      Storage.setItemSync(STORAGE_KEY, language);
    } catch {
      // Not critical: next launch just falls back to the phone's language.
    }
  }, [language]);

  const value = useMemo(() => ({ language, setDeviceLanguage }), [language]);
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export const useLanguage = () => use(LanguageContext).language;

/**
 * Change the language on this phone only — for screens before sign-in. Once
 * signed in, the shop's setting (Profile → Language) decides.
 */
export const useSetDeviceLanguage = () => use(LanguageContext).setDeviceLanguage;

/** `const t = useT(); t('sell.charge')` — re-renders when the language changes. */
export function useT(): Translator {
  const language = useLanguage();
  return useMemo(() => makeTranslator(language), [language]);
}
