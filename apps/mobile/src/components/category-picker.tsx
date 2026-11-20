import { useState } from 'react';

import { useCreateExpenseCategory, useExpenseCategories } from '@/api/queries';
import { Chip, ChipGroup } from '@/components/choice';
import { ThemedText } from '@/components/themed-text';
import { translate, useT } from '@/lib/i18n';

/** Offered until the business has its own categories; created on first use. */
const SUGGESTED = [
  { key: 'rent', color: '#6366f1' },
  { key: 'bills', color: '#f59e0b' },
  { key: 'internet', color: '#0ea5e9' },
  { key: 'salary', color: '#10b981' },
  { key: 'transport', color: '#3b82f6' },
  { key: 'supplies', color: '#8b5cf6' },
  { key: 'other', color: '#64748b' },
] as const;

/**
 * Expense category chips. Suggested categories the business doesn't have yet show
 * as "+ Name" and are created the moment they're tapped.
 */
export function CategoryPicker({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string | null;
  onChange: (categoryId: string, name: string) => void;
}) {
  const categories = useExpenseCategories();
  const t = useT();
  const create = useCreateExpenseCategory();
  const [error, setError] = useState<string | null>(null);

  const existing = categories.data ?? [];
  // Suggestions are created in the app's language; skip any the shop already has in either language.
  const suggestions = SUGGESTED.map((s) => ({ name: t(`categories.suggested.${s.key}`), color: s.color, key: s.key })).filter(
    (s) =>
      !existing.some((c) =>
        [s.name, translate('en', `categories.suggested.${s.key}`), translate('bn', `categories.suggested.${s.key}`)].some(
          (n) => n.toLowerCase() === c.name.toLowerCase(),
        ),
      ),
  );

  const pick = async (s: { name: string; color: string }) => {
    setError(null);
    try {
      const created = await create.mutateAsync({ name: s.name, color: s.color });
      onChange(created.id, created.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('categories.couldNotAdd'));
    }
  };

  return (
    <>
      <ChipGroup label={label ?? t('categories.for')}>
        {existing.map((c) => (
          <Chip key={c.id} label={c.name} selected={c.id === value} onPress={() => onChange(c.id, c.name)} />
        ))}
        {suggestions.map((s) => (
          <Chip key={s.key} label={`+ ${s.name}`} selected={false} onPress={() => pick(s)} />
        ))}
      </ChipGroup>
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </>
  );
}
