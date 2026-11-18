import { Children, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useAnalyticsOverview, useCustomers, useNotes, useSuppliers, useUpcoming } from '@/api/queries';
import { FeatureTile } from '@/components/feature-tile';
import { Icon } from '@/components/icon';
import { TINT } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { canEditCatalog, canManage } from '@/lib/roles';
import { useActiveShop, useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';
import { useModules } from '@/lib/business';

/**
 * The rest of the business: stock, suppliers, expenses, customers, notes,
 * staff and branches.
 * Tiles appear only for roles that can use them.
 */
export default function MoreScreen() {
  const theme = useTheme();
  const t = useT();
  const active = useActiveShop();
  const { workspaces } = useSession();
  const formatCurrency = useFormatCurrency();

  const editor = canEditCatalog(active.role);
  const manager = canManage(active.role);
  const { services } = useModules();
  const branchCount = workspaces.reduce((n, w) => n + w.shops.length, 0);
  const showBranches = branchCount > 1 || active.role === 'OWNER';

  const lowStock = useAnalyticsOverview(1).data?.lowStockCount ?? 0;
  const suppliers = useSuppliers(editor);
  const totalDue = (suppliers.data ?? []).reduce((sum, s) => sum + Math.max(s.due, 0), 0);
  const customerCount = useCustomers(manager).data?.length ?? 0;
  const openNotes = (useNotes().data ?? []).filter((n) => !n.done).length;

  const upcoming = useUpcoming(7, manager);
  const dueCount = upcoming.data?.items.length ?? 0;

  const sections: { title: string; tiles: ReactNode[] }[] = [
    {
      title: t('more.stock'),
      tiles: editor
        ? [
            <FeatureTile
              key="receive"
              icon="receive"
              tint={TINT.emerald}
              title={t('more.receiveStock')}
              subtitle={t('more.receiveStockHint')}
              href="/receive-stock"
            />,
            <FeatureTile
              key="reorder"
              icon="reorder"
              tint={TINT.amber}
              title={t('more.reorder')}
              subtitle={lowStock > 0 ? t('more.runningLow', { count: lowStock }) : t('more.nothingLow')}
              href={{ pathname: '/receive-stock', params: { reorder: '1' } }}
              badge={lowStock > 0 ? { label: String(lowStock), tone: 'danger' } : undefined}
            />,
            <FeatureTile
              key="suppliers"
              icon="truck"
              tint={TINT.sky}
              title={t('more.suppliers')}
              subtitle={totalDue > 0 ? t('more.youOwe', { amount: formatCurrency(totalDue) }) : t('more.whoYouBuyFrom')}
              href="/more/suppliers"
            />,
          ]
        : [],
    },
    {
      title: t('more.money'),
      tiles: manager
        ? [
            <FeatureTile
              key="expenses"
              icon="money"
              tint={TINT.rose}
              title={t('more.expenses')}
              subtitle={dueCount > 0 ? t('more.toPaySoon', { count: dueCount }) : t('more.everythingSpent')}
              href="/more/expenses"
              badge={upcoming.data && upcoming.data.overdueCount > 0 ? { label: t('more.overdueBadge', { count: upcoming.data.overdueCount }), tone: 'danger' } : undefined}
            />,
            <FeatureTile
              key="bills"
              icon="repeat"
              tint={TINT.violet}
              title={t('more.bills')}
              subtitle={t('more.billsHint')}
              href="/more/bills"
            />,
          ]
        : [],
    },
    {
      title: t('more.customersNotes'),
      tiles: [
        ...(services
          ? [
              <FeatureTile
                key="orders"
                icon="receipt"
                tint={TINT.indigo}
                title={t('more.orders')}
                subtitle={t('more.ordersHint')}
                href="/orders"
              />,
            ]
          : []),
        ...(manager
          ? [
              <FeatureTile
                key="customers"
                icon="customers"
                tint={TINT.sky}
                title={t('more.customers')}
                subtitle={customerCount ? t('more.customersCount', { count: customerCount }) : t('more.customersHint')}
                href="/more/customers"
              />,
            ]
          : []),
        // Everyone gets notes.
        <FeatureTile
          key="notes"
          icon="note"
          tint={TINT.amber}
          title={t('more.notes')}
          subtitle={openNotes ? t('more.notesOpen', { count: openNotes }) : t('more.notesHint')}
          href="/more/notes"
        />,
      ],
    },
    {
      title: t('more.teamShops'),
      tiles: [
        ...(manager
          ? [
              <FeatureTile
                key="staff"
                icon="team"
                tint={TINT.violet}
                title={t('more.staffSalaries')}
                subtitle={t('more.staffHint')}
                href="/more/staff"
              />,
            ]
          : []),
        ...(showBranches
          ? [
              <FeatureTile
                key="branches"
                icon="branches"
                tint={TINT.teal}
                title={t('more.branches')}
                subtitle={branchCount > 1 ? t('more.branchesCount', { count: branchCount }) : t('more.addOutlet')}
                href="/branches"
              />,
            ]
          : []),
      ],
    },
  ].filter((section) => section.tiles.length > 0);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six }}>
      {sections.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            gap: Spacing.two,
            padding: Spacing.five,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            backgroundColor: theme.backgroundElement,
          }}>
          <Icon name="profile" size={34} color={theme.textSecondary} />
          <ThemedText type="smallBold">{t('more.nothingForRole')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {t('more.profileHint')}
          </ThemedText>
        </View>
      ) : (
        sections.map((section) => (
          <View key={section.title} style={{ gap: Spacing.two }}>
            <ThemedText
              type="caption"
              themeColor="textSecondary"
              style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, paddingHorizontal: Spacing.one }}>
              {section.title}
            </ThemedText>
            <TileGrid>{section.tiles}</TileGrid>
          </View>
        ))
      )}
    </ScrollView>
  );
}

/** Two tiles per row; a lone last tile keeps half width instead of stretching. */
function TileGrid({ children }: { children: ReactNode }) {
  const tiles = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));

  return (
    <View style={{ gap: Spacing.three }}>
      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: Spacing.three }}>
          {row}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}
