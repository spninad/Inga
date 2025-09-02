import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import DocumentsScreen from './documents.tsx';
import FormsScreen from './forms/index.tsx';
import ChatsScreen from './chats.tsx';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const Tab = createBottomTabNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        headerShown: true,
        // Configure large title display for iOS
        headerLargeTitle: true,
        headerLargeTitleStyle: {
          fontSize: 34,
          fontWeight: '700',
          color: colors.headerText,
        },
        // Improve iOS title appearance
        headerLargeTitleShadowVisible: false,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.headerText,
        },
        headerTintColor: colors.headerTint,
        // Tab bar styling
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { 
          backgroundColor: colors.headerBackground,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap | undefined;

          if (route.name === 'Documents') {
            iconName = 'document-text';
          } else if (route.name === 'Forms') {
            iconName = 'list';
          } else if (route.name === 'Chats') {
            iconName = 'chatbubbles';
          }

          return <Ionicons name={iconName as 'document-text' | 'list' | 'chatbubbles'} size={size} color={color} />;
        },
      })}
      initialRouteName="Documents"
    >
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen} 
        options={{
          title: 'Documents',
        }}
      />
      <Tab.Screen 
        name="Forms" 
        component={FormsScreen} 
        options={{
          title: 'My Forms',
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen} 
        options={{
          title: 'Chats',
        }}
      />
    </Tab.Navigator>
  );
}