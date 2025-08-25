import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { processForm } from '../services/FormProcessingService.ts';

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
        params: { imageUri, formFields: JSON.stringify({ fields: formFields }) },
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
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color="#ccc" />
            <Text style={styles.noImageText}>No image found</Text>
          </View>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.retakeButton]} 
          onPress={handleRetake} 
          disabled={isLoading}
        >
          <Ionicons name="camera-reverse" size={20} color="#666" />
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
        
        {isLoading ? (
          <View style={[styles.button, styles.confirmButton]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.confirmButtonText}>Processing...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton, !imageUri && styles.buttonDisabled]} 
            onPress={handleConfirm} 
            disabled={!imageUri}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },
  previewArea: {
    width: '100%',
    height: '70%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retakeButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retakeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#636ae8',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});