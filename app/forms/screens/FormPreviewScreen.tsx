import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { processForm } from '../services/FormProcessingService.js';

export default function FormPreviewScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!imageUri) return;

    setIsLoading(true);
    try {
      const formFields = await processForm(imageUri);
      console.log('Processed form fields:', formFields);

      router.push({
        pathname: '/forms/screens/ChoiceScreen',
        params: { imageUri, formFields: JSON.stringify(formFields) },
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Processing Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Form Preview</Text>
      <View style={styles.previewArea}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text>No image found.</Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Retake" onPress={handleRetake} disabled={isLoading} />
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Confirm" onPress={handleConfirm} disabled={!imageUri} />
        )}
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
    marginBottom: 20,
  },
  previewArea: {
    width: '100%',
    height: '70%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});