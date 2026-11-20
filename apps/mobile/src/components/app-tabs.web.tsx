import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, WideLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWideLayout } from '@/hooks/use-wide-layout';
import { useBusinessType } from '@/lib/business';
import { useT } from '@/lib/i18n';

type Tab = { name: string; href: '/' | '/jobs' | '/dashboard' | '/products' | '/orders' | '/more'; label: string; icon: IconName; hidden?: boolean };

/**
 * Web version of the tab bar (iOS/Android use NativeTabs in app-tabs.tsx).
 * Same tabs, labels and order as the phone app, following the business type.
 *   narrow window (phone browser)  → bottom tab bar, like the native app
 *   wide window (desktop browser)  → left sidebar, content centred
 */
export default function AppTabs() {
  const wide = useWideLayout();
  const theme = useTheme();
  const t = useT();
  const type = useBusinessType();
  const services = type !== 'RETAIL';

  const sell: Tab = { name: '(sell)', href: '/', label: t('tabs.sell'), icon: 'scan' };
  const jobs: Tab = { name: 'jobs', href: '/jobs', label: t('tabs.jobs'), icon: 'wrench', hidden: !services };
  const today: Tab = { name: 'dashboard', href: '/dashboard', label: t('tabs.today'), icon: 'trend' };
  const catalog: Tab = {
    name: 'products',
    href: '/products',
    label: type === 'SERVICE' ? t('tabs.services') : type === 'HYBRID' ? t('tabs.catalog') : t('tabs.products'),
    icon: 'box',
  };
  // Orders stays reachable for service businesses (from More), just not in the bar.
  const orders: Tab = { name: 'orders', href: '/orders', label: t('tabs.orders'), icon: 'receipt', hidden: services };
  const more: Tab = { name: 'more', href: '/more', label: t('tabs.more'), icon: 'more' };
  const tabs = type === 'SERVICE' ? [jobs, sell, today, catalog, orders, more] : [sell, jobs, today, catalog, orders, more];

  const list = (
    <TabList asChild>
      <NavBar wide={wide}>
        {tabs.map((tab) => (
          // Hidden tabs keep their trigger: the route must stay registered.
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <NavItem wide={wide} label={tab.label} icon={tab.icon} hidden={tab.hidden} />
          </TabTrigger>
        ))}
      </NavBar>
    </TabList>
  );

  return (
    <Tabs style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: theme.background }}>
      {wide && list}
      <View style={styles.main}>
        <TabSlot style={wide ? styles.wideSlot : styles.slot} />
      </View>
      {!wide && list}
    </Tabs>
  );
}

function NavBar({ wide, children, ...props }: { wide: boolean; children?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (wide) {
    return (
      <View
        {...props}
        accessibilityRole="tablist"
        style={[styles.sidebar, { backgroundColor: theme.backgroundElement, borderRightColor: theme.border }]}>
        <View style={styles.brand}>
          <BrandLogo height={30} />
        </View>
        {children}
      </View>
    );
  }
  return (
    <View
      {...props}
      accessibilityRole="tablist"
      style={[
        styles.bottomBar,
        { backgroundColor: theme.backgroundElement, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.one) },
      ]}>
      {children}
    </View>
  );
}

// `ref` is dropped: its DOM-flavoured type doesn't match Pressable's on RN 0.88.
function NavItem({
  wide,
  label,
  icon,
  hidden,
  isFocused,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { wide: boolean; label: string; icon: IconName; hidden?: boolean }) {
  const theme = useTheme();
  if (hidden) return null;
  const color = isFocused ? theme.primary : theme.textSecondary;

  if (wide) {
    return (
      <Pressable
        {...props}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        style={({ hovered, pressed }) => [
          styles.sideItem,
          isFocused ? { backgroundColor: theme.backgroundSelected } : (hovered || pressed) && { backgroundColor: theme.background },
        ]}>
        <Icon name={icon} size={20} color={color} />
        <ThemedText type={isFocused ? 'smallBold' : 'small'} style={{ color: isFocused ? theme.text : theme.textSecondary }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.bottomItem, pressed && { opacity: 0.6 }]}>
      <View style={[styles.bottomIcon, isFocused && { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <ThemedText type="caption" numberOfLines={1} style={{ color, fontWeight: isFocused ? 600 : 400 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  slot: {
    flex: 1,
  },
  wideSlot: {
    flex: 1,
    width: '100%',
    maxWidth: WideLayout.contentMaxWidth,
    alignSelf: 'center',
  },
  sidebar: {
    width: WideLayout.sidebarWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.one,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.four,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    minWidth: 0,
  },
  bottomIcon: {
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: 3,
    borderRadius: Radius.lg,
  },
});
