import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateNote, useDeleteNote, useNote, useUpdateNote } from '@/api/queries';
import type { Note } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/choice';
import { HeaderButton } from '@/components/header-button';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { isOnline } from '@/lib/network';
import { canManage } from '@/lib/roles';
import { useActiveShop, useCurrentUser } from '@/lib/session';
import { confirmAction } from '@/lib/confirm';

/** Write a note (`/note-form`) or open one (`/note-form?id=…`). */
export default function NoteFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useNote(id);
  if (!id) return <NoteEditor />;
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} />;
  return <NoteEditor note={query.data} />;
}

function NoteEditor({ note }: { note?: Note }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const active = useActiveShop();
  const create = useCreateNote();
  const update = useUpdateNote();
  const remove = useDeleteNote();

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [done, setDone] = useState(note?.done ?? false);
  const [shared, setShared] = useState(note?.shared ?? false);
  const [error, setError] = useState<string | null>(null);

  const mine = !note || note.author.id === me.id;
  const canDelete = !!note && (mine || (note.shared && canManage(active.role)));
  const hasText = title.trim() !== '' || body.trim() !== '';
  const changed =
    !note ||
    title !== note.title ||
    body !== note.body ||
    pinned !== note.pinned ||
    done !== note.done ||
    shared !== note.shared;
  const saving = create.isPending || update.isPending;

  const save = async () => {
    if (!hasText || saving) return;
    setError(null);
    try {
      const input = { title: title.trim(), body, pinned, done, shared };
      if (note) {
        if (!isOnline()) return setError(t('notes.needsInternet'));
        await update.mutateAsync({ id: note.id, ...input, ...(mine ? {} : { shared: undefined }) });
      } else {
        await create.mutateAsync(input);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('notes.couldNotSave'));
    }
  };

  const confirmDelete = () =>
    confirmAction({
      title: t('notes.deleteTitle'),
      message: t('notes.deleteBody'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        if (!note) return;
        if (!isOnline()) return setError(t('notes.needsInternet'));
        try {
          await remove.mutateAsync(note.id);
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : t('notes.couldNotDelete'));
        }
      },
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: note ? t('notes.editTitle') : t('notes.newTitle'),
          headerRight: canDelete ? () => <HeaderButton title={t('common.delete')} tone="danger" onPress={confirmDelete} /> : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: Spacing.three, gap: Spacing.two }} keyboardShouldPersistTaps="handled">
        {note && (
          <ThemedText type="caption" themeColor="textSecondary">
            {[
              note.shared && !mine ? t('notes.sharedBy', { name: note.author.name }) : null,
              t('notes.edited', { when: formatRelativeDay(note.updatedAt, t) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        )}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('notes.titlePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={t('notes.titlePlaceholder')}
          maxLength={200}
          returnKeyType="next"
          style={{ fontSize: 24, lineHeight: 34, fontWeight: 700, color: theme.text, paddingVertical: Spacing.one }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('notes.bodyPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={t('notes.bodyPlaceholder')}
          multiline
          autoFocus={!note}
          textAlignVertical="top"
          style={{ flex: 1, minHeight: 220, fontSize: 17, lineHeight: 26, color: theme.text }}
        />
      </ScrollView>

      <View
        style={{
          gap: Spacing.three,
          padding: Spacing.three,
          paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          borderTopWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        }}>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Chip label={`📌 ${t('notes.pin')}`} selected={pinned} onPress={() => setPinned((v) => !v)} />
          <Chip label={`✓ ${t('notes.done')}`} selected={done} onPress={() => setDone((v) => !v)} />
        </View>
        {mine && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="small">{t('notes.shareTeam')}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {shared ? t('notes.shareHint') : t('notes.privateHint')}
              </ThemedText>
            </View>
            <Switch value={shared} onValueChange={setShared} trackColor={{ true: theme.primary }} accessibilityLabel={t('notes.shareTeam')} />
          </View>
        )}
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button title={t('common.save')} onPress={save} loading={saving} disabled={!hasText || !changed} />
      </View>
    </KeyboardAvoidingView>
  );
}
