import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../api/supabaseClient';
import Header from '../../components/Header';

interface Profile {
  username: string;
  bio: string;
  gender: string;
}

const genderOptions = ['Man', 'Woman', 'Prefer not to say'];

export default function EditProfile({ navigation }: any) {
  const [profile, setProfile] = useState<Profile>({
    username: '',
    bio: '',
    gender: '',
  });
  const [weightInput, setWeightInput] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile | 'weight' | 'date_of_birth', string>>>({});
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          username: data.username || '',
          bio: data.bio || '',
          gender: data.gender || '',
        });
        setWeightInput(data.weight?.toString() || '');
        setBirthday(data.date_of_birth ? new Date(data.date_of_birth) : null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleWeightChange = (value: string) => {
    const filtered = value.replace(/[^0-9.]/g, '');
    setWeightInput(filtered);
    validateField('weight', filtered);
  };

  const validateField = (
    field: keyof Profile | 'weight' | 'date_of_birth',
    value: string | Date | null
  ) => {
    let newErrors = { ...errors };

    if (field === 'username') {
      const val = value as string;
      if (!val || val.length < 2) newErrors.username = 'Username must be at least 2 characters';
      else if (val.length > 30) newErrors.username = 'Username must be less than 30 characters';
      else if (!/^[a-zA-Z0-9._-]+$/.test(val)) newErrors.username = 'Only letters, numbers, dots, dashes, underscores';
      else delete newErrors.username;
    }

    if (field === 'bio') {
      const val = value as string;
      if (val && val.length > 500) newErrors.bio = 'Bio must be less than 500 characters';
      else delete newErrors.bio;
    }

    if (field === 'weight') {
      const val = parseFloat(value as string);
      if (value && (isNaN(val) || val <= 0 || val > 1000)) newErrors.weight = 'Enter a valid weight (1-1000 kg)';
      else delete newErrors.weight;
    }

    if (field === 'date_of_birth') {
      const val = value as Date;
      if (val) {
        const age = new Date().getFullYear() - val.getFullYear();
        if (age < 13) newErrors.date_of_birth = 'Must be at least 13 years old';
        else if (age > 120) newErrors.date_of_birth = 'Please enter a valid birth date';
        else delete newErrors.date_of_birth;
      }
    }

    setErrors(newErrors);
  };

  const validate = () => {
    validateField('username', profile.username);
    validateField('bio', profile.bio);
    validateField('weight', weightInput);
    if (birthday) validateField('date_of_birth', birthday);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not found');

      const newWeight = weightInput ? parseFloat(weightInput) : null;

      // 1. Update user_profiles — username is always safe.
      // bio/gender/weight/date_of_birth require you to run the ALTER TABLE migration.
      // If those columns don't exist yet, Supabase returns a 42703 error and we fall
      // back to updating only username so the save never silently does nothing.
      const fullPayload: Record<string, any> = {
        username: profile.username.trim(),
        updated_at: new Date().toISOString(),
        bio: profile.bio.trim(),
        gender: profile.gender || null,
        weight: newWeight,
        date_of_birth: birthday ? birthday.toISOString().split('T')[0] : null,
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(fullPayload)
        .eq('user_id', userId);

      if (profileError) {
        // Column likely doesn't exist yet — fall back to just updating username
        if (profileError.code === '42703' || profileError.message?.includes('column')) {
          const { error: fallbackError } = await supabase
            .from('user_profiles')
            .update({ username: profile.username.trim(), updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          if (fallbackError) throw fallbackError;
          Alert.alert(
            'Partial Save',
            'Username saved. To save bio, gender, weight and date of birth, run the ALTER TABLE migration in Supabase (see console for details).'
          );
          console.warn('Run in Supabase SQL editor:\nalter table user_profiles add column if not exists bio text, add column if not exists gender text, add column if not exists weight numeric, add column if not exists date_of_birth date;');
        } else {
          throw profileError;
        }
      }

      // 2. Always insert weight into body_measurements — this works regardless of
      // whether user_profiles has a weight column, and builds the Progress chart history.
      if (newWeight && !isNaN(newWeight)) {
        const { error: measurementError } = await supabase
          .from('body_measurements')
          .insert({
            user_id: userId,
            weight_kg: newWeight,
            recorded_at: new Date().toISOString(),
          });

        if (measurementError) {
          console.error('Body measurement save error:', measurementError);
          // Non-fatal
        }
      }

      if (!profileError) {
        Alert.alert('Success', 'Profile updated successfully');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthday(selectedDate);
      validateField('date_of_birth', selectedDate);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <Header
          title="Edit Profile"
          subtitle="Update your personal details"
          rightAction={{
            icon: 'checkmark',
            onPress: () => {
              if (!loading) handleSave();
            },
          }}
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={100} color="#aaa" />
          </View>

          {/* Username */}
          <FormField
            label="Username *"
            value={profile.username}
            onChangeText={(value: string) => updateProfile('username', value)}
            error={errors.username}
            placeholder="Enter your username"
            maxLength={30}
            showCharCount
          />

          {/* Bio */}
          <FormField
            label="Bio"
            value={profile.bio}
            onChangeText={(value: string) => updateProfile('bio', value)}
            error={errors.bio}
            placeholder="Tell us about yourself"
            multiline
            maxLength={500}
            showCharCount
          />

          {/* Gender */}
          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={[styles.dropdown, errors.gender && styles.errorInput]}
              onPress={() => setShowGenderModal(true)}
            >
              <Text
                style={profile.gender ? styles.dropdownText : styles.placeholderText}
              >
                {profile.gender || 'Select Gender'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#333" />
            </TouchableOpacity>
            {errors.gender && (
              <Text style={styles.errorText}>{errors.gender}</Text>
            )}
          </View>

          <Modal visible={showGenderModal} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.option,
                        profile.gender === option && { backgroundColor: '#eee' },
                      ]}
                      onPress={() => {
                        updateProfile('gender', option);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text>{option}</Text>
                      {profile.gender === option && (
                        <Ionicons name="checkmark" size={18} color="#4438c3" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Date of Birth */}
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={[styles.dropdown, errors.date_of_birth && styles.errorInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={birthday ? styles.dropdownText : styles.placeholderText}>
                {birthday ? birthday.toDateString() : 'Select Date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#333" />
            </TouchableOpacity>
            {errors.date_of_birth && (
              <Text style={styles.errorText}>{errors.date_of_birth}</Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={birthday || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Weight */}
          <FormField
            label="Weight (kg)"
            value={weightInput}
            onChangeText={handleWeightChange}
            error={errors.weight}
            placeholder="Enter your weight"
            keyboardType="decimal-pad"
          />
          <Text style={styles.weightHint}>
            Each save records a new entry in your weight history for the progress chart.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  showCharCount?: boolean;
  onChangeText: (value: string) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  showCharCount,
  value,
  ...props
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.errorInput]}
      value={value}
      {...props}
    />
    {showCharCount && (
      <Text style={styles.charCount}>
        {value.length}/{props.maxLength}
      </Text>
    )}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, paddingHorizontal: 20 },
  avatarContainer: { alignItems: 'center', marginVertical: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownText: { color: '#000' },
  placeholderText: { color: '#999' },
  errorText: { color: 'red', fontSize: 12, marginTop: 3 },
  errorInput: { borderColor: 'red' },
  charCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 2 },
  weightHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -12,
    marginBottom: 8,
    paddingHorizontal: 2,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: '50%',
  },
  option: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});