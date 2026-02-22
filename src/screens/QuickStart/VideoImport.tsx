import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/Header';
import { Exercise } from '../../domain/workout';
import { supabase } from '../../api/supabaseClient';
import { createWorkout } from '../../services/WorkoutService';

interface ParsedWorkout {
  title: string;
  exercises: Exercise[];
  confidence: number;
  source_url: string;
}

export default function VideoImport({ navigation }: any) {
  const { colors } = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null);

  useEffect(() => {
    // Handle incoming shares
    ReceiveSharingIntent.getReceivedFiles(
      (files: any) => {
        if (files && files.length > 0) {
          const sharedUrl = files[0].contentUri || files[0].data;
          if (sharedUrl && (sharedUrl.includes('tiktok.com') || sharedUrl.includes('youtube.com'))) {
            setUrl(sharedUrl);
          }
        }
      },
      (error: any) => {
        console.log('Share error:', error);
      }
    );

    return () => {
      ReceiveSharingIntent.clearReceivedFiles();
    };
  }, []);

  const parseVideoWorkout = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a video URL');
      return;
    }

    // Validate URL
    if (!url.includes('tiktok.com') && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      Alert.alert('Error', 'Please enter a valid TikTok or YouTube URL');
      return;
    }

    setLoading(true);

    try {
      // Call your backend API
      const response = await fetch('YOUR_BACKEND_URL/api/parse-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse video');
      }

      const result: ParsedWorkout = await response.json();
      setParsedWorkout(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to parse workout from video');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkout = async () => {
    if (!parsedWorkout) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { error } = await createWorkout(user.id, {
        title: parsedWorkout.title,
        exercises: parsedWorkout.exercises,
        category: 'imported',
        tags: ['video-import'],
        source: 'video-import',
        source_url: parsedWorkout.source_url,
      });

      if (error) throw error;

      Alert.alert('Success', 'Workout imported successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('WorkoutLibrary') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Import from Video" subtitle="TikTok or YouTube" />

      <ScrollView style={styles.content}>
        {/* URL Input Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Video URL
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Paste TikTok or YouTube URL"
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {url.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setUrl('')}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.parseButton,
              {
                backgroundColor: loading ? colors.surface : colors.primary,
              },
            ]}
            onPress={parseVideoWorkout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-download" size={20} color="#fff" />
                <Text style={styles.parseButtonText}>Parse Workout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview Section */}
        {parsedWorkout && (
          <View style={styles.section}>
            <View style={styles.previewHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Preview
              </Text>
              {parsedWorkout.confidence < 0.8 && (
                <View style={[styles.confidenceBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <Text style={[styles.confidenceText, { color: '#F59E0B' }]}>
                    Low confidence - review carefully
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.workoutCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.workoutTitle, { color: colors.text }]}>
                {parsedWorkout.title}
              </Text>

              <Text style={[styles.exerciseCount, { color: colors.textSecondary }]}>
                {parsedWorkout.exercises.length} exercises
              </Text>

              <View style={styles.exerciseList}>
                {parsedWorkout.exercises.map((exercise, index) => (
                  <View
                    key={index}
                    style={[
                      styles.exerciseItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.exerciseNumber}>
                      <Text style={[styles.exerciseNumberText, { color: colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text style={[styles.exerciseName, { color: colors.text }]}>
                        {exercise.name}
                      </Text>
                      <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
                        {exercise.sets && exercise.reps
                          ? `${exercise.sets} sets × ${exercise.reps} reps`
                          : exercise.duration
                          ? `${exercise.duration}s`
                          : 'No details'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveWorkout}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save to Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            How it works
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            1. Share a TikTok or YouTube workout video to this app
            {'\n'}2. We'll extract the exercises from the video caption
            {'\n'}3. Review and edit the workout before saving
            {'\n'}4. Find it in your Workout Library
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  parseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  workoutCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  workoutTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseCount: {
    fontSize: 14,
    marginBottom: 16,
  },
  exerciseList: {
    gap: 12,
    marginBottom: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(68, 56, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 13,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});