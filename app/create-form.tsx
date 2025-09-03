import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabaseClient.ts';
import { createDocument } from '@/lib/documents.service.ts';
import { extractFormFromDocument } from '@/lib/form-extraction.service.ts';
import { createForm } from '@/lib/forms.service.ts';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function CreateFormScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'We need camera and photo library permissions to capture or select images for your forms.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processImages = async (imageUris: string[]) => {
    try {
      setIsProcessing(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to create forms');
        router.replace('/');
        return;
      }

      // Convert image URIs to base64 data URLs
      const imageBase64Array: string[] = [];
      
      for (const uri of imageUris) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        imageBase64Array.push(base64);
      }

      // Create document from images
      const documentName = `Form Document - ${new Date().toLocaleDateString()}`;
      const document = await createDocument(documentName, imageBase64Array, session.user.id);
      
      if (!document) {
        throw new Error('Failed to save document');
      }

      // Extract form from document using AI
      const extractedForm = await extractFormFromDocument(document);
      
      if (!extractedForm) {
        throw new Error('Failed to extract form from document');
      }

      // Convert ExtractedForm to FormSchema and save to forms list
      const formSchema = await createForm(
        extractedForm.name,
        extractedForm.description,
        extractedForm.fields.map(field => ({
          id: field.id,
          name: field.name,
          type: field.type,
          label: field.label,
          required: field.required || false,
          placeholder: field.placeholder,
          options: field.options
        })),
        session.user.id
      );

      if (!formSchema) {
        throw new Error('Failed to save form schema');
      }

      Alert.alert(
        'Form Created Successfully!',
        `Your form "${extractedForm.name}" has been created. You can now fill it out manually or using voice.`,
        [
          {
            text: 'Fill Manually',
            onPress: () => {
              router.replace({
                pathname: '/forms/screens/ManualFormScreen',
                params: { 
                  formId: formSchema.id,
                  documentId: document.id
                }
              });
            }
          },
          {
            text: 'Fill with Voice',
            onPress: () => {
              router.replace({
                pathname: '/forms/screens/VoiceChatScreen',
                params: { 
                  formId: formSchema.id,
                  documentId: document.id
                }
              });
            }
          },
          {
            text: 'View Forms',
            onPress: () => router.replace('/forms')
          }
        ]
      );

    } catch (error) {
      console.error('Error processing form:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create form from images. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processImages([result.assets[0].uri]);
    }
  };

  const handleSelectFromLibrary = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      await processImages(uris);
    }
  };

  const handleSelectExistingDocument = () => {
    router.push('/select-document-for-form');
  };

  if (isProcessing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Processing your form...</ThemedText>
        <ThemedText style={[styles.loadingSubText, { color: textSecondary }]}>
          We're using AI to extract form fields from your images
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Create Form',
          headerLargeTitle: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={64} color={primaryColor} />
          <ThemedText style={styles.title}>Create a Digital Form</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Turn paper forms into digital forms that can be filled out manually or with voice assistance
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity style={[styles.optionCard, { backgroundColor: cardColor, borderColor }]} onPress={handleTakePhoto}>
            <View style={[styles.optionIcon, { backgroundColor: `${primaryColor}1A` }]}>
              <Ionicons name="camera" size={32} color={primaryColor} />
            </View>
            <ThemedText style={styles.optionTitle}>Take Photo</ThemedText>
            <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
              Capture a form document with your camera
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: cardColor, borderColor }]} onPress={handleSelectFromLibrary}>
            <View style={[styles.optionIcon, { backgroundColor: `${primaryColor}1A` }]}>
              <Ionicons name="images" size={32} color={primaryColor} />
            </View>
            <ThemedText style={styles.optionTitle}>Choose from Photos</ThemedText>
            <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
              Select form images from your photo library
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: cardColor, borderColor }]} onPress={handleSelectExistingDocument}>
            <View style={[styles.optionIcon, { backgroundColor: `${primaryColor}1A` }]}>
              <Ionicons name="folder-open" size={32} color={primaryColor} />
            </View>
            <ThemedText style={styles.optionTitle}>Use Existing Document</ThemedText>
            <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
              Convert a previously saved document into a form
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoContainer, { backgroundColor: `${primaryColor}1A`, borderLeftColor: primaryColor }]}>
          <ThemedText style={styles.infoTitle}>How it works:</ThemedText>
          <ThemedText style={[styles.infoText, { color: textSecondary }]}>
            1. Capture or select images of your form{'\n'}
            2. Our AI extracts the form fields automatically{'\n'}
            3. Fill out the digital version manually or with voice{'\n'}
            4. Save and share your completed forms
          </ThemedText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoContainer: {
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
