import { useState } from 'react';
import {
  View, TextInput, StyleSheet, Text, ActivityIndicator,
  TouchableOpacity, ScrollView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    const newErrors: {[key: string]: string} = {};

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
          setSuccessMessage('Account created! Please login with your new credentials.');
        }
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    if (
      error.message?.includes('already registered') ||
      error.message?.includes('User already registered') ||
      error.message?.includes('already exists') ||
      error.code === 'user_already_exists' ||
      error.code === 'email_already_exists'
    ) {
      setErrors({ email: 'An account with this email already exists.' });
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.title}>FitTrack Pro</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>

          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.inputGroup}>
            <TextInput
              placeholder="Username (3-20 characters)"
              value={username}
              onChangeText={(text) => { setUsername(text); clearError('username'); clearError('general'); setSuccessMessage(''); }}
              autoCapitalize="none"
              style={[styles.input, errors.username && styles.inputError]}
              editable={!loading}
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={(text) => { setEmail(text); clearError('email'); clearError('general'); setSuccessMessage(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, errors.email && styles.inputError]}
              editable={!loading}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={[styles.passwordWrapper, errors.password && styles.inputError]}>
              <TextInput
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={(text) => { setPassword(text); clearError('password'); clearError('general'); setSuccessMessage(''); }}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={[styles.passwordWrapper, errors.confirmPassword && styles.inputError]}>
              <TextInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); clearError('general'); setSuccessMessage(''); }}
                secureTextEntry={!showConfirmPassword}
                style={styles.passwordInput}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={15}
                  color={password === confirmPassword ? '#4caf50' : '#ff4444'}
                />
                <Text style={[styles.matchText, { color: password === confirmPassword ? '#4caf50' : '#ff4444' }]}>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
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
                <Text style={styles.buttonText}>Sign Up</Text>
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
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  inputGroup: { marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#4438c3ff',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'white',
    fontSize: 16,
  },
  // Password field with eye toggle
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4438c3ff',
    borderRadius: 10,
    backgroundColor: 'white',
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeBtn: {
    padding: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    marginLeft: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 18, marginBottom: 30, textAlign: 'center', color: '#666' },
  buttonContainer: { minHeight: 50, justifyContent: 'center' },
  button: { backgroundColor: '#4438c3ff', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#e0e0e0' },
  secondaryButtonText: { color: '#333' },
  errorContainer: {
    backgroundColor: '#ffebee', padding: 10, borderRadius: 8,
    marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#ff4444',
  },
  inputError: { borderColor: '#ff4444', borderWidth: 2 },
  errorText: { color: '#ff4444', fontSize: 14, marginTop: 5, marginLeft: 5 },
  successContainer: {
    backgroundColor: '#e8f5e8', padding: 12, borderRadius: 8,
    marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#4caf50',
  },
  successText: { color: '#2e7d32', fontSize: 14, fontWeight: '500' },
});