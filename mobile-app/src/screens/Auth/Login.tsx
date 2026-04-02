import { useState } from 'react';
import { View, TextInput, Alert, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../api/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkOnboardingStatus } from '../Auth/Onboarding';
import { LoginScreenProps } from '../../navigation/types';


export default function Login({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async () => {
    const newErrors: {[key: string]: string} = {};

    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password.trim()) newErrors.password = 'Password is required';

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    setSuccessMessage('');
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
  
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrors({ general: 'Invalid email or password' });
      } else if (error.message.includes('Email not confirmed')) {
        setErrors({ general: 'Please confirm your email' });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }
  
     // Save token to AsyncStorage
    if (data?.session?.access_token) {
      await AsyncStorage.setItem('userToken', data.session.access_token);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const needsOnboarding = await checkOnboardingStatus();
      if (needsOnboarding) {
        navigation.replace('Onboarding');
      } else {
        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => {
          navigation.replace('Home');
        }, 800);
      }
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const clearSuccess = () => {
    setSuccessMessage('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitTrack Pro</Text>
      
      {successMessage && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
      
      {errors.general && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.general}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            clearError('email');
            clearError('general');
            clearSuccess();
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, errors.email && styles.inputError]}
          editable={!loading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearError('password');
            clearError('general');
            clearSuccess();
          }}
          secureTextEntry
          style={[styles.input, errors.password && styles.inputError]}
          editable={!loading}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={{ marginTop: 10 }}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => navigation.navigate('SignUp')}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go to Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  inputGroup: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#4438c3ff',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'white',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    minHeight: 50,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4438c3ff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  successContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
  },
});