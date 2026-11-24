import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { connectSteps, syncSteps, useStepsSync } from '@/hooks/steps';
import { openHealthConnect } from '@/lib/healthConnect';
import { accessMessage, syncedText } from '@/lib/steps';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/**
 * Health Connect status with the one action that fits: connect, install or
 * update Health Connect, or (once connected) sync now and manage access.
 */
export function StepsAccessCard({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const { access, syncing, lastSyncedAt, error } = useStepsSync();
  const [busy, setBusy] = useState(false);

  // Onboarding shows this before the tabs (and their auto-sync) exist.
  useEffect(() => {
    if (access == null) syncSteps();
  }, [access]);

  if (access == null) return null;
  const msg = accessMessage(access);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.title}>
        <View style={[styles.dot, { backgroundColor: access === 'granted' ? colors.steps : colors.muted }]} />
        <Text variant="bodyStrong">{msg.title}</Text>
      </View>
      {!(compact && access === 'granted') ? (
        <Text variant="label" muted>
          {msg.body}
        </Text>
      ) : null}
      {access === 'granted' ? (
        <>
          {error ? (
            <Text variant="label" color={colors.danger}>
              Steps couldn’t be read: {error}
            </Text>
          ) : (
            <Text variant="label" muted>
              {syncing ? 'Reading steps…' : (syncedText(lastSyncedAt) ?? 'Not read yet')}
            </Text>
          )}
          {!compact ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  variant="secondary"
                  label="Sync now"
                  loading={syncing}
                  onPress={() => syncSteps({ force: true })}
                />
              </View>
              <View style={styles.flex}>
                <Button variant="secondary" label="Manage access" onPress={openHealthConnect} />
              </View>
            </View>
          ) : null}
        </>
      ) : msg.action ? (
        <Button label={msg.action} loading={busy} onPress={() => run(connectSteps)} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: space[3] },
  flex: { flex: 1 },
});
