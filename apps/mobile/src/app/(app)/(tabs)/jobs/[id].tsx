import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { useJob, useJobNote, useJobStatus, useShop, useUpdateJob } from '@/api/queries';
import type { JobDetail, JobStatus } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/choice';
import { Icon, type IconName } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { JOB_TINT, JobStatusBadge, MOVABLE, NEXT_STATUS, isOpenJob } from '@/components/job-status';
import { Panel } from '@/components/panel';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { whatsappNumber } from '@/lib/business';
import { formatDateTime, formatDayLabel, formatRelativeDay, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { isOnline } from '@/lib/network';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One job: who, what, where it is, what it costs, and everything that happened. */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const { data: job, isLoading, error, refetch, isRefetching } = useJob(id);
  const { data: shop } = useShop();
  const setStatus = useJobStatus();
  const update = useUpdateJob();

  if (!job) return <QueryState isLoading={isLoading} error={error} onRetry={refetch} />;

  const open = isOpenJob(job.status);
  const total = round2(job.lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const due = round2(Math.max(total - job.advance, 0));
  const next = NEXT_STATUS[job.status];

  const move = (status: JobStatus) => {
    void Haptics.selectionAsync();
    setStatus.mutate({ id: job.id, status, label: `${job.jobNumber} → ${t(`jobStatus.${status}`)}` });
  };

  const confirmCancel = () =>
    Alert.alert(t('jobs.cancelTitle'), t('jobs.cancelBody'), [
      { text: t('common.close'), style: 'cancel' },
      { text: t('jobs.cancelJob'), style: 'destructive', onPress: () => move('CANCELLED') },
    ]);

  const openWhatsApp = () => {
    if (!job.customer.phone) return Alert.alert(t('jobs.whatsappMissing'));
    const text =
      job.status === 'READY'
        ? t('jobs.readyMessage', {
            name: job.customer.name,
            device: job.device || t('jobs.device'),
            shop: shop?.businessName ?? shop?.name ?? '',
            job: job.jobNumber,
            amount: formatCurrency(due),
          })
        : '';
    void Linking.openURL(`https://wa.me/${whatsappNumber(job.customer.phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
  };

  const removeLine = (index: number) => {
    if (!isOnline()) return Alert.alert(t('jobs.needsInternet'));
    update.mutate({ id: job.id, lines: job.lines.filter((_, i) => i !== index).map(({ id: _id, ...l }) => l) });
  };

  const details: [string, string | undefined][] = [
    [t('jobs.imeiLabel'), job.details.imei],
    [t('jobs.lockCodeLabel'), job.details.lockCode],
    [t('jobs.accessoriesLabel'), job.details.accessories],
    [t('jobs.conditionLabel'), job.details.condition],
  ];

  return (
    <>
      <Stack.Screen options={{ title: job.jobNumber }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.primary} />}>
        {/* Who and what */}
        <Panel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <IconTile name="device" tint={JOB_TINT[job.status]} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="subtitle" numberOfLines={2}>
                {job.device || t('jobs.device')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {[job.customer.name, job.customer.phone].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
            <JobStatusBadge status={job.status} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {t('jobs.receivedBy', { when: formatRelativeDay(job.createdAt, t), name: job.createdBy.name })}
            {job.promisedAt && open ? ` · ${t('jobs.due', { when: formatDayLabel(job.promisedAt, t) })}` : ''}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {job.customer.phone && (
              <Action icon="phone" tint={TINT.sky} label={t('jobs.call')} onPress={() => Linking.openURL(`tel:${job.customer.phone}`)} />
            )}
            <Action icon="whatsapp" tint={TINT.emerald} label={t('jobs.whatsapp')} onPress={openWhatsApp} />
          </View>
        </Panel>

        {/* Problem & device details */}
        <Panel icon="info" tint={TINT.slate} title={t('jobs.problem')}>
          <ThemedText selectable>{job.problem}</ThemedText>
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {label}
                </ThemedText>
                <ThemedText type="small" selectable style={{ flexShrink: 1, textAlign: 'right' }}>
                  {value}
                </ThemedText>
              </View>
            ))}
        </Panel>

        {/* Where it is */}
        {open && (
          <Panel icon="wrench" tint={TINT.indigo} title={t('jobs.moveTo')}>
            {job.status === 'READY' ? (
              <>
                <Button title={t('jobs.billDeliver')} onPress={() => router.push({ pathname: '/job-deliver', params: { id: job.id } })} />
                <Button title={t('jobs.whatsapp')} variant="secondary" onPress={openWhatsApp} />
              </>
            ) : (
              next && <Button title={t('jobs.nextStep', { status: t(`jobStatus.${next}`) })} onPress={() => move(next)} />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {MOVABLE.filter((s) => s !== job.status && s !== next).map((s) => (
                <Chip key={s} label={t(`jobStatus.${s}`)} selected={false} onPress={() => move(s)} />
              ))}
            </View>
            <Button title={t('jobs.cancelJob')} variant="secondary" onPress={confirmCancel} />
          </Panel>
        )}

        {/* Services & parts */}
        <Panel icon="receipt" tint={TINT.emerald} title={t('jobs.work')}>
          {job.lines.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('jobs.noWork')}
            </ThemedText>
          ) : (
            job.lines.map((line, index) => (
              <View key={line.id ?? index} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <ThemedText type="small" style={{ flex: 1 }} numberOfLines={2}>
                  {line.quantity > 1 ? `${line.quantity} × ` : ''}
                  {line.name}
                </ThemedText>
                <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(line.price * line.quantity)}
                </ThemedText>
                {open && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('jobs.removeLine', { name: line.name })}
                    onPress={() => removeLine(index)}
                    hitSlop={8}>
                    <Icon name="close" size={16} color={theme.textSecondary} />
                  </Pressable>
                )}
              </View>
            ))
          )}
          {open && (
            <Button
              title={t('jobs.addItem')}
              variant="secondary"
              onPress={() => (isOnline() ? router.push({ pathname: '/job-items', params: { id: job.id } }) : Alert.alert(t('jobs.needsInternet')))}
            />
          )}
          <View style={{ gap: 6, borderTopWidth: 1, borderColor: theme.border, paddingTop: Spacing.two }}>
            <Money label={t('jobs.total')} value={formatCurrency(total)} />
            {job.estimate !== null && job.lines.length === 0 && <Money label={t('jobs.estimate')} value={formatCurrency(job.estimate)} />}
            {job.advance > 0 && <Money label={t('jobs.advanceLess')} value={`−${formatCurrency(job.advance)}`} />}
            {open && <Money label={t('jobs.dueNow')} value={formatCurrency(due)} bold />}
          </View>
          {job.order && (
            <ThemedText type="caption" themeColor="textSecondary">
              {t('jobs.deliveredOn', { when: formatDateTime(job.order.createdAt, t), order: job.order.orderNumber })}
            </ThemedText>
          )}
        </Panel>

        <Timeline job={job} />
      </ScrollView>
    </>
  );
}

function Timeline({ job }: { job: JobDetail }) {
  const theme = useTheme();
  const t = useT();
  const addNote = useJobNote();
  const [note, setNote] = useState('');

  const send = () => {
    const text = note.trim();
    if (!text) return;
    addNote.mutate({ id: job.id, note: text, label: job.jobNumber });
    setNote('');
  };

  return (
    <Panel icon="history" tint={TINT.violet} title={t('jobs.timeline')}>
      {[...job.events].reverse().map((e) => (
        <View key={e.id} style={{ flexDirection: 'row', gap: Spacing.two }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: e.status ? JOB_TINT[e.status] : theme.textSecondary }} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="small">
              {e.type === 'CREATED'
                ? t('jobs.created')
                : e.type === 'STATUS' && e.status
                  ? t('jobs.statusTo', { status: t(`jobStatus.${e.status}`) })
                  : e.note}
            </ThemedText>
            {e.type === 'STATUS' && e.note && (
              <ThemedText type="small" themeColor="textSecondary">
                {e.note}
              </ThemedText>
            )}
            <ThemedText type="caption" themeColor="textSecondary">
              {e.createdBy.name} · {formatDateTime(e.createdAt, t)}
            </ThemedText>
          </View>
        </View>
      ))}
      {isOpenJob(job.status) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('jobs.addNote')}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={t('jobs.addNote')}
            onSubmitEditing={send}
            returnKeyType="send"
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: Spacing.three,
              borderRadius: Radius.md,
              backgroundColor: theme.backgroundSelected,
              color: theme.text,
              fontSize: 15,
            }}
          />
          <Button title={t('jobs.send')} variant="secondary" onPress={send} disabled={!note.trim()} />
        </View>
      )}
    </Panel>
  );
}

function Money({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText type={bold ? 'smallBold' : 'small'} themeColor={bold ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText type={bold ? 'smallBold' : 'small'} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
    </View>
  );
}

function Action({ icon, tint, label, onPress }: { icon: IconName; tint: string; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two + 2,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: `${tint}14`,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={16} color={tint} />
      <ThemedText type="smallBold" style={{ color: theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
