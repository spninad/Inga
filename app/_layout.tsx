import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/useColorScheme.ts';
import { AuthProvider } from '../context/AuthContext.tsx';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Tabs>
          <Tabs.Screen 
            name="index" 
            options={{ title: 'Home', headerShown: false }} 
          />
          <Tabs.Screen 
            name="forms" 
            options={{ title: 'Forms', headerShown: false }} 
          />
          {/* The following screens are nested in the default stack, but are not tabs */}
          <Tabs.Screen name="+not-found" options={{ href: null, headerLargeTitle: false }} />
          <Tabs.Screen name="document/[id]" options={{ href: null, headerLargeTitle: false }} />
          <Tabs.Screen name="chat/[id]" options={{ href: null, headerLargeTitle: false }} />
          <Tabs.Screen name="add-document" options={{ href: null, title: "Add Document", headerLargeTitle: false }} />
          <Tabs.Screen name="voice-chat" options={{ href: null, headerShown: false }} />
        </Tabs>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
