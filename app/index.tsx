import React from 'react';
import { StyleSheet, TouchableOpacity, Image, Text, View } from 'react-native';
import { useFonts, Inter_400Regular } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
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

  const handleScanForm = () => {
    router.push('/forms/screens/FormScannerScreen');
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

      {/* Scan a Form Button */}
      <TouchableOpacity
        style={styles.scanFormButton}
        onPress={handleScanForm}
        activeOpacity={0.8}
      >
        <Text style={styles.scanFormButtonText}>Scan a Form</Text>
      </TouchableOpacity>
    </View>
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
  scanFormButton: {
    backgroundColor: '#007AFF', // Blue color for the button
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    marginTop: 10,
  },
  scanFormButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});