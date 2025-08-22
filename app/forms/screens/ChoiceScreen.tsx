import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ChoiceScreen() {
  const router = useRouter();
  const { imageUri, formFields, documentId } = useLocalSearchParams<{ imageUri: string, formFields: string, documentId?: string }>();

  const handleManualFill = () => {
    router.push({
      pathname: '/forms/screens/ManualFormScreen',
      params: { imageUri, formFields, documentId },
    });
  };

  // Voice functionality disabled for now
  // const handleVoiceFill = () => {
  //   router.push({
  //     pathname: '/forms/screens/VoiceChatScreen',
  //     params: { imageUri, formFields, documentId },
  //   });
  // };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fill out the form manually</Text>
      <View style={styles.buttonContainer}>
        <Button title="Fill Manually" onPress={handleManualFill} />
        {/* Voice option temporarily disabled */}
        {/* <Button title="Use Voice Assistant" onPress={handleVoiceFill} /> */}
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