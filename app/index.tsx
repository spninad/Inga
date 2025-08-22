import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import DocumentsScreen from './documents.tsx';
import FormsScreen from './forms/index.tsx';
import ChatsScreen from './chats.tsx';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Platform } from 'react-native';
import { Theme } from '@/constants/Theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        headerShown: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTransparent: true,
        headerStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        headerTintColor: Theme.colors.textPrimary,
        // Tab bar styling (floating, blurred on iOS)
        tabBarActiveTintColor: Theme.colors.brand,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        tabBarBackground: () => (Platform.OS === 'ios' ? <TabBarBackground /> : null),
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 24,
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.8)' : '#ffffff',
          borderWidth: 1,
          borderColor: '#EEF2F7',
          paddingBottom: 6,
          paddingTop: 6,
          ...({
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 8,
          } as const),
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