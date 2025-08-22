import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import DocumentsScreen from './documents.tsx';
import FormsScreen from './forms/index.tsx';
import ChatsScreen from './chats.tsx';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        headerShown: true,
        // Configure large title display for iOS
        headerLargeTitle: true,
        headerLargeTitleStyle: {
          fontSize: 34,
          fontWeight: '700',
        },
        // Improve iOS title appearance
        headerLargeTitleShadowVisible: false,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerTintColor: '#333333',
        // Tab bar styling
        tabBarActiveTintColor: '#636ae8',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
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
          title: 'Forms',
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