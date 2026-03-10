import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Slider from '@react-native-community/slider';
import { supabase } from '../../api/supabaseClient';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import CountdownOverlay from '../../components/CountdownOverlay';

const { width } = Dimensions.get('window');

interface Exercise {
  name: string;
  duration: number;
  restTime: number;
}

interface Props {
  navigation: any;
  route: {
    params: {
      exercises: Exercise[];
      workoutName: string;
      workoutId?: string;
    };
  };
}

export default function IntervalTimerPlayback({ navigation, route }: Props) {
  const { exercises, workoutName, workoutId } = route.params;

  // Pull in user preferences as defaults
  const {
    beepsEnabled: prefBeeps,
    coachVoiceEnabled: prefCoach,
    coachVoiceGender: prefGender,
  } = useUserPreferences();

  // Session-level overrides (start from prefs, adjustable in-session)
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercises[0]?.duration || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [beepsEnabled, setBeepsEnabled] = useState(prefBeeps);
  const [coachEnabled, setCoachEnabled] = useState(prefCoach);
  const [isMaleVoice, setIsMaleVoice] = useState(prefGender === 'male');
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync prefs when they change (e.g. if user opens settings mid-workout — unlikely but safe)
  useEffect(() => { setBeepsEnabled(prefBeeps); }, [prefBeeps]);
  useEffect(() => { setCoachEnabled(prefCoach); }, [prefCoach]);
  useEffect(() => { setIsMaleVoice(prefGender === 'male'); }, [prefGender]);

  const startTimeRef = useRef<Date>(new Date());
  const elapsedRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.Sound.createAsync(require('../../../assets/beep.mp3'))
      .then(({ sound }) => { soundRef.current = sound; })
      .catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(volume).catch(() => {});
  }, [volume]);

  const currentExercise = exercises[currentExerciseIndex];

  const progress = isResting
    ? ((currentExercise.restTime - timeLeft) / currentExercise.restTime) * 100
    : ((currentExercise.duration - timeLeft) / currentExercise.duration) * 100;

  const playBeep = async () => {
    if (!beepsEnabled) return;
    try {
      await soundRef.current?.setPositionAsync(0);
      await soundRef.current?.playAsync();
    } catch {}
  };

  const announceNext = (index: number, type: 'WORK' | 'REST' | 'DONE') => {
    if (!coachEnabled) return;
    const text =
      type === 'WORK' ? `Next: ${exercises[index].name}` :
      type === 'REST' ? 'Rest' :
      'Workout complete. Great job!';

    Speech.speak(text, {
      rate: 0.9,
      volume,
      voice: Platform.OS === 'ios'
        ? (isMaleVoice
          ? 'com.apple.ttsbundle.Daniel-compact'
          : 'com.apple.ttsbundle.Samantha-compact')
        : undefined,
    });
  };

  const handleIntervalComplete = () => {
    if (isResting) {
      if (currentExerciseIndex < exercises.length - 1) {
        const nextIdx = currentExerciseIndex + 1;
        announceNext(nextIdx, 'WORK');
        setCurrentExerciseIndex(nextIdx);
        setIsResting(false);
        setTimeLeft(exercises[nextIdx].duration);
      } else {
        elapsedRef.current = Math.round(
          (Date.now() - startTimeRef.current.getTime()) / 1000,
        );
        announceNext(0, 'DONE');
        setIsCompleted(true);
      }
    } else {
      if (currentExercise.restTime > 0) {
        announceNext(0, 'REST');
        setIsResting(true);
        setTimeLeft(currentExercise.restTime);
      } else {
        if (currentExerciseIndex < exercises.length - 1) {
          const nextIdx = currentExerciseIndex + 1;
          announceNext(nextIdx, 'WORK');
          setCurrentExerciseIndex(nextIdx);
          setTimeLeft(exercises[nextIdx].duration);
        } else {
          elapsedRef.current = Math.round(
            (Date.now() - startTimeRef.current.getTime()) / 1000,
          );
          announceNext(0, 'DONE');
          setIsCompleted(true);
        }
      }
    }
  };

  // Timer — only runs after countdown completes
  useEffect(() => {
    if (isCountingDown || isPaused || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleIntervalComplete();
          return 0;
        }
        const next = prev - 1;
        if (next <= 3 && next > 0) playBeep();
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCountingDown, isPaused, isCompleted, currentExerciseIndex, isResting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const saveWorkoutLog = async () => {
    if (!workoutId) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: log, error: logError } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          title: workoutName,
          duration_seconds: elapsedRef.current,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) throw logError;

      if (log) {
        const exerciseLogs = exercises.map((ex) => ({
          log_id: log.id,
          user_id: user.id,
          exercise_name: ex.name,
          duration_seconds: ex.duration ?? null,
          logged_at: new Date().toISOString(),
        }));
        await supabase.from('exercise_logs').insert(exerciseLogs);
      }

      navigation.goBack();
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err.message || 'Failed to save workout log');
    }
  };

  // ── Completed Screen ──────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>🎉</Text>
          <Ionicons name="checkmark-circle" size={90} color="#10b981" />
          <Text style={styles.completedTitle}>Workout Complete!</Text>
          <Text style={styles.completedSubtitle}>
            Great job finishing {workoutName}
          </Text>
          <View style={styles.completedStats}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>{exercises.length}</Text>
              <Text style={styles.completedStatLabel}>Exercises</Text>
            </View>
            <View style={styles.completedStatDivider} />
            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>
                {formatElapsed(elapsedRef.current)}
              </Text>
              <Text style={styles.completedStatLabel}>Duration</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={saveWorkoutLog}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done-circle" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving…' : 'Save & Finish'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipSaveButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.skipSaveButtonText}>Don't Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Screen ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 3-2-1 Countdown Overlay */}
      {isCountingDown && (
        <CountdownOverlay
          onComplete={() => {
            setIsCountingDown(false);
            startTimeRef.current = new Date();
            if (coachEnabled) announceNext(0, 'WORK');
          }}
          primaryColor="#10b981"
          playBeep={playBeep}
          beepsEnabled={beepsEnabled}
          coachVoiceEnabled={coachEnabled}
          coachVoiceGender={isMaleVoice ? 'male' : 'female'}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.workoutTitle} numberOfLines={1}>{workoutName}</Text>
          <Text style={styles.workoutSubtitle}>
            {currentExerciseIndex + 1} of {exercises.length} exercises
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(!showSettings)}
          style={styles.closeButton}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={showSettings ? '#10b981' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Audio/settings panel */}
      {showSettings && (
        <View style={styles.audioSettingsCard}>
          {/* Beeps toggle */}
          <View style={styles.settingRow}>
            <Ionicons
              name={beepsEnabled ? 'musical-notes' : 'musical-notes-outline'}
              size={18} color={beepsEnabled ? '#10b981' : 'rgba(255,255,255,0.4)'}
            />
            <Text style={[styles.settingLabel, !beepsEnabled && styles.settingLabelOff]}>
              Countdown Beeps
            </Text>
            <TouchableOpacity
              style={[styles.miniToggle, beepsEnabled && styles.miniToggleOn]}
              onPress={() => setBeepsEnabled(v => !v)}
            >
              <Text style={styles.miniToggleText}>{beepsEnabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Coach voice toggle */}
          <View style={styles.settingRow}>
            <Ionicons
              name={coachEnabled ? 'mic' : 'mic-off'}
              size={18} color={coachEnabled ? '#10b981' : 'rgba(255,255,255,0.4)'}
            />
            <Text style={[styles.settingLabel, !coachEnabled && styles.settingLabelOff]}>
              Coach Voice
            </Text>
            <TouchableOpacity
              style={[styles.miniToggle, coachEnabled && styles.miniToggleOn]}
              onPress={() => setCoachEnabled(v => !v)}
            >
              <Text style={styles.miniToggleText}>{coachEnabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Voice gender */}
          {coachEnabled && (
            <View style={styles.settingRow}>
              <Ionicons name="person" size={18} color="#a78bfa" />
              <Text style={styles.settingLabel}>Voice</Text>
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[styles.genderBtn, !isMaleVoice && styles.genderBtnActive]}
                  onPress={() => setIsMaleVoice(false)}
                >
                  <Text style={[styles.genderBtnText, !isMaleVoice && styles.genderBtnTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, isMaleVoice && styles.genderBtnActive]}
                  onPress={() => setIsMaleVoice(true)}
                >
                  <Text style={[styles.genderBtnText, isMaleVoice && styles.genderBtnTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Volume slider */}
          <View style={[styles.settingRow, { marginTop: 4 }]}>
            <Ionicons name="volume-high" size={18} color="#fff" />
            <Slider
              style={{ flex: 1, marginHorizontal: 10 }}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={setVolume}
              minimumTrackTintColor="#10b981"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
            />
            <Text style={styles.settingValue}>{Math.round(volume * 100)}%</Text>
          </View>
        </View>
      )}

      {/* Exercise progress strip */}
      <View style={styles.progressStrip}>
        {exercises.map((_, i) => (
          <View
            key={i}
            style={[styles.progressSegment, {
              backgroundColor:
                i < currentExerciseIndex ? '#10b981' :
                i === currentExerciseIndex ? (isResting ? '#f97316' : '#10b981') :
                'rgba(255,255,255,0.2)',
            }]}
          />
        ))}
      </View>

      {/* Phase pill */}
      <View style={styles.phasePillRow}>
        <View style={[styles.phasePill, { borderColor: isResting ? '#f97316' : '#10b981' }]}>
          <View style={[styles.phaseDot, { backgroundColor: isResting ? '#f97316' : '#10b981' }]} />
          <Text style={[styles.phasePillText, { color: isResting ? '#f97316' : '#10b981' }]}>
            {isResting ? 'REST' : 'WORK'}
          </Text>
          {isPaused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Circular timer */}
      <View style={styles.timerSection}>
        <View style={styles.circularContainer}>
          <Svg width={300} height={300}>
            <Circle cx={150} cy={150} r={142}
              stroke="rgba(255,255,255,0.08)" strokeWidth={14} fill="none" />
            <Circle cx={150} cy={150} r={142}
              stroke={isResting ? '#f97316' : '#10b981'}
              strokeWidth={14} fill="none"
              strokeDasharray={2 * Math.PI * 142}
              strokeDashoffset={
                2 * Math.PI * 142 - (progress / 100) * 2 * Math.PI * 142
              }
              strokeLinecap="round" rotation="-90" origin="150, 150"
            />
          </Svg>
          <View style={styles.circularContent}>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.exerciseNameText} numberOfLines={2}>
              {currentExercise.name}
            </Text>
            {currentExercise.restTime > 0 && !isResting && (
              <View style={styles.restBadge}>
                <Text style={styles.restBadgeText}>
                  ⏸ {currentExercise.restTime}s rest after
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Info cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>PREVIOUS</Text>
          <Text style={styles.infoValue}>
            {currentExerciseIndex > 0
              ? exercises[currentExerciseIndex - 1].name : '—'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>NEXT UP</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {currentExerciseIndex < exercises.length - 1
              ? exercises[currentExerciseIndex + 1].name : 'Finish 🎉'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>REMAINING</Text>
          <Text style={[styles.infoValue, { color: '#10b981' }]}>
            {exercises.length - currentExerciseIndex - 1} left
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (currentExerciseIndex > 0) {
              const prevIdx = currentExerciseIndex - 1;
              setCurrentExerciseIndex(prevIdx);
              setIsResting(false);
              setTimeLeft(exercises[prevIdx].duration);
            }
          }}
        >
          <Ionicons name="play-skip-back" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
          onPress={() => setIsPaused(p => !p)}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={36} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleIntervalComplete}
        >
          <Ionicons name="play-skip-forward" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingBottom: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8,
  },
  closeButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  workoutTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  workoutSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  // Settings panel
  audioSettingsCard: {
    backgroundColor: '#161616',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  settingLabelOff: { color: 'rgba(255,255,255,0.35)' },
  settingValue: { color: '#fff', fontSize: 13, minWidth: 36, textAlign: 'right' },
  miniToggle: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  miniToggleOn: { backgroundColor: '#10b981' },
  miniToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  genderBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  genderBtnActive: { backgroundColor: '#a78bfa' },
  genderBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  genderBtnTextActive: { color: '#fff' },

  progressStrip: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 5, marginTop: 10, marginBottom: 8,
  },
  progressSegment: { flex: 1, height: 3, borderRadius: 2 },

  phasePillRow: { alignItems: 'center', marginBottom: 4 },
  phasePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  phaseDot: { width: 8, height: 8, borderRadius: 4 },
  phasePillText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  pausedBadge: {
    backgroundColor: '#92400e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  pausedText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },

  timerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circularContainer: { alignItems: 'center', justifyContent: 'center' },
  circularContent: {
    position: 'absolute', alignItems: 'center', paddingHorizontal: 24,
  },
  timeText: { fontSize: 68, fontWeight: '700', color: '#fff', letterSpacing: -2 },
  exerciseNameText: {
    fontSize: 17, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', marginTop: 6, fontWeight: '600',
  },
  restBadge: {
    marginTop: 8, backgroundColor: 'rgba(249,115,22,0.2)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  restBadgeText: { color: '#f97316', fontSize: 12, fontWeight: '600' },

  infoSection: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  infoCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 12, alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, marginBottom: 4,
  },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingBottom: 50, gap: 24,
  },
  controlButton: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  pauseButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center',
  },
  pauseButtonActive: { backgroundColor: '#f97316' },

  completedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 4,
  },
  completedEmoji: { fontSize: 56, marginBottom: 8 },
  completedTitle: {
    fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 16, marginBottom: 4,
  },
  completedSubtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 24,
  },
  completedStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 36,
    alignItems: 'center', gap: 24, marginBottom: 32, width: '100%', justifyContent: 'center',
  },
  completedStat: { alignItems: 'center', gap: 4 },
  completedStatValue: { fontSize: 28, fontWeight: '800', color: '#10b981' },
  completedStatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  completedStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#10b981', paddingHorizontal: 40, paddingVertical: 18,
    borderRadius: 18, width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  saveButtonText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  skipSaveButton: {
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', width: '100%', alignItems: 'center',
  },
  skipSaveButtonText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
});