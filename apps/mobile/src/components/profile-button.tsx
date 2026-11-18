import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SyncStatusButton } from '@/components/sync-status-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** Sync status + light/dark toggle + avatar in the top bar; the avatar opens Profile & settings. */
export function ProfileButton() {
  const { user } = useSession();
  const t = useT();
  // The header can render for a frame while signing out.
  if (!user) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <SyncStatusButton />
      <ThemeToggle />
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel={t('topBar.profileA11y')}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={36} />
      </Pressable>
    </View>
  );
}
