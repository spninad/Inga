import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { ThemedButton } from '@/components/ThemedButton';
import { supabase } from '@/lib/supabaseClient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type AuthMode = 'login' | 'register' | 'forgotPassword';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        else {
          Alert.alert(
            'Registration successful',
            'Check your email for a confirmation link.'
          );
          setMode('login');
        }
      } else if (mode === 'forgotPassword') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) throw error;
        else {
          Alert.alert(
            'Password Reset Email Sent',
            'Check your email for a password reset link.'
          );
          setMode('login');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoid} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ThemedView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <ThemedText type="title" style={styles.title}>
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Reset Password'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {mode === 'login' ? 'Sign in to continue' : 
               mode === 'register' ? 'Sign up to get started' : 
               'Enter your email to receive a reset link'}
            </ThemedText>
          </View>

          <View style={styles.formContainer}>
            <ThemedTextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            {mode !== 'forgotPassword' && (
              <ThemedTextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}

            <ThemedButton
              title={mode === 'login' ? 'Sign In' : mode === 'register' ? 'Sign Up' : 'Send Reset Link'}
              onPress={handleAuth}
              loading={loading}
              style={styles.button}
            />
            
            {mode === 'login' && (
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => setMode('forgotPassword')}
              >
                <ThemedText type="link" style={styles.linkText}>Forgot Password?</ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.switchModeContainer}>
              <ThemedText>
                {mode === 'login' ? "Don't have an account? " : 
                 mode === 'register' ? "Already have an account? " :
                 "Remember your password? "}
              </ThemedText>
              <TouchableOpacity 
                onPress={() => {
                  if (mode === 'login') setMode('register');
                  else setMode('login');
                }}
              >
                <ThemedText type="link" style={styles.switchModeText}>
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  linkButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginVertical: 8,
  },
  linkText: {
    fontSize: 14,
  },
  switchModeContainer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  switchModeText: {
    fontWeight: '600',
  }
});