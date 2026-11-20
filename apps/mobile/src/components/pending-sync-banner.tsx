import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIsOnline } from '@/lib/network';
import { useSyncState, type OutboxKind } from '@/lib/outbox';
import { useT } from '@/lib/i18n';

/**
 * "2 sales saved offline": shown above a list while records of these kinds are
 * waiting in the outbox (they appear in the list itself once synced).
 */
export function PendingSyncBanner({ kinds, noun }: { kinds: OutboxKind[]; noun: [string, string] }) {
  const theme = useTheme();
  const t = useT();
  const online = useIsOnline();
  const { items, status } = useSyncState(online);
  const mine = items.filter((item) => kinds.includes(item.kind));
  if (mine.length === 0) return null;

  const failed = mine.some((item) => item.status === 'failed');
  const tint = failed ? theme.danger : theme.warning;
  const word = mine.length === 1 ? noun[0] : noun[1];
  const text = failed
    ? t('sync.bannerFailed', { count: mine.length, noun: word })
    : status === 'syncing'
      ? t('sync.bannerSyncing', { count: mine.length, noun: word })
      : t('sync.bannerWaiting', { count: mine.length, noun: word });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('sync.opensDetails')}
      onPress={() => router.push('/sync')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + 2,
        borderRadius: Radius.lg,
        borderCurve: 'continuous',
        backgroundColor: `${tint}1A`,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={failed ? 'cloudAlert' : 'cloudUpload'} size={18} color={tint} />
      <ThemedText type="smallBold" style={{ flex: 1, color: tint }}>
        {text}
      </ThemedText>
      <View>
        <Icon name="chevronRight" size={14} color={tint} />
      </View>
    </Pressable>
  );
}
