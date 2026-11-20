import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { Panel } from '@/components/panel';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, useFormatCurrency } from '@/lib/format';
import { useIsOnline } from '@/lib/network';
import {
  discardItem,
  retryItem,
  syncNow,
  useSyncState,
  type OutboxItem,
  type OutboxKind,
  type SyncStatus,
} from '@/lib/outbox';
import { useT, type Translator } from '@/lib/i18n';

const KIND_ICON: Record<OutboxKind, IconName> = {
  sale: 'bag',
  expense: 'wallet',
  billPayment: 'receipt',
  salary: 'team',
  supplierPayment: 'truck',
  stockIn: 'receive',
  repeatingBill: 'repeat',
  note: 'note',
  job: 'wrench',
  jobStatus: 'wrench',
  jobNote: 'note',
};

function timeAgo(iso: string | null, t: Translator) {
  if (!iso) return t('sync.notYet');
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return t('sync.justNow');
  if (minutes < 60) return t('sync.minAgo', { count: minutes });
  if (minutes < 24 * 60) return t('sync.hoursAgo', { count: Math.round(minutes / 60) });
  return formatDateTime(iso, t);
}

/** Sync sheet: connection, what's waiting, and what needs attention. */
export default function SyncScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const { status, pending, failed, lastSyncedAt } = useSyncState(online);

  const summary: Record<SyncStatus, { icon: IconName; tint: string; title: string; body: string }> = {
    synced: {
      icon: 'cloudDone',
      tint: theme.primary,
      title: t('sync.syncedTitle'),
      body: t('sync.syncedBody', { when: timeAgo(lastSyncedAt, t) }),
    },
    syncing: {
      icon: 'cloudSync',
      tint: theme.primary,
      title: t('sync.syncingTitle'),
      body: t('sync.syncingBody', { records: t('common.records', { count: pending.length }) }),
    },
    offline: {
      icon: 'cloudOff',
      tint: theme.textSecondary,
      title: t('sync.offlineTitle'),
      body: pending.length
        ? t('sync.offlineWaiting', { records: t('common.records', { count: pending.length }) })
        : t('sync.offlineEmpty'),
    },
    pending: {
      icon: 'cloudUpload',
      tint: theme.warning,
      title: t('sync.pendingTitle', { records: t('common.records', { count: pending.length }) }),
      body: t('sync.pendingBody'),
    },
    attention: {
      icon: 'cloudAlert',
      tint: theme.danger,
      title: t('sync.attentionTitle', { records: t('common.records', { count: failed.length }) }),
      body: t('sync.attentionBody'),
    },
  };
  const s = summary[status];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five + insets.bottom }}>
      <Panel>
        <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two }}>
          <IconTile name={s.icon} tint={s.tint} size={64} round />
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            {s.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {s.body}
          </ThemedText>
        </View>
        {pending.length > 0 && (
          <Button
            title={online ? t('sync.syncNow') : t('sync.waitingInternet')}
            onPress={() => void syncNow()}
            loading={status === 'syncing'}
            disabled={!online}
          />
        )}
      </Panel>

      {failed.length > 0 && (
        <Panel icon="cloudAlert" tint={theme.danger} title={t('sync.needsAttention')}>
          {failed.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </Panel>
      )}

      {pending.length > 0 && (
        <Panel icon="cloudUpload" tint={theme.warning} title={t('sync.waitingToSync')}>
          {pending.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </Panel>
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center', paddingHorizontal: Spacing.three }}>
        {t('sync.footer')}
      </ThemedText>
    </ScrollView>
  );
}

function ItemRow({ item }: { item: OutboxItem }) {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const failed = item.status === 'failed';

  const confirmDiscard = () =>
    Alert.alert(t('sync.discardTitle'), t('sync.discardBody', { title: item.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.discard'), style: 'destructive', onPress: () => discardItem(item.id) },
    ]);

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: Radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.backgroundSelected,
          }}>
          <Icon name={KIND_ICON[item.kind]} size={18} color={theme.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[item.detail, formatDateTime(item.createdAt, t)].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        {item.amount !== undefined && <ThemedText type="smallBold">{formatCurrency(item.amount)}</ThemedText>}
      </View>
      {failed && (
        <>
          <ThemedText type="caption" style={{ color: theme.danger }}>
            {item.error}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button title={t('common.tryAgain')} variant="secondary" style={{ flex: 1 }} onPress={() => retryItem(item.id)} />
            <Button title={t('common.discard')} variant="secondary" style={{ flex: 1 }} onPress={confirmDiscard} />
          </View>
        </>
      )}
    </View>
  );
}
