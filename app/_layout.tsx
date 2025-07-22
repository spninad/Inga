import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // TODO: replace with different icons
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
        <Tabs screenOptions={{
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
          }}>
          <Tabs.Screen 
            name="index" 
            options={{ 
              title: 'Home',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="home-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen 
            name="forms" 
            options={{ 
              title: 'Forms',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="document-text-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen 
            name="DocumentsScreen" 
            options={{ 
              title: 'Documents',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="folder-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen 
            name="chats" 
            options={{ 
              title: 'Chats',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
            }}
          />

          {/* Hide other screens from the tab bar */}
          { /* TODO: verify implementation */ }
          <Tabs.Screen name="auth" options={{ href: null }} />
          <Tabs.Screen name="document/[id]" options={{ href: null }} />
          <Tabs.Screen name="chat/[id]" options={{ href: null }} />
          <Tabs.Screen name="add-document" options={{ href: null }} />
          <Tabs.Screen name="voice-chat" options={{ href: null }} />
          <Tabs.Screen name="+not-found" options={{ href: null }} />
        </Tabs>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
