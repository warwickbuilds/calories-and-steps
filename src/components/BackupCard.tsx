import { HardDriveDownload } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { applyBackup, discardStagedBackup, readBackup, saveBackupToFolder, shareBackup } from '@/db/backup';
import { useProfile } from '@/hooks/data';
import { BackupError, describeBackup } from '@/lib/backup';
import { markBackedUp, readBackupState, useBackupReminder } from '@/lib/backupState';
import { formatShortDate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const errorText = (e: unknown) =>
  e instanceof BackupError ? e.message : `Something went wrong: ${e instanceof Error ? e.message : String(e)}`;

/** Settings → Your data: back up to a file and restore from one. */
export function BackupCard() {
  const [lastBackupAt, setLastBackupAt] = useState(() => readBackupState().lastBackupAt ?? null);
  const [busy, setBusy] = useState<'share' | 'folder' | null>(null);

  const run = async (kind: 'share' | 'folder') => {
    setBusy(kind);
    try {
      const manifest = kind === 'share' ? await shareBackup() : await saveBackupToFolder();
      if (manifest) {
        markBackedUp();
        setLastBackupAt(readBackupState().lastBackupAt ?? null);
        if (kind === 'folder') Alert.alert('Backup saved', 'Keep a copy somewhere other than this phone too.');
      }
    } catch (e) {
      Alert.alert('Couldn’t make the backup', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <Text variant="bodyStrong">Backup</Text>
      <Text variant="label" muted>
        One file with all your meals, foods, weights, check-ins, photos and settings. Save it to Google Drive or send it
        to yourself, so you can restore it after reinstalling or on a new phone. Your AI key isn’t included.
      </Text>
      <Text variant="caption" muted>
        {lastBackupAt ? `Last backup ${formatShortDate(new Date(lastBackupAt), true)}` : 'No backup yet'}
      </Text>
      <Button label="Back up and share" loading={busy === 'share'} disabled={!!busy} onPress={() => run('share')} />
      <Button
        variant="secondary"
        label="Save to a folder on this phone"
        loading={busy === 'folder'}
        disabled={!!busy}
        onPress={() => run('folder')}
      />
      <RestoreButton variant="secondary" />
    </Card>
  );
}

/** Picks a backup file, asks before replacing, then restores. Used in Settings and on the first onboarding page. */
export function RestoreButton({ variant = 'secondary' }: { variant?: 'secondary' | 'ghost' }) {
  const { profile } = useProfile();
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      const staged = await readBackup();
      if (!staged) return;
      const when = formatShortDate(new Date(staged.manifest.exportedAt), true);
      const go = await confirm(
        profile ? 'Replace everything on this phone?' : 'Restore this backup?',
        `The backup from ${when} has ${describeBackup(staged.manifest)}.` +
          (profile ? ' Everything on this phone now will be replaced by it. This can’t be undone.' : ''),
        profile ? 'Replace' : 'Restore',
      );
      if (!go) {
        discardStagedBackup();
        return;
      }
      await applyBackup(staged);
      // A restored backup counts as a backup for the reminder.
      markBackedUp(new Date(staged.manifest.exportedAt));
      if (profile) Alert.alert('Backup restored', `Your data from ${when} is back.`);
    } catch (e) {
      Alert.alert('Couldn’t restore the backup', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return <Button variant={variant} label="Restore from a backup" loading={busy} onPress={restore} />;
}

function confirm(title: string, message: string, action: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: action, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

/** Shown on Today two weeks after the last backup (or after setting up, if there's never been one). */
export function BackupReminder() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { due, lastBackupAt, snooze, refresh } = useBackupReminder(profile?.createdAt);
  const [busy, setBusy] = useState(false);
  if (!due) return null;

  const backUp = async () => {
    setBusy(true);
    try {
      await shareBackup();
      markBackedUp();
      refresh();
    } catch (e) {
      Alert.alert('Couldn’t make the backup', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <HardDriveDownload size={20} strokeWidth={1.8} color={colors.text} />
        <View style={styles.text}>
          <Text variant="bodyStrong">Time for a backup</Text>
          <Text variant="caption" muted>
            {lastBackupAt
              ? `Your last backup was ${formatShortDate(new Date(lastBackupAt), true)}.`
              : 'Your data is only on this phone.'}{' '}
            Save a copy to Google Drive in case the phone is lost or the app is removed.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button variant="ghost" label="Later" onPress={snooze} />
        <Button label="Back up" loading={busy} onPress={backUp} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  text: { flex: 1, gap: space[1] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
