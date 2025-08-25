import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabaseClient.ts';
import { getFilledFormsByFormId, FilledForm, getFormById, FormSchema } from '../../../lib/forms.service.ts';

export default function FilledFormsScreen() {
  const router = useRouter();
  const { formId } = useLocalSearchParams<{ formId: string }>();
  
  const [filledForms, setFilledForms] = useState<FilledForm[]>([]);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadFilledForms();
  }, []);

  const loadFilledForms = async () => {
    try {
      setIsLoading(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view forms');
        router.replace('/');
        return;
      }
      setUserId(session.user.id);

      if (!formId) {
        Alert.alert('Error', 'No form ID provided');
        router.back();
        return;
      }

      // Load the form schema and filled forms
      const [schema, filled] = await Promise.all([
        getFormById(formId),
        getFilledFormsByFormId(formId, session.user.id)
      ]);

      if (!schema) {
        Alert.alert('Error', 'Form not found');
        router.back();
        return;
      }

      setFormSchema(schema);
      setFilledForms(filled);

    } catch (error) {
      console.error('Error loading filled forms:', error);
      Alert.alert('Error', 'Failed to load filled forms');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilledFormItem = ({ item }: { item: FilledForm }) => (
    <TouchableOpacity
      style={styles.filledFormItem}
      onPress={() => {
        // In the future, this could navigate to a detailed view of the filled form
        Alert.alert(
          'Filled Form Details',
          `Status: ${item.completed ? 'Completed' : 'Draft'}\n` +
          `Created: ${new Date(item.created_at).toLocaleDateString()}\n` +
          `Updated: ${new Date(item.updated_at).toLocaleDateString()}`,
          [
            { text: 'OK' },
            {
              text: 'View Data',
              onPress: () => {
                // Show form data in a simple format
                const dataText = Object.entries(item.data)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('\n');
                Alert.alert('Form Data', dataText || 'No data');
              }
            }
          ]
        );
      }}
    >
      <View style={styles.statusIcon}>
        <Ionicons 
          name={item.completed ? "checkmark-circle" : "document"} 
          size={24} 
          color={item.completed ? "#28a745" : "#ffc107"} 
        />
      </View>
      <View style={styles.formInfo}>
        <Text style={styles.formTitle}>
          {item.completed ? 'Completed Form' : 'Draft Form'}
        </Text>
        <Text style={styles.formDate}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.formDate}>
          Updated: {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
        <Text style={styles.loadingText}>Loading filled forms...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Filled Forms',
          headerLargeTitle: false,
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{formSchema?.name || 'Form'}</Text>
          <Text style={styles.subtitle}>
            {filledForms.length} filled form{filledForms.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {filledForms.length > 0 ? (
          <FlatList
            data={filledForms}
            keyExtractor={(item) => item.id}
            renderItem={renderFilledFormItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No filled forms yet</Text>
            <Text style={styles.emptyStateSubText}>
              Fill out this form to see completed entries here
            </Text>
            <TouchableOpacity
              style={styles.fillButton}
              onPress={() => {
                router.push({
                  pathname: '/forms/screens/ManualFormScreen',
                  params: { formId }
                });
              }}
            >
              <Text style={styles.fillButtonText}>Fill Form</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  filledFormItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  formDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
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
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  fillButton: {
    backgroundColor: '#636ae8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  fillButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});