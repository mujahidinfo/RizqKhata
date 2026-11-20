import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeleteRecurring, useRecurringBills, useSaveRecurring } from '@/api/queries';
import type { PaymentMethod, RecurringBill, RecurringFrequency } from '@/api/types';
import { Button } from '@/components/button';
import { CategoryPicker } from '@/components/category-picker';
import { Chip, ChipGroup, Segmented } from '@/components/choice';
import { HeaderButton } from '@/components/header-button';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localeFor, useLanguage, useT, type Language } from '@/lib/i18n';

const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'];

/** Short weekday names, Sunday first, in the app language (7 Jan 2024 was a Sunday). */
const weekdays = (language: Language) =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(localeFor(language), { weekday: 'short' }));

/** Next date (local noon) whose day-of-month is `day`, today included. */
function nextMonthly(day: number) {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), day, 12);
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

/** Next date (local noon) that falls on weekday `weekday` (0 = Sunday), today included. */
function nextWeekly(weekday: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  return d;
}

const describe = (d: Date, language: Language) =>
  d.toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Add (`/recurring-form`) or edit (`/recurring-form?id=…`) a repeating bill. */
export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bills = useRecurringBills();
  if (!id) return <RecurringForm />;
  const bill = bills.data?.find((b) => b.id === id);
  if (!bill) return <QueryState isLoading={bills.isLoading} error={bills.error} />;
  return <RecurringForm bill={bill} />;
}

function RecurringForm({ bill }: { bill?: RecurringBill }) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const save = useSaveRecurring();
  const remove = useDeleteRecurring();

  const existingDue = bill ? new Date(bill.nextDueDate) : null;
  const [title, setTitle] = useState(bill?.title ?? '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(bill?.categoryId ?? null);
  const [frequency, setFrequency] = useState<RecurringFrequency>(bill?.frequency ?? 'MONTHLY');
  const [method, setMethod] = useState<PaymentMethod>(bill?.paymentMethod ?? 'CASH');
  const [day, setDay] = useState(String(existingDue?.getDate() ?? new Date().getDate()));
  const [weekday, setWeekday] = useState<number>(existingDue?.getDay() ?? new Date().getDay());
  // Editing keeps the current due date until the day/weekday is touched.
  const [dueTouched, setDueTouched] = useState(!bill);
  const [active, setActive] = useState(bill?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount.replace(/,/g, ''));
  const dayNum = Number(day);
  const dayOk = frequency === 'WEEKLY' || (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 28);
  const valid = title.trim().length > 0 && value > 0 && Number.isFinite(value) && !!categoryId && dayOk;

  const nextDue = !dueTouched && existingDue ? existingDue : frequency === 'WEEKLY' ? nextWeekly(weekday) : nextMonthly(dayOk ? dayNum : 1);

  const submit = async () => {
    if (!valid) return;
    setError(null);
    try {
      await save.mutateAsync({
        id: bill?.id,
        title: title.trim(),
        amount: value,
        categoryId: categoryId!,
        paymentMethod: method,
        frequency,
        nextDueDate: nextDue.toISOString(),
        ...(bill && { isActive: active }),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('recurringForm.couldNotSave'));
    }
  };

  const confirmDelete = () => {
    if (!bill) return;
    const go = async () => {
      try {
        await remove.mutateAsync(bill.id);
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenseForm.couldNotDelete'));
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert(t('recurringForm.stopTitle'), t('recurringForm.stopBody'), [
      { text: t('expenseForm.keep'), style: 'cancel' },
      { text: t('recurringForm.stop'), style: 'destructive', onPress: go },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: bill ? t('recurringForm.edit') : t('recurringForm.new'),
          headerRight: bill ? () => <HeaderButton title={t('recurringForm.stop')} tone="danger" onPress={confirmDelete} /> : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: Spacing.one }}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('recurringForm.amountEach')}
          </ThemedText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            autoFocus={!bill}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={t('expenseForm.amount')}
            style={{ fontSize: 40, fontWeight: 700, color: theme.text, borderBottomWidth: 2, borderColor: theme.border, paddingVertical: Spacing.one }}
          />
        </View>

        <TextField
          label={t('recurringForm.billName')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('recurringForm.namePlaceholder')} autoCapitalize="sentences" />

        <CategoryPicker value={categoryId} onChange={(id, name) => {
          setCategoryId(id);
          if (!title.trim()) setTitle(name);
        }} />

        <View style={{ gap: Spacing.two }}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('recurringForm.repeats')}
          </ThemedText>
          <Segmented
            options={[
              { value: 'MONTHLY', label: t('recurringForm.everyMonth') },
              { value: 'WEEKLY', label: t('recurringForm.everyWeek') },
            ]}
            value={frequency}
            onChange={(f) => {
              setFrequency(f);
              setDueTouched(true);
            }}
          />
        </View>

        {frequency === 'MONTHLY' ? (
          <TextField
            label={t('recurringForm.dayOfMonth')}
            value={day}
            onChangeText={(t) => {
              setDay(t.replace(/\D/g, '').slice(0, 2));
              setDueTouched(true);
            }}
            keyboardType="number-pad"
          />
        ) : (
          <ChipGroup label={t('recurringForm.dueEvery')}>
            {weekdays(language).map((name, i) => (
              <Chip
                key={name}
                label={name}
                selected={weekday === i}
                onPress={() => {
                  setWeekday(i);
                  setDueTouched(true);
                }}
              />
            ))}
          </ChipGroup>
        )}
        <ThemedText type="caption" themeColor="textSecondary">
          {t('recurringForm.nextDue', { date: describe(nextDue, language) })}
        </ThemedText>

        <View style={{ gap: Spacing.two }}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('recurringForm.usuallyPaidBy')}
          </ThemedText>
          <Segmented
            options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
            value={method}
            onChange={setMethod}
          />
        </View>

        {bill && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <View style={{ flex: 1 }}>
              <ThemedText>{t('recurringForm.remindersOn')}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {t('recurringForm.pauseHint')}
              </ThemedText>
            </View>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: theme.primary }} accessibilityLabel={t('recurringForm.remindersOn')} />
          </View>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View
        style={{
          padding: Spacing.three,
          paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          borderTopWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        }}>
        <Button title={bill ? t('common.save') : t('recurringForm.add')} onPress={submit} loading={save.isPending} disabled={!valid} />
      </View>
    </KeyboardAvoidingView>
  );
}
