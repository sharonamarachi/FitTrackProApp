import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import Slider from '@react-native-community/slider';

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
    };
  };
}

export default function IntervalTimerPlayback({ navigation, route }: Props) {
  const { exercises, workoutName } = route.params;

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting,   setIsResting]   = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(exercises[0]?.duration || 0);
  const [isPaused,    setIsPaused]    = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [volume,      setVolume]      = useState(0.8);
  const [isMaleVoice, setIsMaleVoice] = useState(false);
  const [showSettings,setShowSettings]= useState(false);

  // ── expo-audio (replaces expo-av) ────────────────────────────────────────────
  const player = useAudioPlayer(require('../../../assets/beep.mp3'));

  useEffect(() => {
    player.volume = volume;
  }, [volume]);

  useEffect(() => {
    // Cleanup speech on unmount
    return () => { Speech.stop(); };
  }, []);

  const playBeep = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const currentExercise = exercises[currentExerciseIndex];

  const progress = isResting
    ? ((currentExercise.restTime - timeLeft) / currentExercise.restTime) * 100
    : ((currentExercise.duration - timeLeft) / currentExercise.duration) * 100;

  const announceNext = (index: number, type: 'WORK' | 'REST' | 'DONE') => {
    const text =
      type === 'WORK' ? `Next exercise: ${exercises[index].name}` :
      type === 'REST' ? 'Rest'                                     :
                        'Workout complete. Great job!';

    Speech.speak(text, {
      rate:   0.9,
      volume: volume,
      voice:  Platform.OS === 'ios'
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
          announceNext(0, 'DONE');
          setIsCompleted(true);
        }
      }
    }
  };

  // ── Timer ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPaused || isCompleted) return;

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
  }, [isPaused, isCompleted, currentExerciseIndex, isResting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Completed screen ──────────────────────────────────────────────────────────

  if (isCompleted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={120} color="#10b981" />
          <Text style={styles.completedTitle}>Workout Complete!</Text>
          <Text style={styles.completedSubtitle}>Great job finishing {workoutName}</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.workoutTitle} numberOfLines={1}>{workoutName}</Text>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.closeButton}>
          <Ionicons name="volume-medium" size={24} color={showSettings ? '#10b981' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Audio settings panel */}
      {showSettings && (
        <View style={styles.audioSettingsCard}>
          <View style={styles.settingRow}>
            <Ionicons name="volume-high" size={20} color="#fff" />
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
          <TouchableOpacity style={styles.voiceToggle} onPress={() => setIsMaleVoice(!isMaleVoice)}>
            <Text style={styles.settingValue}>Voice: {isMaleVoice ? 'Male' : 'Female'}</Text>
            <Ionicons name="person" size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise progress strip */}
      <View style={styles.progressStrip}>
        {exercises.map((_, i) => (
          <View key={i} style={[styles.progressSegment, {
            backgroundColor:
              i < currentExerciseIndex  ? '#10b981' :
              i === currentExerciseIndex ? '#f97316' :
              'rgba(255,255,255,0.2)',
          }]} />
        ))}
      </View>

      {/* Circular timer */}
      <View style={styles.timerSection}>
        <View style={styles.circularContainer}>
          <Svg width={320} height={320}>
            <Circle cx={160} cy={160} r={152}
              stroke="rgba(255,255,255,0.1)" strokeWidth={16} fill="none" />
            <Circle cx={160} cy={160} r={152}
              stroke={isResting ? '#f97316' : '#10b981'}
              strokeWidth={16} fill="none"
              strokeDasharray={2 * Math.PI * 152}
              strokeDashoffset={2 * Math.PI * 152 - (progress / 100) * 2 * Math.PI * 152}
              strokeLinecap="round" rotation="-90" origin="160, 160"
            />
          </Svg>
          <View style={styles.circularContent}>
            <Text style={[styles.phaseText, { color: isResting ? '#f97316' : '#10b981' }]}>
              {isResting ? 'REST' : 'WORK'}
            </Text>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.exerciseNameText} numberOfLines={2}>
              {currentExercise.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Info cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>EXERCISE</Text>
          <Text style={styles.infoValue}>{currentExerciseIndex + 1}/{exercises.length}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>NEXT UP</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {currentExerciseIndex < exercises.length - 1
              ? exercises[currentExerciseIndex + 1].name
              : 'Finish 🎉'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleIntervalComplete}>
          <Ionicons name="play-skip-forward" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
          onPress={() => setIsPaused(p => !p)}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={40} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => navigation.goBack()}>
          <Ionicons name="stop" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#000' },

  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  closeButton:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  workoutTitle:       { flex: 1, fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginHorizontal: 8 },

  audioSettingsCard:  { backgroundColor: '#1a1a1a', marginHorizontal: 20, padding: 15, borderRadius: 12, marginBottom: 10 },
  settingRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  settingValue:       { color: '#fff', fontSize: 14 },
  voiceToggle:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 },

  progressStrip:      { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginVertical: 16 },
  progressSegment:    { flex: 1, height: 4, borderRadius: 2 },

  timerSection:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circularContainer:  { alignItems: 'center', justifyContent: 'center' },
  circularContent:    { position: 'absolute', alignItems: 'center', paddingHorizontal: 20 },
  phaseText:          { fontSize: 16, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  timeText:           { fontSize: 72, fontWeight: '700', color: '#fff' },
  exerciseNameText:   { fontSize: 18, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 },

  infoSection:        { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  infoCard:           { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  infoLabel:          { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4 },
  infoValue:          { fontSize: 15, fontWeight: '600', color: '#fff' },

  controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 20 },
  controlButton:      { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pauseButton:        { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  pauseButtonActive:  { backgroundColor: '#f97316' },

  completedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  completedTitle:     { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 20 },
  completedSubtitle:  { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginVertical: 10, textAlign: 'center' },
  doneButton:         { backgroundColor: '#10b981', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 16, marginTop: 30 },
  doneButtonText:     { fontSize: 18, fontWeight: '700', color: '#fff' },
});