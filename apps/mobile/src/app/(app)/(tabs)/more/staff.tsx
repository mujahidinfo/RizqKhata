import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { useMembers, usePayroll } from '@/api/queries';
import type { Member, PayrollItem } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Fab, FAB_CLEARANCE } from '@/components/fab';
import { Icon } from '@/components/icon';
import { TINT } from '@/components/icon-tile';
import { Panel, CARD_SHADOW } from '@/components/panel';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, useFormatCurrency } from '@/lib/format';
import { useCurrentUser } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** Your team: who can sign in, what they earn, and who has been paid this month. */
export default function StaffScreen() {
  const theme = useTheme();
  const t = useT();
  const me = useCurrentUser();
  const formatCurrency = useFormatCurrency();
  const members = useMembers();
  const payroll = usePayroll();

  const items = payroll.data?.items ?? [];
  const byMember = new Map(items.filter((i) => i.membershipId).map((i) => [i.membershipId!, i]));
  const payrollOnly = items.filter((i) => !i.membershipId);
  const totals = payroll.data?.totals;
  const paidCount = items.filter((i) => i.state === 'PAID').length;

  if (!members.data) {
    return <QueryState isLoading={members.isLoading} error={members.error} onRetry={members.refetch} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: Spacing.three, paddingBottom: FAB_CLEARANCE, gap: Spacing.three }}
        refreshControl={
          <RefreshControl
            refreshing={members.isRefetching}
            onRefresh={() => {
              void members.refetch();
              void payroll.refetch();
            }}
            tintColor={theme.primary}
          />
        }>
        {totals && items.length > 0 && (
          <Panel icon="wallet" tint={TINT.emerald} title={t('staff.monthSalaries', { month: payroll.data!.label })}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three }}>
              <View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t('staff.stillToPay')}
                </ThemedText>
                <ThemedText style={{ fontSize: 30, lineHeight: 36, fontWeight: 700, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(totals.outstanding)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {t('staff.paidOf', { paid: paidCount, count: items.length })}
              </ThemedText>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.backgroundSelected, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${items.length ? (paidCount / items.length) * 100 : 0}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: TINT.emerald,
                }}
              />
            </View>
          </Panel>
        )}

        <Label>{t('staff.team')}</Label>
        {members.data.map((m) => (
          <MemberCard key={m.id} member={m} isMe={m.user.id === me.id} pay={byMember.get(m.id)} />
        ))}

        {payrollOnly.length > 0 && <Label>{t('staff.payrollOnly')}</Label>}
        {payrollOnly.map((p) => (
          <PayrollOnlyCard key={p.employeeId} item={p} />
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/employee-form')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.two,
            padding: Spacing.three,
            borderRadius: Radius.lg + 4,
            borderCurve: 'continuous',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="personAdd" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" themeColor="primary">
              {t('staff.addToPayroll')}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {t('staff.addToPayrollHint')}
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText type="caption" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.one }}>
          {t('staff.rolesHint')}
        </ThemedText>
      </ScrollView>
      <Fab label={t('staff.addStaff')} icon="personAdd" onPress={() => router.push('/member-form')} />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <ThemedText
      type="caption"
      themeColor="textSecondary"
      style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, paddingHorizontal: Spacing.one, marginBottom: -Spacing.one }}>
      {children}
    </ThemedText>
  );
}

function PayStatus({ item }: { item: PayrollItem }) {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  if (item.state === 'PAID') {
    return (
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Badge label={t('staff.paid')} tone="success" />
        <ThemedText type="caption" themeColor="textSecondary">
          {item.paidOn ? formatDayLabel(item.paidOn, t) : ''}
        </ThemedText>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('staff.payA11y', { name: item.name, amount: formatCurrency(item.amount) })}
      hitSlop={6}
      onPress={() => router.push({ pathname: '/pay-bill', params: { kind: 'SALARY', id: item.employeeId } })}
      style={({ pressed }) => ({
        paddingHorizontal: Spacing.three,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: item.state === 'DUE' ? theme.primary : `${theme.primary}1A`,
        opacity: pressed ? 0.8 : 1,
      })}>
      <ThemedText type="smallBold" style={{ color: item.state === 'DUE' ? theme.onPrimary : theme.primary }}>
        {t('staff.pay')}
      </ThemedText>
    </Pressable>
  );
}

function Card({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radius.lg + 4,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      {children}
    </Pressable>
  );
}

function MemberCard({ member, isMe, pay }: { member: Member; isMe: boolean; pay?: PayrollItem }) {
  const formatCurrency = useFormatCurrency();
  const t = useT();
  return (
    <Card onPress={() => router.push({ pathname: '/member-form', params: { id: member.id } })}>
      <Avatar name={member.user.name} avatarUrl={member.user.avatarUrl} size={46} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <ThemedText type="smallBold" style={{ fontSize: 16, flexShrink: 1 }} numberOfLines={1}>
            {isMe ? t('staff.you', { name: member.user.name }) : member.user.name}
          </ThemedText>
          {member.isActive ? (
            <Badge label={t(`roles.${member.role}`)} tone={member.role === 'OWNER' ? 'primary' : 'textSecondary'} />
          ) : (
            <Badge label={t('staff.noAccess')} tone="danger" />
          )}
        </View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {member.shop?.name ?? t('staff.allBranches')}
          {pay ? t('staff.perMonth', { amount: formatCurrency(pay.amount) }) : ''}
        </ThemedText>
      </View>
      {pay && <PayStatus item={pay} />}
    </Card>
  );
}

function PayrollOnlyCard({ item }: { item: PayrollItem }) {
  const formatCurrency = useFormatCurrency();
  return (
    <Card onPress={() => router.push({ pathname: '/employee-form', params: { id: item.employeeId } })}>
      <Avatar name={item.name} size={46} />
      <View style={{ flex: 1, gap: 3 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {item.position} · {formatCurrency(item.amount)} / month
        </ThemedText>
      </View>
      <PayStatus item={item} />
    </Card>
  );
}
