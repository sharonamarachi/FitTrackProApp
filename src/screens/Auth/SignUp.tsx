import { useState } from 'react';
import { View, TextInput, Alert, StyleSheet, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../../api/supabaseClient';
import { SignUpScreenProps } from '../../navigation/types';


export default function SignUp({ navigation }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState('');

  const checkUsernameAvailability = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.toLowerCase());
      
      if (error) {
        console.error('Username check error:', error);
        // If it's a "no rows" error, that means username is available
        if (error.code === 'PGRST116') return true;
        return false; // Assume taken to be safe
      }
      
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

const handleSignUp = async () => {
  const newErrors: {[key: string]: string} = {};

  // --- Validations ---
  if (!email.trim()) newErrors.email = 'Email is required';
  if (!password.trim()) newErrors.password = 'Password is required';
  if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
  if (!username.trim()) newErrors.username = 'Username is required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.trim() && !emailRegex.test(email)) newErrors.email = 'Please enter a valid email';

  if (password.trim() && password.length < 6) newErrors.password = 'Password must be at least 6 characters';
  if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (username.trim() && !usernameRegex.test(username)) newErrors.username = 'Username must be 3-20 characters, letters/numbers/_ only';

  setErrors(newErrors);
  setSuccessMessage('');
  if (Object.keys(newErrors).length > 0) return;

  setLoading(true);

  try {
    // --- Sign up user ---
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (authError) {
      handleAuthError(authError);
      return;
    }

    if (authData.user) {
      const userId = authData.user.id;

      // --- Create user profile immediately ---
      const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: userId,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        setErrors({ general: 'Profile creation failed. Please contact support.' });
      } else {
        setSuccessMessage('Account created successfully! Please check your email to confirm your account.');
      }
    }
  } catch (error: any) {
    setErrors({ general: error.message || 'An unexpected error occurred.' });
  } finally {
    setLoading(false);
  }
};


  // Alternative profile creation without id field
  const createProfileWithoutId = async (userId: string, username: string, email: string) => {
    try {
      console.log('Attempting profile creation without id field...');
      
      // Try a raw query approach if the table structure is problematic
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase()
        });
      
      if (error) {
        console.error('Alternative profile creation failed:', error);
        setErrors({ general: 'Database configuration issue. Please contact support.' });
      }
    } catch (error) {
      console.error('Alternative profile creation error:', error);
      setErrors({ general: 'Please contact support for assistance.' });
    }
  };

  const handleAuthError = (error: any) => {
    console.log('Auth error details:', error);
    
    if (error.message?.includes('already registered') || 
        error.message?.includes('User already registered') ||
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('email address is already') ||
        error.message?.includes('already been registered') ||
        error.code === 'user_already_exists' ||
        error.code === 'email_already_exists') {
      setErrors({ email: 'An account with this email already exists. Please try logging in instead.' });
    } else if (error.message?.includes('Invalid email')) {
      setErrors({ email: 'Please enter a valid email address.' });
    } else if (error.message?.includes('Password should be at least')) {
      setErrors({ password: 'Password should be at least 6 characters long.' });
    } else {
      setErrors({ general: error.message || 'An unexpected error occurred during signup.' });
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
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.title}>FitTrack Pro</Text>
        <Text style={styles.subtitle}>Create Your Account</Text>
        
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
            placeholder="Username (3-20 characters)"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              clearError('username');
              clearError('general');
              clearSuccess();
            }}
            autoCapitalize="none"
            style={[styles.input, errors.username && styles.inputError]}
            editable={!loading}
          />
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        </View>

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
            placeholder="Password (min 6 characters)"
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

        <View style={styles.inputGroup}>
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearError('confirmPassword');
              clearError('general');
              clearSuccess();
            }}
            secureTextEntry
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            editable={!loading}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>
        
        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#4438c3ff" />
          ) : (
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Go to Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug info - remove in production */}
        <Text style={styles.debugText}>
          Debug: Check browser console for detailed errors
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
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
  buttonDisabled: {
    opacity: 0.6,
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
  debugText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});