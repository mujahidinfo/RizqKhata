import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { useJobs, useJobsSummary } from '@/api/queries';
import type { Job, JobStatus } from '@/api/types';
import { Fab, FAB_CLEARANCE } from '@/components/fab';
import { FilterBar } from '@/components/filter-bar';
import { Icon } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { JOB_TINT, JobStatusBadge, isOpenJob } from '@/components/job-status';
import { CARD_SHADOW } from '@/components/panel';
import { PendingSyncBanner } from '@/components/pending-sync-banner';
import { QueryState } from '@/components/query-state';
import { TabScreen } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';

type Filter = 'READY' | 'WAITING_PARTS' | 'OVERDUE' | 'DELIVERED' | 'CANCELLED';

const isOverdue = (job: Job) => isOpenJob(job.status) && !!job.promisedAt && Date.parse(job.promisedAt) < Date.now();

/** The repair board: everything in the shop right now, newest activity first. */
export default function JobsScreen() {
  const theme = useTheme();
  const t = useT();
  const [filter, setFilter] = useState<Filter | undefined>();
  const [search, setSearch] = useState('');
  const needle = useDebouncedValue(search.trim().toLowerCase(), 150);
  // Active jobs by default; finished ones load only when asked for.
  const serverStatus: JobStatus | 'ACTIVE' =
    filter === 'DELIVERED' || filter === 'CANCELLED' ? filter : 'ACTIVE';
  const query = useJobs(serverStatus);
  const summary = useJobsSummary();

  // Searched on the phone, so it works offline and finds IMEIs too.
  const shown = (query.data ?? [])
    .filter((j) =>
      filter === 'READY' || filter === 'WAITING_PARTS' ? j.status === filter : filter === 'OVERDUE' ? isOverdue(j) : true,
    )
    .filter(
      (j) =>
        !needle ||
        [j.jobNumber, j.device, j.problem, j.customer.name, j.customer.phone ?? '', j.details.imei ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle),
    );

  const s = summary.data;

  return (
    <TabScreen style={{ backgroundColor: theme.background }}>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={t('jobs.searchPlaceholder')}
        chips={[
          { label: t('jobs.active') },
          { label: t('jobStatus.READY'), value: 'READY' as Filter },
          { label: t('jobs.overdueCount'), value: 'OVERDUE' as Filter },
          { label: t('jobStatus.WAITING_PARTS'), value: 'WAITING_PARTS' as Filter },
          { label: t('jobStatus.DELIVERED'), value: 'DELIVERED' as Filter },
          { label: t('jobStatus.CANCELLED'), value: 'CANCELLED' as Filter },
        ]}
        selected={filter}
        onSelect={setFilter}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={shown}
        keyExtractor={(j) => j.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.three, paddingTop: Spacing.one, paddingBottom: FAB_CLEARANCE, gap: Spacing.two + 2 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void Promise.all([query.refetch(), summary.refetch()])}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: Spacing.two, paddingBottom: Spacing.one }}>
            <PendingSyncBanner
              kinds={['job', 'jobStatus', 'jobNote']}
              noun={[t('jobs.pendingNoun', { count: 1 }), t('jobs.pendingNoun', { count: 2 })]}
            />
            {s && !needle && (
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Count label={t('jobs.activeCount')} value={s.active} tint={JOB_TINT.IN_REPAIR} onPress={() => setFilter(undefined)} />
                <Count label={t('jobs.readyCount')} value={s.ready} tint={JOB_TINT.READY} onPress={() => setFilter('READY')} />
                <Count
                  label={t('jobs.overdueCount')}
                  value={s.overdue}
                  tint={s.overdue ? theme.danger : JOB_TINT.RECEIVED}
                  onPress={() => setFilter('OVERDUE')}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} />}
        ListEmptyComponent={
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            emptyTitle={needle || filter ? t('jobs.noMatching') : t('jobs.noJobs')}
            emptyMessage={needle || filter ? undefined : t('jobs.noJobsHint')}
          />
        }
      />
      <Fab label={t('jobs.newJob')} onPress={() => router.push('/job-form')} />
    </TabScreen>
  );
}

function Count({ label, value, tint, onPress }: { label: string; value: number; tint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: 2,
        padding: Spacing.three,
        borderRadius: Radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        opacity: pressed ? 0.7 : 1,
      })}>
      <ThemedText style={{ fontSize: 24, lineHeight: 30, fontWeight: 700, color: tint, fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function JobCard({ job }: { job: Job }) {
  const theme = useTheme();
  const t = useT();
  const overdue = isOverdue(job);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.jobNumber}, ${job.customer.name}, ${job.device}, ${t(`jobStatus.${job.status}`)}`}
      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
      style={({ pressed }) => ({
        gap: Spacing.two + 2,
        padding: Spacing.three,
        borderRadius: Radius.lg + 4,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <IconTile name="device" tint={JOB_TINT[job.status]} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={1}>
            {[job.customer.name, job.device].filter(Boolean).join(' · ')}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {job.problem}
          </ThemedText>
        </View>
        <Icon name="chevronRight" size={14} color={theme.textSecondary} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <JobStatusBadge status={job.status} />
        <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
          {job.jobNumber}
        </ThemedText>
        {job.promisedAt && isOpenJob(job.status) && (
          <ThemedText type="caption" style={{ color: overdue ? theme.danger : theme.textSecondary, fontWeight: overdue ? 700 : 500 }}>
            {overdue ? t('jobs.overdue') : t('jobs.due', { when: formatDayLabel(job.promisedAt, t) })}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}
