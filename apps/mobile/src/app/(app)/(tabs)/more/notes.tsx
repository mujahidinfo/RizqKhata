import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';

import { useNotes, useUpdateNote } from '@/api/queries';
import type { Note } from '@/api/types';
import { Fab, FAB_CLEARANCE } from '@/components/fab';
import { FilterBar } from '@/components/filter-bar';
import { Icon } from '@/components/icon';
import { CARD_SHADOW } from '@/components/panel';
import { PendingSyncBanner } from '@/components/pending-sync-banner';
import { QueryState } from '@/components/query-state';
import { TabScreen } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { isOnline } from '@/lib/network';
import { useCurrentUser } from '@/lib/session';

type Filter = 'open' | 'done' | 'shared';

/** Notes for later: yours, plus the ones your team shared. Pinned first. */
export default function NotesScreen() {
  const theme = useTheme();
  const t = useT();
  const query = useNotes();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter | undefined>();
  const needle = useDebouncedValue(search.trim().toLowerCase(), 150);

  const shown = (query.data ?? [])
    .filter((n) => (filter === 'open' ? !n.done : filter === 'done' ? n.done : filter === 'shared' ? n.shared : true))
    .filter((n) => !needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle));
  const pinned = shown.filter((n) => n.pinned);
  const others = shown.filter((n) => !n.pinned);
  const sections = [
    ...(pinned.length ? [{ key: 'pinned', title: t('notes.pinned'), data: pinned }] : []),
    ...(others.length ? [{ key: 'others', title: pinned.length ? t('notes.others') : '', data: others }] : []),
  ];

  return (
    <TabScreen style={{ backgroundColor: theme.background }}>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={t('notes.searchPlaceholder')}
        chips={[
          { label: t('common.all') },
          { label: t('notes.open'), value: 'open' as Filter },
          { label: t('notes.doneFilter'), value: 'done' as Filter },
          { label: t('notes.shared'), value: 'shared' as Filter },
        ]}
        selected={filter}
        onSelect={setFilter}
      />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(n) => n.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.three, paddingTop: Spacing.one, paddingBottom: FAB_CLEARANCE }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.primary} />}
        ListHeaderComponent={
          <View style={{ paddingBottom: Spacing.two }}>
            <PendingSyncBanner kinds={['note']} noun={[t('screens.notes'), t('screens.notes')]} />
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <ThemedText
              type="caption"
              themeColor="textSecondary"
              style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, paddingHorizontal: Spacing.one, paddingTop: Spacing.two, paddingBottom: Spacing.two }}>
              {section.title}
            </ThemedText>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
        renderItem={({ item }) => <NoteCard note={item} />}
        ListEmptyComponent={
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            emptyTitle={needle || filter ? t('notes.noMatching') : t('notes.noNotes')}
            emptyMessage={needle || filter ? undefined : t('notes.emptyHint')}
          />
        }
      />
      <Fab label={t('notes.addNote')} icon="plus" onPress={() => router.push('/note-form')} />
    </TabScreen>
  );
}

function NoteCard({ note }: { note: Note }) {
  const theme = useTheme();
  const t = useT();
  const me = useCurrentUser();
  const update = useUpdateNote();
  const mine = note.author.id === me.id;
  const title = note.title.trim();
  const preview = note.body.trim();

  const toggleDone = () => {
    if (!isOnline()) return Alert.alert(t('notes.needsInternet'));
    void Haptics.selectionAsync();
    update.mutate({ id: note.id, done: !note.done });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title || preview.slice(0, 80)}
      onPress={() => router.push({ pathname: '/note-form', params: { id: note.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radius.lg + 4,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        opacity: note.done ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: note.done }}
        accessibilityLabel={note.done ? t('notes.markOpen') : t('notes.markDone')}
        onPress={toggleDone}
        hitSlop={10}
        style={{ paddingTop: 1 }}>
        <Icon name={note.done ? 'check' : 'circle'} size={22} color={note.done ? theme.success : theme.textSecondary} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            style={{ flex: 1, fontSize: 16, textDecorationLine: note.done ? 'line-through' : 'none' }}>
            {title || preview.split('\n')[0] || t('notes.untitled')}
          </ThemedText>
          {note.pinned && <Icon name="pinFill" size={14} color={theme.primary} />}
        </View>
        {title !== '' && preview !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {preview}
          </ThemedText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
          {note.shared && <Icon name="shared" size={13} color={theme.textSecondary} />}
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[
              formatRelativeDay(note.updatedAt, t),
              note.shared ? (mine ? t('notes.byYou') : t('notes.by', { name: note.author.name })) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}
