import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { processForm } from '../services/FormProcessingService';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function FormPreviewScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [isLoading, setIsLoading] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primaryTextColor = useThemeColor({}, 'primaryText');

  const handleConfirm = () => {
    if (!imageUri) return;

    setIsLoading(true);
    processForm(imageUri)
      .then(formFields => {
        console.log('Processed form fields:', formFields);
        router.push({
          pathname: '/forms/screens/ChoiceScreen',
          params: { imageUri, formFields: JSON.stringify({ fields: formFields }) },
        });
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Alert.alert('Processing Failed', errorMessage);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRetake = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Form Preview</ThemedText>
      <View style={[styles.previewArea, { backgroundColor: cardColor, borderColor }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color={textSecondary} />
            <ThemedText style={[styles.noImageText, { color: textSecondary }]}>No image found</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.retakeButton, { borderColor }]} 
          onPress={handleRetake} 
          disabled={isLoading}
        >
          <Ionicons name="camera-reverse" size={20} color={textSecondary} />
          <ThemedText style={[styles.retakeButtonText, { color: textSecondary }]}>Retake</ThemedText>
        </TouchableOpacity>
        
        {isLoading ? (
          <View style={[styles.button, styles.confirmButton, { backgroundColor: primaryColor }]}>
            <ActivityIndicator size="small" color={primaryTextColor} />
            <Text style={[styles.confirmButtonText, { color: primaryTextColor }]}>Processing...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton, { backgroundColor: primaryColor }, !imageUri && styles.buttonDisabled]} 
            onPress={handleConfirm} 
            disabled={!imageUri}
          >
            <Ionicons name="checkmark" size={20} color={primaryTextColor} />
            <ThemedText style={[styles.confirmButtonText, { color: primaryTextColor }]}>Confirm</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
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
    fontWeight: '700',
    marginBottom: 20,
  },
  previewArea: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
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
    borderWidth: 1,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    // backgroundColor will be set dynamically
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