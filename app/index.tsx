import React from 'react';
import { StyleSheet, TouchableOpacity, Alert, Image, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Inter_400Regular } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for icons
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import DocumentsScreen from './documents.tsx'; // Import the Documents screen
import ChatsScreen from './chats.tsx'; // Import the Chats screen
import { useRouter } from 'expo-router';

const Tab = createBottomTabNavigator();

console.log("index screen");

function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
  });

  const router = useRouter();

  if (!fontsLoaded) {
    return null; // Wait for fonts to load
  }

  const handleGetStarted = () => {
    router.push('/add-document'); // Navigate directly to AddDocumentScreen
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../assets/images/IngaLogo.png')}
        style={styles.logo}
      />

      {/* Description */}
      <Text style={styles.description}>
        Effortlessly scan and fill health forms with the help of Igna, your AI assistant nurse
      </Text>

      {/* Get Started Button */}
      <TouchableOpacity
        style={styles.getStartedButton}
        onPress={handleGetStarted}
        activeOpacity={0.8}
      >
        <Text style={styles.getStartedButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

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

          if (route.name === 'Home') {
            iconName = 'home'; // Icon for Home tab
          } else if (route.name === 'Documents') {
            iconName = 'document-text'; // Icon for Documents tab
          } else if (route.name === 'Chats') {
            iconName = 'chatbubbles'; // Icon for Chats tab
          }

          return <Ionicons name={iconName as 'home' | 'document-text'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Inga',
          // Apply specific configuration for the Home tab if needed
        }}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen} 
        options={{
          title: 'Documents',
          // Apply specific configuration for the Documents tab if needed
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen} 
        options={{
          title: 'Chats',
          // Apply specific configuration for the Chats tab if needed
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 30,
  },
  getStartedButton: {
    backgroundColor: '#4CAF50', // Green color for the button
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    marginTop: 20,
  },
  getStartedButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});