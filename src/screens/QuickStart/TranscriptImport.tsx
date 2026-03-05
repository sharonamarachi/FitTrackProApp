/**
 * TranscriptImport.tsx
 * 
 * Dependencies to install:
 *   npm install compromise
 *   npx expo install expo-document-picker expo-file-system
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';
import { parseTranscript, ExtractedExercise } from '../../services/transcriptNLPService';

type InputTab = 'paste' | 'file';

const MAX_CHARS = 8000;

export default function TranscriptImport({ navigation }: any) {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab,    setActiveTab]    = useState<InputTab>('paste');
  const [text,         setText]         = useState('');
  const [fileName,     setFileName]     = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result,       setResult]       = useState<ReturnType<typeof parseTranscript> | null>(null);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  // ── Tab switching ────────────────────────────────────────────────────────────

  const switchTab = (tab: InputTab) => {
    Animated.timing(tabAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setActiveTab(tab);
      setResult(null);
      Animated.spring(tabAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    });
  };

  // ── File picker ──────────────────────────────────────────────────────────────

  const handleFilePick = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      setFileName(asset.name);

      const content = await FileSystem.readAsStringAsync(asset.uri);
      if (content.length > MAX_CHARS) {
        Alert.alert(
          'File too large',
          `File has ${content.length.toLocaleString()} characters. Only the first ${MAX_CHARS.toLocaleString()} will be used.`,
        );
        setText(content.slice(0, MAX_CHARS));
      } else {
        setText(content);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not read file: ' + err.message);
    }
  };

  // ── Extract ──────────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('No text', 'Please enter or upload transcript text first.');
      return;
    }
    if (trimmed.length < 20) {
      Alert.alert('Too short', 'Please provide more text for accurate extraction.');
      return;
    }

    setIsExtracting(true);
    resultAnim.setValue(0);

    try {
      // Run off the synchronous JS thread via a tiny async wrapper so the
      // loading spinner actually renders before the (potentially heavy) parse.
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      const parsed = parseTranscript(trimmed);
      setResult(parsed);
      Animated.spring(resultAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    } catch (err: any) {
      Alert.alert('Extraction failed', err.message ?? 'Unknown error');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Navigate to edit ─────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!result) return;
    navigation.navigate('CreateWorkoutTemplate', {
      importedData:  {
        title:     result.title,
        category:  result.category,
        exercises: result.exercises.map(({ confidence, ...ex }) => ex),
        tags:      result.tags,
      },
      importSource: 'transcript',
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const confidenceColor = (c: number) =>
    c >= 0.9 ? '#10b981' : c >= 0.7 ? '#f97316' : '#ef4444';

  const confidenceLabel = (c: number) =>
    c >= 0.9 ? 'High' : c >= 0.7 ? 'Medium' : 'Low';

  const charCount = text.length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header
        title="Transcript Import"
        subtitle="Extract exercises from any workout text"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          {([ 
            { key: 'paste', icon: 'clipboard-outline',  label: 'Paste'  },
            { key: 'file',  icon: 'document-text-outline', label: 'File' },
          ] as { key: InputTab; icon: any; label: string }[]).map(t => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => switchTab(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: active ? '#fff' : colors.textSecondary },
                  active && styles.tabLabelActive,
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Input area ──────────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: tabAnim }}>

          {/* PASTE ──────────────────────────────────────────────────────────── */}
          {activeTab === 'paste' && (
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputCardHeader}>
                <Ionicons name="clipboard" size={18} color={colors.primary} />
                <Text style={[styles.inputCardTitle, { color: colors.text }]}>
                  Paste transcript or workout notes
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                multiline
                placeholder={`Paste any workout text here, for example:\n\n"3 sets of 10 push ups, then 4 sets of squats 12 reps, plank for 60 seconds..."`}
                placeholderTextColor={colors.textTertiary}
                value={text}
                onChangeText={t => {
                  setText(t.slice(0, MAX_CHARS));
                  setResult(null);
                }}
                textAlignVertical="top"
                autoCorrect={false}
              />
              <View style={styles.charRow}>
                <TouchableOpacity
                  onPress={() => { setText(''); setResult(null); }}
                  disabled={!text}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={text ? colors.textSecondary : colors.border}
                  />
                </TouchableOpacity>
                <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* FILE ────────────────────────────────────────────────────────────── */}
          {activeTab === 'file' && (
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.fileDropZone, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={handleFilePick}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
                <Text style={[styles.fileDropTitle, { color: colors.text }]}>
                  {fileName ?? 'Tap to choose a .txt file'}
                </Text>
                <Text style={[styles.fileDropSub, { color: colors.textSecondary }]}>
                  Plain text files only (.txt)
                </Text>
              </TouchableOpacity>

              {text.length > 0 && fileName && (
                <View style={[styles.filePreview, { backgroundColor: colors.surface }]}>
                  <Ionicons name="document-text" size={16} color={colors.primary} />
                  <Text style={[styles.filePreviewText, { color: colors.textSecondary }]} numberOfLines={3}>
                    {text.slice(0, 200)}{text.length > 200 ? '…' : ''}
                  </Text>
                  <TouchableOpacity onPress={() => { setText(''); setFileName(null); setResult(null); }}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

        </Animated.View>

        {/* ── Extract button ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.extractBtn,
            { backgroundColor: colors.primary },
            (!text.trim() || isExtracting) && { opacity: 0.45 },
          ]}
          onPress={handleExtract}
          disabled={!text.trim() || isExtracting}
          activeOpacity={0.8}
        >
          {isExtracting ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.extractBtnText}>Analysing…</Text>
            </>
          ) : (
            <>
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={styles.extractBtnText}>Extract Exercises</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Results ─────────────────────────────────────────────────────────── */}
        {result && (
          <Animated.View style={{ opacity: resultAnim, transform: [{ scale: resultAnim.interpolate({ inputRange: [0,1], outputRange: [0.95, 1] }) }] }}>

            {/* Summary banner */}
            <View style={[styles.resultBanner, {
              backgroundColor: result.exercises.length > 0
                ? (isDark ? '#10b98120' : '#d1fae5')
                : (isDark ? '#ef444420' : '#fee2e2'),
              borderColor: result.exercises.length > 0 ? '#10b981' : '#ef4444',
            }]}>
              <Ionicons
                name={result.exercises.length > 0 ? 'checkmark-circle' : 'warning'}
                size={22}
                color={result.exercises.length > 0 ? '#10b981' : '#ef4444'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.resultBannerTitle, {
                  color: result.exercises.length > 0 ? '#10b981' : '#ef4444',
                }]}>
                  {result.exercises.length > 0
                    ? `${result.exercises.length} exercise${result.exercises.length !== 1 ? 's' : ''} found`
                    : 'No exercises found'}
                </Text>
                {result.exercises.length > 0 && (
                  <Text style={[styles.resultBannerSub, { color: colors.textSecondary }]}>
                    Overall confidence: {' '}
                    <Text style={{ color: confidenceColor(result.confidence), fontWeight: '700' }}>
                      {confidenceLabel(result.confidence)} ({Math.round(result.confidence * 100)}%)
                    </Text>
                  </Text>
                )}
                {result.exercises.length === 0 && (
                  <Text style={[styles.resultBannerSub, { color: colors.textSecondary }]}>
                    Try adding exercise names like "push ups", "squats", "plank"
                  </Text>
                )}
              </View>
            </View>

            {/* Exercise chips */}
            {result.exercises.length > 0 && (
              <View style={[styles.chipsCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.chipsTitle, { color: colors.textSecondary }]}>
                  EXTRACTED EXERCISES
                </Text>
                <View style={styles.chipsWrap}>
                  {result.exercises.map((ex, i) => (
                    <ExerciseChip key={ex.id} exercise={ex} index={i} colors={colors} confidenceColor={confidenceColor} />
                  ))}
                </View>

                {/* Tags */}
                <View style={styles.tagsRow}>
                  {result.tags.map(tag => (
                    <View key={tag} style={[styles.tagChip, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Low-confidence warning */}
            {result.exercises.length > 0 && result.confidence < 0.75 && (
              <View style={[styles.warningCard, { backgroundColor: isDark ? '#f9731620' : '#fff7ed', borderColor: '#f97316' }]}>
                <Ionicons name="alert-circle" size={18} color="#f97316" />
                <Text style={[styles.warningText, { color: isDark ? '#fb923c' : '#9a3412' }]}>
                  Some matches had low confidence. Review and edit exercises before saving.
                </Text>
              </View>
            )}

            {/* Continue / Retry */}
            {result.exercises.length > 0 ? (
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: '#10b981' }]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueBtnTitle}>Review &amp; Edit Workout</Text>
                  <Text style={styles.continueBtnSub}>{result.title}</Text>
                </View>
                <Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setResult(null); }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={[styles.continueBtnTitle, { color: colors.text }]}>Try Again</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ── Tips ──────────────────────────────────────────────────────────── */}
        {!result && (
          <View style={[styles.tipsCard, { backgroundColor: isDark ? colors.surface : '#fefce8', borderColor: '#fbbf24' }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={18} color="#f59e0b" />
              <Text style={[styles.tipsTitle, { color: isDark ? colors.text : '#92400e' }]}>Tips for best results</Text>
            </View>
            {[
              'Include exercise names like "push ups", "squats", "plank"',
              'Mention sets and reps: "3 sets of 10", "4x12", "3 sets 12 reps"',
              'For timed exercises: "30 seconds", "1 minute plank"',
              'Works with YouTube captions, podcast transcripts, or typed notes',
            ].map((tip, i) => (
              <Text key={i} style={[styles.tipItem, { color: isDark ? colors.textSecondary : '#78350f' }]}>• {tip}</Text>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Exercise Chip ────────────────────────────────────────────────────────────

function ExerciseChip({
  exercise, index, colors, confidenceColor,
}: {
  exercise: ExtractedExercise;
  index: number;
  colors: any;
  confidenceColor: (c: number) => string;
}) {
  const meta = exercise.duration
    ? `${exercise.duration}s · ${exercise.restTime ?? 0}s rest`
    : `${exercise.sets ?? '?'} × ${exercise.reps ?? '?'}${exercise.weight ? ` · ${exercise.weight}kg` : ''}`;

  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: confidenceColor(exercise.confidence) + '66' }]}>
      <View style={[styles.chipIndex, { backgroundColor: confidenceColor(exercise.confidence) + '20' }]}>
        <Text style={[styles.chipIndexText, { color: confidenceColor(exercise.confidence) }]}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.chipName, { color: colors.text }]}>{exercise.name}</Text>
        <Text style={[styles.chipMeta, { color: colors.textSecondary }]}>{meta}</Text>
      </View>
      <View style={[styles.confDot, { backgroundColor: confidenceColor(exercise.confidence) }]} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { padding: 20, paddingBottom: 40 },

  // Tab bar
  tabBar:        { flexDirection: 'row', borderRadius: 18, padding: 4, marginBottom: 20, gap: 4 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  tabLabel:      { fontSize: 13, fontWeight: '600' },
  tabLabelActive:{ color: '#fff' },

  // Input card
  inputCard:     { borderRadius: 20, padding: 18, borderWidth: 1.5, marginBottom: 20, gap: 12 },
  inputCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputCardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },

  textArea:      { borderRadius: 14, padding: 14, fontSize: 15, lineHeight: 22, borderWidth: 1.5, minHeight: 180 },
  charRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:     { fontSize: 12 },

  // File tab
  fileDropZone:  { borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 10 },
  fileDropTitle: { fontSize: 15, fontWeight: '700' },
  fileDropSub:   { fontSize: 13 },
  filePreview:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 12 },
  filePreviewText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Extract button
  extractBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 18, gap: 10, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  extractBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Results
  resultBanner:  { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 16 },
  resultBannerTitle: { fontSize: 16, fontWeight: '800' },
  resultBannerSub:   { fontSize: 13, marginTop: 2 },

  chipsCard:     { borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chipsTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  chipsWrap:     { gap: 10 },

  chip:          { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  chipIndex:     { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipIndexText: { fontSize: 13, fontWeight: '800' },
  chipName:      { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  chipMeta:      { fontSize: 12 },
  confDot:       { width: 8, height: 8, borderRadius: 4 },

  tagsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tagChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText:       { fontSize: 11, fontWeight: '600' },

  warningCard:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 14 },
  warningText:   { flex: 1, fontSize: 13, lineHeight: 19 },

  continueBtn:   { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 20, gap: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  continueBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  continueBtnSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  tipsCard:      { borderRadius: 16, padding: 18, borderWidth: 1, gap: 8 },
  tipsHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsTitle:     { fontSize: 15, fontWeight: '700' },
  tipItem:       { fontSize: 13, lineHeight: 20 },
});