import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { useShop, useUpdateShop, type ShopSettingsInput } from '@/api/queries';
import type { Shop } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { TINT } from '@/components/icon-tile';
import { QueryState } from '@/components/query-state';
import { SettingGroup, SettingRow } from '@/components/setting-row';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { currencyByCode } from '@/constants/currencies';
import { useTheme } from '@/hooks/use-theme';
import {
  AVATAR_WIDTH,
  pickProductPhoto,
  removeAvatarPhoto,
  uploadAvatarPhoto,
  type PhotoSource,
} from '@/lib/product-photo';
import { canManage } from '@/lib/roles';
import { useActiveShop, useCurrentUser, useSession } from '@/lib/session';
import { useIsOnline } from '@/lib/network';
import { useSyncState } from '@/lib/outbox';
import { LANGUAGES, useT } from '@/lib/i18n';
import { useBusinessType } from '@/lib/business';

/** You, your shop and its settings. Everyone can look; owners and managers can change. */
export default function ProfileScreen() {
  const theme = useTheme();
  const t = useT();
  const user = useCurrentUser();
  const active = useActiveShop();
  const { workspaces, signOut, updateUser } = useSession();
  const [photoBusy, setPhotoBusy] = useState(false);
  const shopQuery = useShop();
  const shop = shopQuery.data;
  const update = useUpdateShop();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const unsynced = useSyncState(useIsOnline()).items;
  const businessType = useBusinessType();
  // While editing tax: true = toggle just switched on and not saved yet.
  const [taxDraft, setTaxDraft] = useState(false);

  const manager = canManage(active.role);
  const branchCount = workspaces.reduce((n, w) => n + w.shops.length, 0);

  if (!shop) {
    return <QueryState isLoading={shopQuery.isLoading} error={shopQuery.error} onRetry={shopQuery.refetch} />;
  }

  const save = async (patch: ShopSettingsInput) => {
    setError(null);
    try {
      await update.mutateAsync(patch);
      if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.couldNotSave'));
      return false;
    }
  };

  const taxActive = shop.taxRate > 0;
  const taxOn = taxActive || taxDraft;
  const currency = currencyByCode(shop.currency);

  const toggleTax = async (on: boolean) => {
    if (on) return setTaxDraft(true);
    setTaxDraft(false);
    await save({ taxRate: 0 });
  };

  const changePhoto = async (source: PhotoSource) => {
    setError(null);
    try {
      const uri = await pickProductPhoto(source, AVATAR_WIDTH);
      if (!uri) return;
      setPhotoBusy(true);
      updateUser({ avatarUrl: await uploadAvatarPhoto(uri) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.couldNotUpdatePhoto'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setError(null);
    setPhotoBusy(true);
    try {
      await removeAvatarPhoto();
      updateUser({ avatarUrl: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.couldNotRemovePhoto'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const askPhotoSource = () => {
    if (photoBusy) return;
    const removable = Boolean(user.avatarUrl);
    if (process.env.EXPO_OS === 'ios') {
      const options = [
        t('newProduct.takePhoto'),
        t('newProduct.chooseLibrary'),
        ...(removable ? [t('newProduct.removePhoto')] : []),
        t('common.cancel'),
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: removable ? 2 : undefined },
        (index) => {
          if (index === 0) void changePhoto('camera');
          if (index === 1) void changePhoto('library');
          if (removable && index === 2) void removePhoto();
        },
      );
      return;
    }
    Alert.alert(t('profile.profilePhoto'), undefined, [
      { text: t('newProduct.takePhoto'), onPress: () => void changePhoto('camera') },
      { text: t('newProduct.chooseGallery'), onPress: () => void changePhoto('library') },
      ...(removable ? [{ text: t('common.remove'), style: 'destructive' as const, onPress: () => void removePhoto() }] : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  };

  const confirmSignOut = () => {
    const out = async () => {
      setSigningOut(true);
      await signOut();
    };
    // Alert.alert has no buttons on web.
    if (Platform.OS === 'web') return void out();
    const waiting = unsynced.length;
    const message = waiting
      ? t('profile.unsynced', { count: waiting })
      : t('profile.signOutBody');
    Alert.alert(t('profile.signOutTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: out },
    ]);
  };

  const editShop = manager ? () => router.push('/shop-form') : undefined;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six }}>
      {/* You */}
      <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          onPress={askPhotoSource}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={96} />
          {photoBusy && (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.35)',
              }}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primary,
              borderWidth: 3,
              borderColor: theme.background,
            }}>
            <Icon name="camera" size={14} color={theme.onPrimary} />
          </View>
        </Pressable>
        <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
          {user.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary" selectable>
          {user.email}
        </ThemedText>
        <Badge label={t(`roles.${active.role}`)} tone="primary" />
      </View>

      {/* Shop details */}
      <SettingGroup
        title={t('profile.shop')}
        footer={manager ? undefined : t('profile.managersOnly')}>
        <SettingRow icon="store" tint={TINT.indigo} title={t('profile.shopName')} value={shop.name} onPress={editShop} />
        <SettingRow icon="phone" tint={TINT.emerald} title={t('profile.phone')} value={shop.phone || t('profile.notSet')} onPress={editShop} />
        <SettingRow
          icon="pin"
          tint={TINT.rose}
          title={t('profile.address')}
          subtitle={shop.address || t('profile.notSet')}
          onPress={editShop}
        />
        {(shop.email || manager) && (
          <SettingRow icon="mail" tint={TINT.sky} title={t('profile.email')} value={shop.email || t('profile.notSet')} onPress={editShop} />
        )}
        {(branchCount > 1 || active.role === 'OWNER') && (
          <SettingRow
            icon="branches"
            tint={TINT.teal}
            title={t('profile.branch')}
            value={active.name}
            onPress={() => router.push('/branches')}
          />
        )}
      </SettingGroup>

      {/* Settings */}
      <SettingGroup title={t('profile.settings')}>
        <SettingRow
          icon="globe"
          tint={TINT.violet}
          title={t('profile.language')}
          subtitle={t('profile.languageHint')}
          right={
            manager ? (
              <LanguagePills value={shop.language} disabled={update.isPending} onChange={(language) => save({ language })} />
            ) : undefined
          }
          value={manager ? undefined : (LANGUAGES.find((l) => l.code === shop.language)?.label ?? shop.language)}
        />
        <SettingRow
          icon="wrench"
          tint={TINT.emerald}
          title={t('businessType.setting')}
          value={t(`businessType.${businessType}`)}
          onPress={manager ? () => router.push('/business-type') : undefined}
        />
        <SettingRow
          icon="currency"
          tint={TINT.amber}
          title={t('profile.currency')}
          value={currency ? `${currency.code} · ${currency.symbol}` : shop.currency}
          onPress={manager ? () => router.push('/currency') : undefined}
        />
        <SettingRow
          icon="percent"
          tint={TINT.rose}
          title={t('profile.tax')}
          subtitle={taxActive ? t('profile.taxAdded', { name: shop.taxName, rate: shop.taxRate }) : t('profile.taxNotAdded')}
          right={
            <Switch
              value={taxOn}
              onValueChange={toggleTax}
              disabled={!manager || update.isPending}
              trackColor={{ true: theme.primary }}
              accessibilityLabel={t('profile.addTaxA11y')}
            />
          }
        />
        {taxOn && manager && (
          <TaxEditor
            key={`${shop.taxRate}-${shop.taxName}`}
            initialRate={shop.taxRate}
            initialName={shop.taxName}
            saving={update.isPending}
            onSave={async (patch) => {
              if (await save(patch)) setTaxDraft(false);
            }}
          />
        )}
        <SettingRow
          icon="box"
          tint={TINT.sky}
          title={t('profile.sellBelowZero')}
          subtitle={
            shop.allowNegativeStock
              ? t('profile.neverBlocked')
              : t('profile.blockSale')
          }
          right={
            <Switch
              value={shop.allowNegativeStock}
              onValueChange={(allowNegativeStock) => void save({ allowNegativeStock })}
              disabled={!manager || update.isPending}
              trackColor={{ true: theme.primary }}
              accessibilityLabel={t('profile.sellBelowZero')}
            />
          }
        />
      </SettingGroup>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite" selectable style={{ paddingHorizontal: Spacing.three }}>
          {error}
        </ThemedText>
      )}

      {/* Account */}
      <SettingGroup title={t('profile.account')}>
        <SettingRow icon="lock" tint={TINT.slate} title={t('profile.changePassword')} onPress={() => router.push('/change-password')} />
        <SettingRow
          icon="logout"
          tint={theme.danger}
          title={signingOut ? t('profile.signingOut') : t('profile.signOut')}
          danger
          onPress={signingOut ? undefined : confirmSignOut}
        />
      </SettingGroup>

      <View style={{ alignItems: 'center', gap: 2 }}>
        <ThemedText type="caption" themeColor="textSecondary">
          Rizq Khata {Constants.expoConfig?.version ?? ''}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

/** Compact two-way language switch that sits inside a settings row. */
function LanguagePills({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (language: 'en' | 'bn') => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: Radius.sm + 2,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundSelected,
        opacity: disabled ? 0.6 : 1,
      }}>
      {LANGUAGES.map((l) => {
        const selected = l.code === value;
        return (
          <Pressable
            key={l.code}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => !selected && onChange(l.code)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: Radius.sm,
              borderCurve: 'continuous',
              backgroundColor: selected ? theme.backgroundElement : 'transparent',
              boxShadow: selected ? '0 1px 2px rgba(15, 23, 42, 0.12)' : undefined,
            }}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'} style={{ fontSize: 13 }}>
              {l.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Name and rate of the tax, shown under the switch while it is on. */
function TaxEditor({
  initialRate,
  initialName,
  saving,
  onSave,
}: {
  initialRate: number;
  initialName: string;
  saving: boolean;
  onSave: (patch: Pick<Shop, 'taxRate' | 'taxName'>) => void;
}) {
  const t = useT();
  const [rate, setRate] = useState(initialRate > 0 ? String(initialRate) : '');
  const [name, setName] = useState(initialName);

  const rateValue = Number(rate.replace(/,/g, ''));
  const valid = rate.trim() !== '' && Number.isFinite(rateValue) && rateValue >= 0 && rateValue <= 100 && name.trim().length > 0;
  const dirty = rateValue !== initialRate || name.trim() !== initialName;

  return (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <View style={{ flex: 2 }}>
          <TextField
            label={t('profile.taxName')}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.taxNamePlaceholder')} maxLength={30} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('profile.rate')}
            value={rate}
            onChangeText={setRate}
            placeholder="5"
            keyboardType="decimal-pad"
            autoFocus={initialRate === 0}
          />
        </View>
      </View>
      <Button
        title={initialRate > 0 ? t('profile.saveTax') : t('profile.addTax')}
        onPress={() => onSave({ taxRate: rateValue, taxName: name.trim() })}
        loading={saving}
        disabled={!valid || !dirty}
      />
    </View>
  );
}
