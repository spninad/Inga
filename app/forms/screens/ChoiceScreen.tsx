import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ChoiceScreen() {
  const router = useRouter();
  const { imageUri, formFields } = useLocalSearchParams<{ imageUri: string, formFields: string }>();

  const handleManualFill = () => {
    router.push({
      pathname: '/forms/screens/ManualFormScreen',
      params: { imageUri, formFields },
    });
  };

  const handleVoiceFill = () => {
    router.push({
      pathname: '/forms/screens/VoiceChatScreen',
      params: { imageUri, formFields },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How would you like to fill the form?</Text>
      <View style={styles.buttonContainer}>
        <Button title="Fill Manually" onPress={handleManualFill} />
        <Button title="Use Voice Assistant" onPress={handleVoiceFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    width: '100%',
    height: 100,
  },
});