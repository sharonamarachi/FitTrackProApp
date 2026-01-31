import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { supabase } from '../../api/supabaseClient';

export default function CreateWorkout({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [exercises, setExercises] = useState<Array<{ name: string; sets?: number; reps?: number }>>([]);
  const [loading, setLoading] = useState(false);

  const categories = ['Core', 'Glutes', 'Upper', 'Lower', 'Cardio', 'Full Body'];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a workout title');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    // Validate exercises
    const invalidExercise = exercises.find(ex => !ex.name.trim());
    if (invalidExercise) {
      Alert.alert('Error', 'All exercises must have a name');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('workouts').insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        category: category,
        exercises: exercises,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Workout created!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating workout:', error);
      Alert.alert('Error', error.message || 'Failed to create workout');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10 }]);
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Create Workout"
        subtitle="Build your custom workout"
        rightAction={{
          icon: 'checkmark',
          onPress: () => {
            if (!loading) handleSave();
          },
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Workout Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning Routine"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this workout about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!loading}
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Exercises */}
        <View style={styles.field}>
          <View style={styles.exerciseHeaderRow}>
            <Text style={styles.label}>Exercises ({exercises.length})</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={addExercise}
              disabled={loading}
            >
              <Ionicons name="add-circle" size={24} color={loading ? "#ccc" : "#4438c3"} />
              <Text style={[styles.addButtonText, loading && { color: '#ccc' }]}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>#{index + 1}</Text>
                <TouchableOpacity 
                  onPress={() => removeExercise(index)}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={24} color={loading ? "#ccc" : "#ff4444"} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Exercise name (e.g., Push-ups)"
                value={exercise.name}
                onChangeText={(text) => updateExercise(index, 'name', text)}
                editable={!loading}
              />

              <View style={styles.exerciseRow}>
                <View style={styles.exerciseInputGroup}>
                  <Text style={styles.exerciseLabel}>Sets</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="3"
                    keyboardType="number-pad"
                    value={exercise.sets?.toString() || ''}
                    onChangeText={(text) =>
                      updateExercise(index, 'sets', parseInt(text) || 0)
                    }
                    editable={!loading}
                  />
                </View>

                <View style={styles.exerciseInputGroup}>
                  <Text style={styles.exerciseLabel}>Reps</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="10"
                    keyboardType="number-pad"
                    value={exercise.reps?.toString() || ''}
                    onChangeText={(text) =>
                      updateExercise(index, 'reps', parseInt(text) || 0)
                    }
                    editable={!loading}
                  />
                </View>
              </View>
            </View>
          ))}

          {exercises.length === 0 && (
            <View style={styles.emptyExercises}>
              <Ionicons name="barbell-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No exercises added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Exercise" to get started</Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4438c3" />
            <Text style={styles.loadingText}>Saving workout...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryChipActive: {
    backgroundColor: '#4438c3',
    borderColor: '#4438c3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 15,
    color: '#4438c3',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4438c3',
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  exerciseInputGroup: {
    flex: 1,
  },
  exerciseLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  smallInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  emptyExercises: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  loadingOverlay: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});