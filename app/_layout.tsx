import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerLargeTitle: true,
            headerLargeTitleShadowVisible: false,
            headerTransparent: true,
            headerBlurEffect: 'systemChromeMaterial',
            headerShadowVisible: false,
            headerLargeTitleStyle: {
              fontSize: 34,
              fontWeight: '700',
              fontFamily: 'Inter_800ExtraBold',
            },
            headerTitleStyle: {
              fontFamily: 'Inter_700Bold',
            },
            headerStyle: {
              backgroundColor: 'transparent',
            },
            headerTintColor: '#0F172A',
          }}
        >
          {/* Configure individual screens */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerLargeTitle: false }} />
          <Stack.Screen name="document/[id]" options={{ title: "Document", headerLargeTitle: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: "Chat", headerLargeTitle: false }} />
          <Stack.Screen name="add-document" options={{ title: "Add Document", headerLargeTitle: false }} />
          <Stack.Screen name="select-form" options={{ title: "Select Form", headerLargeTitle: false }} />
          <Stack.Screen name="fill-form" options={{ title: "Fill Form", headerLargeTitle: false }} />
          <Stack.Screen name="voice-chat" options={{ headerShown: false }} />
          <Stack.Screen name="documents" options={{ title: "Documents" }} />
          <Stack.Screen name="create-form" options={{ title: "Create Form", headerLargeTitle: false }} />
          <Stack.Screen name="select-document-for-form" options={{ title: "Select Document", headerLargeTitle: false }} />
          <Stack.Screen name="extract-form" options={{ title: "Create Form", headerLargeTitle: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
