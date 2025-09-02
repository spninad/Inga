import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
              color: colors.headerText,
            },
            headerStyle: {
              backgroundColor: colors.headerBackground,
            },
            headerTintColor: colors.headerTint,
            headerTitleStyle: {
              color: colors.headerText,
            },
          }}
        >
          {/* Configure individual screens */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: "Page Not Found", headerLargeTitle: false }} />
          <Stack.Screen name="document/[id]" options={{ title: "Document", headerLargeTitle: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: "Chat", headerLargeTitle: false }} />
          <Stack.Screen name="add-document" options={{ title: "Add Document", headerLargeTitle: false }} />
          <Stack.Screen name="select-form" options={{ title: "Select Form", headerLargeTitle: false }} />
          <Stack.Screen name="fill-form" options={{ title: "Fill Form", headerLargeTitle: false }} />
          <Stack.Screen name="voice-chat" options={{ headerShown: false }} />
          <Stack.Screen name="documents" options={{ title: "Documents" }} />
          <Stack.Screen name="create-form" options={{ title: "Create Form", headerLargeTitle: false }} />
          <Stack.Screen name="select-document-for-form" options={{ title: "Select Document", headerLargeTitle: false }} />
          <Stack.Screen name="extract-form" options={{ title: "Extract Form", headerLargeTitle: false }} />
          <Stack.Screen name="forms-list" options={{ title: "Forms", headerLargeTitle: true }} />
          <Stack.Screen name="chats" options={{ title: "Chats", headerLargeTitle: true }} />
          <Stack.Screen name="auth" options={{ title: "Sign In", headerLargeTitle: false }} />
          <Stack.Screen name="fill-form-template" options={{ title: "Fill Form", headerLargeTitle: false }} />
          <Stack.Screen name="view-filled-form" options={{ title: "Filled Form", headerLargeTitle: false }} />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </AuthProvider>
  );
}
