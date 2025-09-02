import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { getForms } from '../lib/forms.service';
import { FormSchema } from '../types/form';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';

export default function FormsScreen() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useFocusEffect(
    useCallback(() => {
      getUserAndLoadForms();
    }, [])
  );

  const getUserAndLoadForms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view your forms');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);
      await loadForms(session.user.id);
    } catch (error) {
      console.error('Error getting authentication:', error);
      setIsLoading(false);
    }
  };

  const loadForms = async (uid: string) => {
    try {
      setIsLoading(true);
      const formsData = await getForms(uid);
      setForms(formsData);
    } catch (error) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateForm = () => {
    // This would navigate to a form builder screen
    Alert.alert('Coming Soon', 'Form builder will be available in a future update');
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!userId) {
    return (
      <ThemedView style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed" size={64} color={colors.textTertiary} />
        <ThemedText style={styles.authRequiredText}>Authentication Required</ThemedText>
        <ThemedText style={styles.authRequiredSubText}>
          Please sign in to view and manage your forms
        </ThemedText>
      </ThemedView>
    );
  }

  const renderFormItem = ({ item }: { item: FormSchema }) => {
    return (
      <ThemedCard style={styles.formItem}>
        <TouchableOpacity
          style={styles.formPreview}
          onPress={() => {
            // Navigate to fill form screen for this template
            router.push(`/fill-form-template?formId=${item.id}`);
          }}
        >
          <View style={[styles.formIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
          </View>
          <View style={styles.formInfo}>
            <ThemedText style={styles.formName}>{item.name}</ThemedText>
            <ThemedText style={styles.formDescription}>
              {item.description || 'No description'}
            </ThemedText>
            <ThemedText style={styles.formStats}>
              {item.fields.length} fields
            </ThemedText>
          </View>
        </TouchableOpacity>
      </ThemedCard>
    );
  };


  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Forms',
          headerLargeTitle: true,
        }}
      />
      <ThemedView style={styles.container}>
        <ThemedButton
          title="Create Form"
          onPress={handleCreateForm}
          style={styles.createButton}
        />

        {forms.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Your Forms</ThemedText>
            <FlatList
              data={forms}
              keyExtractor={(item) => item.id}
              renderItem={renderFormItem}
              style={styles.section}
              contentContainerStyle={styles.sectionContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}


        {forms.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
            <ThemedText style={styles.emptyStateText}>No forms yet</ThemedText>
            <ThemedText style={styles.emptyStateSubText}>
              Create your first form or fill forms using documents
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
  },
  section: {
    flex: 1,
  },
  sectionContent: {
    paddingBottom: 16,
  },
  formItem: {
    padding: 12,
    marginBottom: 10,
  },
  formPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formIcon: {
    width: 60,
    height: 60,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 16,
    fontWeight: '500',
  },
  formDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  formStats: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  authRequiredText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  authRequiredSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
});