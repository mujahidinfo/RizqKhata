import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BusinessType } from '@/api/types';
import { AuthScreen } from '@/components/auth-screen';
import { BusinessTypePicker } from '@/components/business-type-picker';
import { Button } from '@/components/button';
import { HeaderButton } from '@/components/header-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser, useSession } from '@/lib/session';
import { useLanguage, useT } from '@/lib/i18n';

const CURRENCIES = [
  { code: 'BDT', label: '৳ BDT' },
  { code: 'INR', label: '₹ INR' },
  { code: 'PKR', label: '₨ PKR' },
  { code: 'USD', label: '$ USD' },
];

/** One screen from sign-up to selling: name the shop, pick currency, go. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { createBusiness, signOut } = useSession();
  const t = useT();
  const language = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [businessType, setBusinessType] = useState<BusinessType>('RETAIL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // The shop starts in the language they set up the app in.
      await createBusiness({
        name: name.trim(),
        phone: phone.trim() || undefined,
        currency,
        language,
        businessType,
        // Release 1 has one template; a repair shop starts with its price list.
        ...(businessType !== 'RETAIL' && { serviceTemplate: 'mobile_repair' as const }),
      });
      // The guard opens the app on the Sell tab.
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.couldNotCreate'));
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('onboarding.welcome', { name: user.name.split(' ')[0] })}
      subtitle={t('onboarding.subtitle')}
      footer={
        <View style={styles.footer}>
          <HeaderButton title={t('onboarding.otherAccount')} onPress={signOut} />
        </View>
      }>
      <TextField
        label={t('onboarding.shopName')}
        value={name}
        onChangeText={setName}
        placeholder={t('onboarding.shopNamePlaceholder')}
        autoCapitalize="words"
        autoFocus
        returnKeyType="next"
      />
      <TextField
        label={t('onboarding.shopPhone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder={t('onboarding.phonePlaceholder')}
      />
      <BusinessTypePicker value={businessType} onChange={setBusinessType} />
      <View style={styles.currency}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('onboarding.currency')}
        </ThemedText>
        <View style={styles.options}>
          {CURRENCIES.map((c) => {
            const selected = c.code === currency;
            return (
              <Pressable
                key={c.code}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCurrency(c.code)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? theme.primary : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
                  {c.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button title={t('onboarding.start')} onPress={onSubmit} loading={submitting} disabled={!name.trim()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  currency: {
    gap: Spacing.one,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  footer: {
    alignItems: 'center',
  },
});
