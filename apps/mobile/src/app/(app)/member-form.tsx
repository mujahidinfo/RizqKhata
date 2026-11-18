import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useAddMember, useMembers, useUpdateMember } from '@/api/queries';
import type { Member, Role } from '@/api/types';
import { Button } from '@/components/button';
import { Chip, ChipGroup } from '@/components/choice';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useActiveShop, useCurrentUser, useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

const ROLES: Role[] = ['CASHIER', 'INVENTORY_MANAGER', 'MANAGER', 'OWNER'];

/** Add a staff member (`/member-form`) or edit one (`/member-form?id=…`). */
export default function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const members = useMembers();

  if (!id) return <MemberForm />;
  const member = members.data?.find((m) => m.id === id);
  if (!member) return <QueryState isLoading={members.isLoading} error={members.error} />;
  return <MemberForm member={member} />;
}

function MemberForm({ member }: { member?: Member }) {
  const theme = useTheme();
  const t = useT();
  const me = useCurrentUser();
  const active = useActiveShop();
  const { workspaces } = useSession();
  const addMember = useAddMember();
  const updateMember = useUpdateMember();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(member?.role ?? 'CASHIER');
  const [shopId, setShopId] = useState<string | null>(member?.shopId ?? null);
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const currentPay = member?.employee?.isActive ? member.employee : null;
  const [salary, setSalary] = useState(currentPay ? String(currentPay.salary) : '');
  const [payDay, setPayDay] = useState(String(currentPay?.payDay ?? 1));
  const [error, setError] = useState<string | null>(null);

  const branches = workspaces.find((w) => w.id === active.businessId)?.shops ?? [];
  // Only owners hand out (or take away) the owner role.
  const roles = active.role === 'OWNER' ? ROLES : ROLES.filter((r) => r !== 'OWNER');
  const isSelf = member?.user.id === me.id;
  const saving = addMember.isPending || updateMember.isPending;
  const salaryNum = Number(salary.replace(/,/g, '')) || 0;
  const dayNum = Number(payDay);
  const payOk = salaryNum === 0 || (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 28);
  const valid = payOk && (member ? true : name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim()));

  const save = async () => {
    setError(null);
    try {
      if (member) {
        await updateMember.mutateAsync({
          id: member.id,
          role,
          shopId,
          isActive,
          // Clearing the salary takes them off payroll.
          ...((currentPay || salaryNum > 0) && { salary: salaryNum > 0 ? salaryNum : null }),
          ...(salaryNum > 0 && { payDay: dayNum }),
        });
      } else {
        await addMember.mutateAsync({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password || undefined,
          role,
          shopId: shopId ?? undefined,
          ...(salaryNum > 0 && { salary: salaryNum, payDay: dayNum }),
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('employeeForm.couldNotSave'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {member ? (
          <View>
            <ThemedText type="subtitle">{member.user.name}</ThemedText>
            <ThemedText themeColor="textSecondary">{member.user.email}</ThemedText>
          </View>
        ) : (
          <>
            <TextField label={t('employeeForm.name')} value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
            <TextField
              label={t('memberForm.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label={t('memberForm.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('memberForm.passwordPlaceholder')}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              {t('memberForm.shareHint')}
            </ThemedText>
          </>
        )}

        <ChipGroup label={t('memberForm.role')}>
          {roles.map((r) => (
            <Chip key={r} label={t(`roles.${r}`)} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </ChipGroup>

        {branches.length > 1 && (
          <ChipGroup label={t('memberForm.worksAt')}>
            <Chip label={t('staff.allBranches')} selected={shopId === null} onPress={() => setShopId(null)} />
            {branches.map((b) => (
              <Chip key={b.id} label={b.name} selected={shopId === b.id} onPress={() => setShopId(b.id)} />
            ))}
          </ChipGroup>
        )}

        <View style={{ gap: Spacing.three }}>
          <TextField
            label={t('memberForm.salaryOptional')}
            value={salary}
            onChangeText={setSalary}
            keyboardType="decimal-pad"
            placeholder={t('memberForm.salaryPlaceholder')}
          />
          {salaryNum > 0 && (
            <TextField
              label={t('employeeForm.payDay')}
              value={payDay}
              onChangeText={(t) => setPayDay(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
            />
          )}
          {salaryNum > 0 && (
            <ThemedText type="caption" themeColor="textSecondary">
              {t('memberForm.salaryHint')}
            </ThemedText>
          )}
        </View>

        {member && !isSelf && (
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText>{t('memberForm.canSignIn')}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {t('memberForm.canSignInHint')}
              </ThemedText>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: theme.primary }}
              accessibilityLabel={t('memberForm.canSignIn')}
            />
          </View>
        )}

        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button title={member ? t('common.save') : t('memberForm.add')} onPress={save} loading={saving} disabled={!valid} />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
