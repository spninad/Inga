import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient.ts';
import { FormSchema, getForms, createForm, commonFormTemplates } from '@/lib/forms.service.ts';

export default function SelectFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const documentId = params.documentId as string;

  const [forms, setForms] = useState<FormSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to access forms');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);

      // Load user's forms
      const userForms = await getForms(session.user.id);
      setForms(userForms);
    } catch (error) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectForm = (form: FormSchema) => {
    router.push({
      pathname: '/fill-form',
      params: {
        documentId,
        formId: form.id
      }
    });
  };

  const handleCreateFromTemplate = async (template: any) => {
    if (!userId) return;

    try {
      const newForm = await createForm(
        template.schema.name,
        template.schema.description || '',
        template.schema.fields,
        userId
      );

      if (newForm) {
        setForms(prev => [newForm, ...prev]);
        handleSelectForm(newForm);
      } else {
        Alert.alert('Error', 'Failed to create form from template');
      }
    } catch (error) {
      console.error('Error creating form from template:', error);
      Alert.alert('Error', 'Failed to create form from template');
    }
  };

  const renderFormItem = ({ item }: { item: FormSchema }) => (
    <TouchableOpacity
      style={styles.formItem}
      onPress={() => handleSelectForm(item)}
    >
      <View style={styles.formIcon}>
        <Ionicons name="document-text" size={24} color="#636ae8" />
      </View>
      <View style={styles.formInfo}>
        <Text style={styles.formName}>{item.name}</Text>
        <Text style={styles.formDescription}>
          {item.description || 'No description'}
        </Text>
        <Text style={styles.formFields}>
          {item.fields.length} field{item.fields.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderTemplateItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => handleCreateFromTemplate(item)}
    >
      <View style={styles.templateIcon}>
        <Ionicons name="add-circle" size={24} color="#28a745" />
      </View>
      <View style={styles.formInfo}>
        <Text style={styles.formName}>{item.name}</Text>
        <Text style={styles.formDescription}>{item.description}</Text>
        <Text style={styles.templateLabel}>Template • {item.category}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Select Form',
          headerLargeTitle: false,
        }}
      />
      <View style={styles.container}>
        {forms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Forms</Text>
            <FlatList
              data={forms}
              keyExtractor={(item) => item.id}
              renderItem={renderFormItem}
              style={styles.list}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>
          {forms.length > 0 ? 'Create from Templates' : 'Get Started with Templates'}
        </Text>
        <FlatList
          data={commonFormTemplates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateItem}
          style={styles.list}
        />

        {forms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No forms yet</Text>
            <Text style={styles.emptyStateSubText}>
              Create your first form from a template above
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  list: {
    marginBottom: 16,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#28a745',
    borderStyle: 'dashed',
  },
  formIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 106, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  formFields: {
    fontSize: 12,
    color: '#999',
  },
  templateLabel: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
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
});