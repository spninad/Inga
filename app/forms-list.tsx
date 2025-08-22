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
import { supabase } from '../lib/supabaseClient.ts';
import { FormSchema, FilledForm, getForms, getFilledForms } from '../lib/forms.service.ts';

export default function FormsScreen() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [filledForms, setFilledForms] = useState<FilledForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

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
      const [formsData, filledFormsData] = await Promise.all([
        getForms(uid),
        getFilledForms(uid)
      ]);
      setForms(formsData);
      setFilledForms(filledFormsData);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.authRequiredText}>Authentication Required</Text>
        <Text style={styles.authRequiredSubText}>
          Please sign in to view and manage your forms
        </Text>
      </View>
    );
  }

  const renderFormItem = ({ item }: { item: FormSchema }) => {
    const completedCount = filledForms.filter(f => f.form_id === item.id && f.completed).length;
    const draftCount = filledForms.filter(f => f.form_id === item.id && !f.completed).length;

    return (
      <View style={styles.formItem}>
        <TouchableOpacity
          style={styles.formPreview}
          onPress={() => {
            // Navigate to form details/edit screen
            Alert.alert('Form Details', `${item.name}\n\n${item.description || 'No description'}`);
          }}
        >
          <View style={styles.formIcon}>
            <Ionicons name="document-text" size={32} color="#636ae8" />
          </View>
          <View style={styles.formInfo}>
            <Text style={styles.formName}>{item.name}</Text>
            <Text style={styles.formDescription}>
              {item.description || 'No description'}
            </Text>
            <Text style={styles.formStats}>
              {item.fields.length} fields • {completedCount} completed • {draftCount} drafts
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilledFormItem = ({ item }: { item: FilledForm }) => (
    <View style={styles.filledFormItem}>
      <View style={styles.filledFormIcon}>
        <Ionicons 
          name={item.completed ? "checkmark-circle" : "document"} 
          size={24} 
          color={item.completed ? "#28a745" : "#ffc107"} 
        />
      </View>
      <View style={styles.formInfo}>
        <Text style={styles.formName}>{item.form_name}</Text>
        <Text style={styles.formDate}>
          {item.completed ? 'Completed' : 'Draft'} • {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Forms',
          headerLargeTitle: true,
        }}
      />
      <View style={styles.container}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateForm}>
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.createButtonText}>Create Form</Text>
        </TouchableOpacity>

        {forms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Forms</Text>
            <FlatList
              data={forms}
              keyExtractor={(item) => item.id}
              renderItem={renderFormItem}
              style={styles.section}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {filledForms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <FlatList
              data={filledForms.slice(0, 5)}
              keyExtractor={(item) => item.id}
              renderItem={renderFilledFormItem}
              style={styles.section}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {forms.length === 0 && filledForms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No forms yet</Text>
            <Text style={styles.emptyStateSubText}>
              Create your first form or fill forms using documents
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
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#636ae8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  formItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
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
    backgroundColor: 'rgba(99, 106, 232, 0.1)',
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
    color: '#333',
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  formStats: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  filledFormItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  filledFormIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formDate: {
    fontSize: 12,
    color: '#999',
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
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  authRequiredText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
  },
  authRequiredSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
});