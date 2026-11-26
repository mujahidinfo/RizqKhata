import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAddShop, useDeleteShop } from '@/api/queries';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/lib/cart';
import { useActiveShop, useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import { confirmAction } from '@/lib/confirm';

/** Switch between branches (and businesses); owners can open a new branch. */
export default function BranchesScreen() {
  const theme = useTheme();
  const t = useT();
  const { workspaces, switchShop, refreshWorkspaces } = useSession();
  const active = useActiveShop();
  const cart = useCart();
  const addShop = useAddShop();
  const deleteShop = useDeleteShop();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isOwner = workspaces.find((w) => w.id === active.businessId)?.role === 'OWNER';

  const choose = async (shopId: string) => {
    if (shopId !== active.id) {
      // A sale belongs to one branch; don't carry a half-built cart across.
      cart.clear();
      await switchShop(shopId);
      void Haptics.selectionAsync();
    }
    router.back();
  };

  /** Owners close a branch of the business they're working in. */
  const confirmDelete = (shop: { id: string; name: string }) => {
    const current = shop.id === active.id;
    confirmAction({
      title: t('branches.deleteTitle', { name: shop.name }),
      message: [t('branches.deleteBody'), current ? t('branches.deleteCurrent') : null].filter(Boolean).join('\n\n'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setDeleteError(null);
        try {
          await deleteShop.mutateAsync(shop.id);
          // A sale belongs to one branch; don't carry a half-built cart across.
          if (current) cart.clear();
          await refreshWorkspaces();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          setDeleteError(e instanceof Error ? e.message : t('branches.couldNotDelete'));
        }
      },
    });
  };

  const create = async () => {
    setError(null);
    try {
      await addShop.mutateAsync({ name: name.trim(), phone: phone.trim() || undefined });
      await refreshWorkspaces();
      setAdding(false);
      setName('');
      setPhone('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('branches.couldNotAdd'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {deleteError && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {deleteError}
          </ThemedText>
        )}
        {workspaces.map((business) => (
          <Card key={business.id} title={`${business.name} · ${t(`roles.${business.role}`)}`}>
            {business.shops.map((s) => {
              const selected = s.id === active.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => choose(s.id)}
                  style={({ pressed }) => [
                    styles.shop,
                    { borderColor: selected ? theme.primary : theme.border },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{s.name}</ThemedText>
                    {s.address && (
                      <ThemedText type="caption" themeColor="textSecondary">
                        {s.address}
                      </ThemedText>
                    )}
                  </View>
                  {selected && (
                    <ThemedText type="smallBold" themeColor="primary">
                      {t('branches.current')}
                    </ThemedText>
                  )}
                  {business.role === 'OWNER' && business.id === active.businessId && business.shops.length > 1 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('branches.deleteA11y', { name: s.name })}
                      onPress={() => confirmDelete(s)}
                      disabled={deleteShop.isPending}
                      hitSlop={10}
                      style={({ pressed }) => ({ padding: Spacing.one, opacity: pressed ? 0.5 : 1 })}>
                      <Icon name="trash" size={18} color={theme.danger} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </Card>
        ))}

        {isOwner &&
          (adding ? (
            <Card title={t('branches.newBranch')}>
              <TextField
                label={t('branches.name')}
                value={name}
                onChangeText={setName}
                placeholder={t('branches.namePlaceholder')}
                autoFocus
                autoCapitalize="words"
              />
              <TextField
                label={t('branches.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <ThemedText type="caption" themeColor="textSecondary">
                {t('branches.sharesHint')}
              </ThemedText>
              {error && (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              )}
              <Button
                title={t('branches.add')}
                onPress={create}
                loading={addShop.isPending}
                disabled={!name.trim()}
              />
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setAdding(false)} />
            </Card>
          ) : (
            <Button title={t('branches.addABranch')} variant="secondary" onPress={() => setAdding(true)} />
          ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 56,
  },
});
