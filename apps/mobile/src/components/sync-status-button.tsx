import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { useIsOnline } from '@/lib/network';
import { useSyncState, type SyncStatus } from '@/lib/outbox';
import { useT } from '@/lib/i18n';

const SIZE = 36;

const ICON: Record<SyncStatus, IconName> = {
  synced: 'cloudDone',
  syncing: 'cloudSync',
  offline: 'cloudOff',
  pending: 'cloudUpload',
  attention: 'cloudAlert',
};

/** Top-bar sync status; opens the sync sheet. */
export function SyncStatusButton() {
  const theme = useTheme();
  const t = useT();
  const online = useIsOnline();
  const { status, pending, failed } = useSyncState(online);
  const waiting = pending.length + failed.length;

  const color = {
    synced: theme.primary,
    syncing: theme.primary,
    offline: theme.textSecondary,
    pending: theme.warning,
    attention: theme.danger,
  }[status];

  // Gentle pulse while syncing.
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (status === 'syncing' && !reduceMotion) {
      pulse.value = withRepeat(withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [status, reduceMotion, pulse]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Pressable
      onPress={() => router.push('/sync')}
      accessibilityRole="button"
      accessibilityLabel={
        waiting ? t('sync.statusWaiting', { status: t(`sync.status.${status}`), count: waiting }) : t(`sync.status.${status}`)
      }
      accessibilityHint={t('sync.opensDetails')}
      hitSlop={8}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
      <Animated.View style={iconStyle}>
        <Icon name={ICON[status]} size={19} color={color} weight="semibold" />
      </Animated.View>
      {waiting > 0 && (
        <View style={[styles.badge, { backgroundColor: status === 'attention' ? theme.danger : theme.warning }]}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {waiting > 99 ? '99+' : waiting}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
