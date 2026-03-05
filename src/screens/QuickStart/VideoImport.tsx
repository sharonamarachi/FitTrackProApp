import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';
import { parseTranscript } from '../../services/transcriptNLPService';

// Your local backend IP — update this to your machine's IP on the same network
const BACKEND_URL = 'http://192.168.1.100:4000';

type Step = 'idle' | 'picked' | 'uploading' | 'transcribing' | 'parsing' | 'done' | 'error';

interface PickedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export default function VideoImport({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [step, setStep] = useState<Step>('idle');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      // Warn if file is large
      if (asset.size && asset.size > 200 * 1024 * 1024) {
        Alert.alert(
          'Large File',
          `This video is ${formatSize(asset.size)}. Processing may take a few minutes. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => setPickedFile({
                name: asset.name,
                uri: asset.uri,
                size: asset.size ?? 0,
                mimeType: asset.mimeType ?? 'video/mp4',
              }),
            },
          ]
        );
        return;
      }

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? 'video/mp4',
      });
      setStep('picked');
      setErrorMessage('');
    } catch (err: any) {
      Alert.alert('Error', 'Could not pick video: ' + err.message);
    }
  };

  const handleProcess = async () => {
    if (!pickedFile) return;

    try {
      // Step 1: Upload
      setStep('uploading');
      setProgress(10);
      setStatusMessage('Uploading video to local server...');

      const formData = new FormData();
      formData.append('video', {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType,
      } as any);

      setProgress(25);
      setStatusMessage('Extracting audio from video...');

      const response = await fetch(`${BACKEND_URL}/transcribe-video`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Step 2: Transcribing (server handles this)
      setStep('transcribing');
      setProgress(55);
      setStatusMessage('Transcribing speech with Whisper AI...');

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const { transcript } = await response.json();

      if (!transcript || transcript.length < 20) {
        throw new Error('No speech detected in video. Make sure the video has clear audio.');
      }

      // Step 3: Parse transcript locally
      setStep('parsing');
      setProgress(80);
      setStatusMessage('Extracting exercises from transcript...');

      await new Promise(resolve => setTimeout(resolve, 50)); // let UI update
      const parsed = parseTranscript(transcript);

      setProgress(100);
      setStep('done');
      setStatusMessage(`Found ${parsed.exercises.length} exercises!`);

      // Clean up cache file
      try {
        await FileSystem.deleteAsync(pickedFile.uri, { idempotent: true });
      } catch (_) {}

      // Navigate
      setTimeout(() => {
        navigation.navigate('CreateWorkoutTemplate', {
          importedData: {
            title: parsed.title,
            category: parsed.category,
            exercises: parsed.exercises.map(({ confidence, ...ex }) => ex),
            tags: parsed.tags,
          },
          importSource: 'video',
        });
      }, 800);

    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Processing failed');
      setProgress(0);

      // Clean up on error too
      try {
        if (pickedFile) await FileSystem.deleteAsync(pickedFile.uri, { idempotent: true });
      } catch (_) {}
    }
  };

  const reset = () => {
    setStep('idle');
    setPickedFile(null);
    setProgress(0);
    setStatusMessage('');
    setErrorMessage('');
  };

  const isProcessing = ['uploading', 'transcribing', 'parsing'].includes(step);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Video Import" subtitle="Upload your own workout video" />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Privacy badge */}
        <View style={[styles.privacyBadge, { backgroundColor: isDark ? '#10b98120' : '#d1fae5', borderColor: '#10b981' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.privacyTitle, { color: '#10b981' }]}>Privacy First</Text>
            <Text style={[styles.privacyText, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
              Video is processed locally on your device's server. Never uploaded to the cloud. Deleted immediately after transcription.
            </Text>
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>How it works</Text>
          {[
            { icon: 'phone-portrait-outline', color: '#3b82f6', text: 'You pick a video from your device' },
            { icon: 'mic-outline',            color: '#8b5cf6', text: 'Audio extracted locally with ffmpeg' },
            { icon: 'text-outline',           color: '#f97316', text: 'Whisper AI transcribes speech to text' },
            { icon: 'trash-outline',          color: '#ef4444', text: 'Video & audio deleted immediately' },
            { icon: 'barbell-outline',        color: '#10b981', text: 'Exercises extracted from transcript' },
          ].map((item, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* File picker */}
        {step === 'idle' || step === 'picked' ? (
          <TouchableOpacity
            style={[
              styles.dropZone,
              {
                backgroundColor: colors.surface,
                borderColor: pickedFile ? '#10b981' : colors.primary,
              },
            ]}
            onPress={handlePickVideo}
            activeOpacity={0.8}
          >
            <Ionicons
              name={pickedFile ? 'checkmark-circle' : 'cloud-upload-outline'}
              size={48}
              color={pickedFile ? '#10b981' : colors.primary}
            />
            {pickedFile ? (
              <>
                <Text style={[styles.dropTitle, { color: colors.text }]} numberOfLines={1}>
                  {pickedFile.name}
                </Text>
                <Text style={[styles.dropSub, { color: colors.textSecondary }]}>
                  {formatSize(pickedFile.size)} · Tap to change
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.dropTitle, { color: colors.text }]}>Tap to choose video</Text>
                <Text style={[styles.dropSub, { color: colors.textSecondary }]}>
                  MP4, MOV, AVI supported · Max 500MB
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Processing state */}
        {isProcessing || step === 'done' ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              {isProcessing
                ? <ActivityIndicator color={colors.primary} />
                : <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              }
              <Text style={[styles.progressStatus, { color: colors.text }]}>
                {statusMessage}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <View style={[styles.progressFill, {
                backgroundColor: step === 'done' ? '#10b981' : colors.primary,
                width: `${progress}%`,
              }]} />
            </View>
            <Text style={[styles.progressPct, { color: colors.textSecondary }]}>
              {progress}%
            </Text>

            {/* Steps indicators */}
            <View style={styles.stepsRow}>
              {[
                { label: 'Upload',     done: progress >= 25 },
                { label: 'Transcribe', done: progress >= 55 },
                { label: 'Parse',      done: progress >= 80 },
                { label: 'Done',       done: progress >= 100 },
              ].map((s, i) => (
                <View key={i} style={styles.stepIndicator}>
                  <View style={[styles.stepDot, {
                    backgroundColor: s.done ? '#10b981' : colors.surface,
                    borderColor: s.done ? '#10b981' : colors.border,
                  }]}>
                    {s.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  <Text style={[styles.stepLabel, {
                    color: s.done ? '#10b981' : colors.textTertiary,
                  }]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Error state */}
        {step === 'error' && (
          <View style={[styles.errorCard, { backgroundColor: isDark ? '#ef444420' : '#fee2e2', borderColor: '#ef4444' }]}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorTitle}>Processing Failed</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {step === 'picked' && (
          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: colors.primary }]}
            onPress={handleProcess}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={22} color="#fff" />
            <Text style={styles.processBtnText}>Process Video</Text>
          </TouchableOpacity>
        )}

        {step === 'error' && (
          <TouchableOpacity
            style={[styles.processBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={reset}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text style={[styles.processBtnText, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Requirements note */}
        {step === 'idle' && (
          <View style={[styles.noteCard, { backgroundColor: isDark ? colors.surface : '#fefce8', borderColor: '#fbbf24' }]}>
            <Ionicons name="information-circle" size={18} color="#f59e0b" />
            <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : '#92400e' }]}>
              Requires your local backend server to be running (`npm run server`) with ffmpeg and Whisper installed.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  content:         { padding: 20 },

  privacyBadge:    { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 20 },
  privacyTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  privacyText:     { fontSize: 13, lineHeight: 18 },

  card:            { borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:       { fontSize: 17, fontWeight: '700', marginBottom: 16 },

  step:            { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  stepIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText:        { fontSize: 14, flex: 1 },

  dropZone:        { borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', padding: 40, alignItems: 'center', gap: 10, marginBottom: 20 },
  dropTitle:       { fontSize: 16, fontWeight: '700' },
  dropSub:         { fontSize: 13 },

  progressHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressStatus:  { fontSize: 15, fontWeight: '600', flex: 1 },
  progressTrack:   { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill:    { height: '100%', borderRadius: 4 },
  progressPct:     { fontSize: 12, textAlign: 'right', marginBottom: 16 },

  stepsRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  stepIndicator:   { alignItems: 'center', gap: 6 },
  stepDot:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel:       { fontSize: 11, fontWeight: '600' },

  errorCard:       { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 20 },
  errorTitle:      { fontSize: 14, fontWeight: '700', color: '#ef4444', marginBottom: 4 },
  errorText:       { fontSize: 13, color: '#ef4444', lineHeight: 18 },

  processBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 18, gap: 10, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  processBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },

  noteCard:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 8 },
  noteText:        { flex: 1, fontSize: 13, lineHeight: 19 },
});