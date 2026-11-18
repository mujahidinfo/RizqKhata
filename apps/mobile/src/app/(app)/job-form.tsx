import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateJob, useCustomerLookup } from '@/api/queries';
import type { PaymentMethod } from '@/api/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, ChipGroup, Segmented } from '@/components/choice';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayISO } from '@/lib/format';
import { useT, type TranslationKey } from '@/lib/i18n';

const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text.replace(/,/g, '')));

const ACCESSORIES: { key: string; label: TranslationKey }[] = [
  { key: 'charger', label: 'jobs.accessoryCharger' },
  { key: 'case', label: 'jobs.accessoryCase' },
  { key: 'sim', label: 'jobs.accessorySim' },
  { key: 'memory', label: 'jobs.accessoryMemory' },
  { key: 'box', label: 'jobs.accessoryBox' },
];

const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'];

/** `/job-form` — take in a device for repair (works offline). */
export default function JobFormScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const create = useCreateJob();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [lockCode, setLockCode] = useState('');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [condition, setCondition] = useState('');
  const [problem, setProblem] = useState('');
  const [estimate, setEstimate] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [promiseDays, setPromiseDays] = useState<number | null>(1);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCustomerLookup(phone);
  const known = lookup.data ?? null;
  const customerName = known?.name ?? name.trim();

  const estimateValue = toNumber(estimate);
  const advanceValue = toNumber(advance) ?? 0;
  const moneyOk =
    (estimateValue === undefined || (Number.isFinite(estimateValue) && estimateValue >= 0)) &&
    Number.isFinite(advanceValue) &&
    advanceValue >= 0;
  const valid = phone.trim().length >= 6 && customerName !== '' && problem.trim() !== '' && moneyOk;

  const toggleAccessory = (key: string) =>
    setAccessories((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const submit = async () => {
    if (!valid || create.isPending) return;
    setError(null);
    const device = [brand.trim(), model.trim()].filter(Boolean).join(' ');
    try {
      const result = await create.mutateAsync({
        ...(known ? { customerId: known.id } : { customer: { phone: phone.trim(), name: name.trim() } }),
        customerName,
        device,
        details: {
          ...(brand.trim() && { brand: brand.trim() }),
          ...(model.trim() && { model: model.trim() }),
          ...(imei.trim() && { imei: imei.trim() }),
          ...(lockCode.trim() && { lockCode: lockCode.trim() }),
          ...(accessories.length && {
            accessories: accessories.map((k) => t(ACCESSORIES.find((a) => a.key === k)!.label)).join(', '),
          }),
          ...(condition.trim() && { condition: condition.trim() }),
        },
        problem: problem.trim(),
        estimate: estimateValue,
        advance: advanceValue,
        advanceMethod: method,
        promisedAt: promiseDays === null ? undefined : dayISO(promiseDays),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      if (result.status === 'synced') router.push({ pathname: '/jobs/[id]', params: { id: result.data.id } });
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : t('jobs.couldNotSave'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
        <Card title={t('jobs.customer')}>
          <TextField label={t('jobs.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" autoFocus />
          {known ? (
            <ThemedText type="smallBold" themeColor="success">
              ✓ {t('jobs.knownCustomer')}: {known.name}
            </ThemedText>
          ) : (
            phone.trim().length >= 6 &&
            !lookup.isFetching && <TextField label={t('jobs.name')} value={name} onChangeText={setName} autoCapitalize="words" />
          )}
        </Card>

        <Card title={t('jobs.device')}>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('jobs.brand')} value={brand} onChangeText={setBrand} placeholder={t('jobs.brandPlaceholder')} autoCapitalize="words" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('jobs.model')} value={model} onChangeText={setModel} placeholder={t('jobs.modelPlaceholder')} />
            </View>
          </View>
          <TextField label={t('jobs.imei')} value={imei} onChangeText={setImei} keyboardType="number-pad" maxLength={17} />
          <TextField label={t('jobs.lockCode')} value={lockCode} onChangeText={setLockCode} autoCapitalize="none" />
          <ChipGroup label={t('jobs.accessories')}>
            {ACCESSORIES.map((a) => (
              <Chip key={a.key} label={t(a.label)} selected={accessories.includes(a.key)} onPress={() => toggleAccessory(a.key)} />
            ))}
          </ChipGroup>
          <TextField
            label={t('jobs.condition')}
            value={condition}
            onChangeText={setCondition}
            placeholder={t('jobs.conditionPlaceholder')}
          />
        </Card>

        <TextField
          label={t('jobs.problem')}
          value={problem}
          onChangeText={setProblem}
          placeholder={t('jobs.problemPlaceholder')}
          multiline
          style={{ minHeight: 80 }}
        />

        <Card title={t('jobs.money')}>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('jobs.estimate')} value={estimate} onChangeText={setEstimate} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('jobs.advance')} value={advance} onChangeText={setAdvance} keyboardType="decimal-pad" placeholder="0" />
            </View>
          </View>
          {advanceValue > 0 && (
            <Segmented
              options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
              value={method}
              onChange={setMethod}
            />
          )}
          <ChipGroup label={t('jobs.promised')}>
            <Chip label={t('common.today')} selected={promiseDays === 0} onPress={() => setPromiseDays(0)} />
            <Chip label={t('jobs.tomorrow')} selected={promiseDays === 1} onPress={() => setPromiseDays(1)} />
            <Chip label={t('jobs.inDays', { count: 3 })} selected={promiseDays === 3} onPress={() => setPromiseDays(3)} />
            <Chip label={t('jobs.noDate')} selected={promiseDays === null} onPress={() => setPromiseDays(null)} />
          </ChipGroup>
        </Card>

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
        <Button title={t('jobs.takeIn')} onPress={submit} loading={create.isPending} disabled={!valid} />
      </View>
    </KeyboardAvoidingView>
  );
}
