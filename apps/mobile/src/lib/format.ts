import { useShop } from '@/api/queries';
import { getLanguage, localeFor, translate, useLanguage, type Translator } from '@/lib/i18n';

/*
 * Same locale rule as apps/web (lib/currency-context.tsx): Bangla gets bn-BD so
 * BDT renders as ৳ and dates use Bangla month names, with `-u-nu-latn` keeping
 * Western digits at the till. Dates follow the app language (lib/i18n).
 */

function makeFormatter(locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency });
  } catch {
    // Engines without full ICU data may reject the locale extension.
    return new Intl.NumberFormat('en-US', { style: 'currency', currency });
  }
}

/** Exact money formatting for the shop's currency. */
export function useFormatCurrency() {
  const { data: shop } = useShop();
  const language = useLanguage();
  const formatter = makeFormatter(localeFor(language), shop?.currency ?? 'BDT');
  return (amount: number) => formatter.format(amount);
}

/*
 * The date helpers take the component's `t` (from useT) as an optional last
 * argument: it carries the language, so a language switch re-runs them instead
 * of reusing a memoized result in the old language.
 */
type Lang = Pick<Translator, 'language'> | undefined;
const langOf = (tr: Lang) => tr?.language ?? getLanguage();

export function formatDateTime(iso: string, tr?: Lang) {
  return new Date(iso).toLocaleString(localeFor(langOf(tr)), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeDay(iso: string, tr?: Lang) {
  const language = langOf(tr);
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString(localeFor(language), { hour: 'numeric', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) return translate(language, 'format.todayAt', { time });
  if (date.toDateString() === yesterday.toDateString()) return translate(language, 'format.yesterdayAt', { time });
  return formatDateTime(iso, { language });
}

export const totalStock = (variants: { stock: number }[]) =>
  variants.reduce((sum, v) => sum + v.stock, 0);

export const isLowStock = (variants: { stock: number; lowStock: number }[]) =>
  variants.some((v) => v.stock <= v.lowStock);

/** "Today", "Yesterday" or "Mon, 27 Oct" — for headings that group a list by day. */
export function formatDayLabel(iso: string, tr?: Lang) {
  const language = langOf(tr);
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return translate(language, 'common.today');
  if (date.toDateString() === yesterday.toDateString()) return translate(language, 'common.yesterday');
  return date.toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Due today", "Due in 3 days", "2 days overdue" from a day count (negative = overdue). */
export function dueLabel(daysUntil: number, tr?: Lang) {
  const language = langOf(tr);
  if (daysUntil === 0) return translate(language, 'format.dueToday');
  if (daysUntil === 1) return translate(language, 'format.dueTomorrow');
  if (daysUntil > 1) return translate(language, 'format.dueIn', { count: daysUntil });
  return translate(language, 'format.overdue', { count: -daysUntil });
}

/** Local noon on the given offset from today, as ISO — noon so the date never shifts across time zones. */
export function dayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
