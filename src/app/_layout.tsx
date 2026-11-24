import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from '@/db/client';
import { useProfile } from '@/hooks/data';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (error || fontError) SplashScreen.hideAsync();
  }, [error, fontError]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>The app’s database couldn’t be opened.</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }
  // If fonts fail to load we carry on with system fonts rather than block the app.
  if ((!fontsLoaded && !fontError) || !success) return null;
  return <App />;
}

function App() {
  const { profile, loaded } = useProfile();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider preference={profile?.themePref ?? 'system'}>
      <Navigation hasProfile={!!profile} />
    </ThemeProvider>
  );
}

function Navigation({ hasProfile }: { hasProfile: boolean }) {
  const { colors, scheme } = useTheme();
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.text,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.line,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationTheme value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
          headerTintColor: colors.text,
        }}>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings', headerBackTitle: 'Today' }} />
          <Stack.Screen name="quick-add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="check-ins/[id]" options={{ headerShown: true, title: 'Check-in', headerBackTitle: 'Progress' }} />
          <Stack.Screen name="compare" options={{ headerShown: true, title: 'Compare', headerBackTitle: 'Progress' }} />
          <Stack.Screen name="import-weights" options={{ headerShown: true, title: 'Import weights', headerBackTitle: 'Weight' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </NavigationTheme>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, padding: 24, justifyContent: 'center', gap: 8 },
  errorTitle: { fontSize: 17, fontWeight: '600' },
});
