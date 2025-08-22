import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { createDocument, Document as CustomDocument } from '../lib/documents.service.ts'; // Alias the imported Document type
import { supabase } from '../lib/supabaseClient.ts';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';


export default function AddDocumentScreen({ onDocumentAdded }: { onDocumentAdded: (document: CustomDocument) => void }) { // Use the aliased type here
  const [documentName, setDocumentName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get the current user when component mounts
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Redirect to login if not authenticated
        Alert.alert('Authentication Required', 'Please sign in to continue');
        router.replace('/auth/login'); // Assuming you have a login screen
        return;
      }
      
      setUserId(session.user.id);
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to authenticate user');
    }
  };

  // Function to convert any image to JPEG format using expo-image-manipulator


  // Function to convert any image to JPEG format using expo-image-manipulator
  const convertToJpeg = async (uri: string): Promise<string> => {
    try {
      // Convert the image to JPEG format with slightly higher quality
      const manipResult = await manipulateAsync(
        uri,
        [], // no manipulations
        { format: SaveFormat.JPEG, compress: 0.9 } // convert to JPEG with better quality
      );
      
      // Read the converted image as base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (error) {
      console.error('Error converting image to JPEG:', error);
      throw error;
    }
  };

  const uploadImages = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to pick images.');
        return;
      }

      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 1, // Use maximum quality
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsLoading(true); // Show loading indicator while processing images

        try {
          // Process each selected image to Base64
          const processedImages = await Promise.all(
            result.assets.map(async (asset) => {
              const base64 = asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
              return `data:image/jpeg;base64,${base64}`;
            })
          );

          // Add the processed images to the `images` state
          setImages((prevImages) => [...prevImages, ...processedImages]);
          Alert.alert('Success', `${processedImages.length} images uploaded successfully!`);
        } catch (processError) {
          console.error('Error processing images:', processError);
          Alert.alert('Error', 'Failed to process selected images');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      Alert.alert('Error', 'Failed to upload images');
      setIsLoading(false);
    }
  };

  const scanImages = async () => {
    try {
      const scannedImages: string[] = []; // Array to store Base64 strings of scanned images

      const scanImage = async (): Promise<void> => {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to scan images.');
          return;
        }

        // Launch the camera
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          quality: 0.7,
          base64: true, // Ensure Base64 is included
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          // Convert the scanned image to Base64
          const base64Image = result.assets[0].base64
            ? `data:image/jpeg;base64,${result.assets[0].base64}`
            : await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.Base64,
              });

          if (!base64Image) {
            console.error('Failed to convert image to Base64');
            Alert.alert('Error', 'Failed to process the scanned image.');
            return;
          }

          // Add the scanned image to the array
          scannedImages.push(base64Image);

          // Prompt the user to scan another image
          return new Promise<void>((resolve) => {
            Alert.alert(
              'Scan Another?',
              'Do you want to scan another image?',
              [
                { text: 'No', onPress: () => resolve() }, // Finish scanning
                { text: 'Yes', onPress: async () => await scanImage().then(resolve) }, // Scan another image
              ]
            );
          });
        } else {
          console.log('User canceled the scan');
        }
      };

      await scanImage(); // Start the scanning process

      if (scannedImages.length > 0) {
        // Add scanned images to the `images` state
        setImages((prevImages) => [...prevImages, ...scannedImages]);
        Alert.alert('Success', `${scannedImages.length} images scanned successfully!`);
      } else {
        console.log('No images were scanned.');
      }
    } catch (error) {
      console.error('Error during image scanning:', error);
      Alert.alert('Error', 'An unexpected error occurred while scanning the images.');
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to continue');
      return;
    }

    if (!documentName.trim()) {
      Alert.alert('Required', 'Please enter a document name');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Required', 'Please upload or scan at least one image');
      return;
    }

    try {
      setIsLoading(true);
      
      // Extract the base64 data from the data URLs
      const base64Images = images.map(image => {
        const parts = image.split(',');
        // Handle both formats: with prefix or without
        return parts.length > 1 ? parts[1] : image;
      });
            

      // Save the document to Supabase with the array of image strings
      const document = await createDocument(documentName, images, userId);

      if (!document) {
        throw new Error('Failed to create document');
      }

      Alert.alert('Success', 'Document created successfully', [
        {
          text: 'OK',
          onPress: () => router.back()
        },
      ]);
    } catch (error) {
      console.error('Error creating document:', error);
      Alert.alert('Error', 'Failed to create document');
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const isSaveDisabled = !userId || !documentName.trim() || images.length === 0 || isLoading;

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Add Document',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.container}>
        {!userId ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#636ae8" />
            <Text style={styles.loadingText}>Authenticating...</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Document Name</Text>
                <TextInput
                  style={styles.input}
                  value={documentName}
                  onChangeText={setDocumentName}
                  placeholder="Enter document name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Images</Text>
                <TouchableOpacity style={styles.uploadImagesButton} onPress={uploadImages}>
                  <Ionicons name="images-outline" size={24} color="#636ae8" />
                  <Text style={styles.uploadImagesButtonText}>Upload Images</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.scanImagesButton} onPress={scanImages}>
                  <Ionicons name="camera-outline" size={24} color="#636ae8" />
                  <Text style={styles.scanImagesButtonText}>Scan Images</Text>
                </TouchableOpacity>
                
                {images.length > 0 && (
                  <View style={styles.imageList}>
                    {images.map((uri, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image source={{ uri }} style={styles.image} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.saveButton, isSaveDisabled && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaveDisabled}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 0,
  },
  formGroup: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontWeight: '500',
  },
  uploadImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  uploadImagesButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '600',
  },
  scanImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  scanImagesButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '600',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 12,
  },
  imageContainer: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
});