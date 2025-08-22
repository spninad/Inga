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
import { supabase } from '../../lib/supabaseClient.ts';
import { FormSchema, FilledForm, getForms, getFilledForms } from '../../lib/forms.service.ts';

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
    router.push('/create-form');
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
            // Navigate directly to manual form filling (voice temporarily disabled)
            router.push({
              pathname: '/forms/screens/ManualFormScreen',
              params: { formId: item.id }
            });
            
            // Previous alert with voice option (disabled):
            // Alert.alert(
            //   'Fill Form',
            //   `Fill out "${item.name}" manually or with voice assistance?`,
            //   [
            //     {
            //       text: 'Manual',
            //       onPress: () => router.push({
            //         pathname: '/forms/screens/ManualFormScreen',
            //         params: { formId: item.id }
            //       })
            //     },
            //     {
            //       text: 'Voice',
            //       onPress: () => router.push({
            //         pathname: '/forms/screens/VoiceChatScreen',
            //         params: { formId: item.id }
            //       })
            //     },
            //     { text: 'Cancel', style: 'cancel' }
            //   ]
            // );
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
          title: 'My Forms',
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
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    marginTop: 24,
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 24,
  },
  formItem: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  formPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  formInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: -0.2,
  },
  formDescription: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 22,
  },
  formStats: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '500',
  },
  filledFormItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  filledFormIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginTop: 80,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 24,
    letterSpacing: -0.3,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: '80%',
    lineHeight: 24,
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  authRequiredText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 24,
    letterSpacing: -0.3,
  },
  authRequiredSubText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: '80%',
    lineHeight: 24,
  },
});
