import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { getDocumentById, Document } from '../../lib/documents.service.ts';
import { startDocumentChat } from '../../lib/chat.service.ts';
import { supabase } from '../../lib/supabaseClient.ts';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');

export default function DocumentDetailScreen() {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const headerTintColor = useThemeColor({}, 'headerTint');

  useEffect(() => {
    loadDocument();
  }, []);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view documents');
        router.replace('/');
        return;
      }
      
      const doc = await getDocumentById(params.id, session.user.id);
      if (doc) {
        setDocument(doc);
      } else {
        Alert.alert('Error', 'Document not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatWithDocument = async () => {
    if (!document) return;
    
    try {
      const chatSession = await startDocumentChat(document);
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatSession.id, isNew: 'true', documentId: document.id}
      });
    } catch (error) {
      console.error('Error starting chat with document:', error);
      Alert.alert('Error', 'Failed to start chat with this document');
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </ThemedView>
    );
  }

  if (!document) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Document not found</ThemedText>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: primaryColor }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: document.name,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={headerTintColor} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleChatWithDocument} style={styles.headerButton}>
              <Ionicons name="chatbubble" size={24} color={primaryColor} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ThemedView style={styles.container}>
        {document.images && document.images.length > 0 ? (
          <>
            <View style={[styles.mainImageContainer, { backgroundColor: cardColor }]}>
              <Image 
                source={{ uri: document.images[selectedImageIndex] }} 
                style={styles.mainImage}
                resizeMode="contain"
              />
            </View>
            {document.images.length > 1 && (
              <FlatList
                data={document.images}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.thumbnailContainer,
                      { borderColor: selectedImageIndex === index ? primaryColor : 'transparent' }
                    ]}
                    onPress={() => setSelectedImageIndex(index)}
                  >
                    <Image 
                      source={{ uri: item }} 
                      style={styles.thumbnail} 
                    />
                  </TouchableOpacity>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
              />
            )}
            <View style={[styles.infoContainer, { borderTopColor: borderColor }]}>
              <ThemedText style={styles.imageCounter}>
                Image {selectedImageIndex + 1} of {document.images.length}
              </ThemedText>
              <ThemedText style={[styles.dateText, { color: textSecondary }]}>
                Created on {new Date(document.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </>
        ) : (
          <View style={styles.noImagesContainer}>
            <Ionicons name="images-outline" size={64} color={textSecondary} />
            <ThemedText style={[styles.noImagesText, { color: textSecondary }]}>No images in this document</ThemedText>
          </View>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  mainImageContainer: {
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailList: {
    padding: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  selectedThumbnail: {
    // This class is no longer used, borderColor is set dynamically
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  imageCounter: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
  },
  noImagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noImagesText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});