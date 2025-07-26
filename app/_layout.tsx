import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerLargeTitle: true,
            headerLargeTitleShadowVisible: false,
            headerLargeTitleStyle: {
              fontSize: 34,
              fontWeight: '700',
            },
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTintColor: '#333333',
          }}
        >
          {/* Configure individual screens */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerLargeTitle: false }} />
          <Stack.Screen name="document/[id]" options={{ headerLargeTitle: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerLargeTitle: false }} />
          <Stack.Screen name="add-document" options={{ title: "Add Document", headerLargeTitle: false }} />
          <Stack.Screen name="voice-chat" options={{ headerShown: false }} />
          <Stack.Screen name="documents" options={{ title: "Documents" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
