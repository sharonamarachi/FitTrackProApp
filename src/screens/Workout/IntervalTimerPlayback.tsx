import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Slider from '@react-native-community/slider'; // New dependency

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
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exercises[0]?.duration || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // --- NEW AUDIO SETTINGS STATE ---
  const [volume, setVolume] = useState(0.8);
  const [isMaleVoice, setIsMaleVoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const beepSound = useRef<Audio.Sound | null>(null);

  const currentExercise = exercises[currentExerciseIndex];
  const progress = isResting
    ? ((currentExercise.restTime - timeLeft) / currentExercise.restTime) * 100
    : ((currentExercise.duration - timeLeft) / currentExercise.duration) * 100;

  // Audio Setup
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/beep.mp3') 
        );
        beepSound.current = sound;
      } catch (error) {
        console.log("Audio load error:", error);
      }
    }
    setupAudio();
    return () => {
      beepSound.current?.unloadAsync();
      Speech.stop();
    };
  }, []);

  // Update beep volume when state changes
  useEffect(() => {
    beepSound.current?.setVolumeAsync(volume);
  }, [volume]);

  // Timer Logic
  useEffect(() => {
    if (isPaused || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextValue = prev - 1;
        if (nextValue <= 3 && nextValue > 0) playBeep();
        if (prev <= 1) {
          handleIntervalComplete();
          return 0;
        }
        return nextValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isCompleted, currentExerciseIndex, isResting]);

  const playBeep = async () => {
    try {
      await beepSound.current?.replayAsync();
    } catch (e) {}
  };

  const announceNext = (index: number, type: 'WORK' | 'REST' | 'DONE') => {
    let text = "";
    if (type === 'WORK') text = `Next exercise: ${exercises[index].name}`;
    else if (type === 'REST') text = "Rest";
    else text = "Workout complete. Great job!";

    Speech.speak(text, { 
      rate: 0.9, 
      volume: volume,
      // Attempting to select voice gender (platform dependent)
      voice: Platform.OS === 'ios' 
        ? (isMaleVoice ? 'com.apple.ttsbundle.Daniel-compact' : 'com.apple.ttsbundle.Samantha-compact')
        : undefined 
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- UI COMPONENTS ---
  
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.workoutTitle}>{workoutName}</Text>
        <TouchableOpacity 
          onPress={() => setShowSettings(!showSettings)} 
          style={styles.closeButton}
        >
          <Ionicons name="volume-medium" size={24} color={showSettings ? "#10b981" : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* Audio Settings Overlay */}
      {showSettings && (
        <View style={styles.audioSettingsCard}>
          <View style={styles.settingRow}>
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Slider
              style={{flex: 1, marginHorizontal: 10}}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={setVolume}
              minimumTrackTintColor="#10b981"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
            />
            <Text style={{color: '#fff'}}>{Math.round(volume * 100)}%</Text>
          </View>
          <TouchableOpacity 
            style={styles.voiceToggle} 
            onPress={() => setIsMaleVoice(!isMaleVoice)}
          >
            <Text style={{color: '#fff'}}>Voice: {isMaleVoice ? 'Male' : 'Female'}</Text>
            <Ionicons name="person" size={16} color="#10b981" />
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bars */}
      <View style={styles.progressBar}>
        {exercises.map((_, index) => (
          <View key={index} style={[styles.progressSegment, {
            backgroundColor: index < currentExerciseIndex ? '#10b981' : index === currentExerciseIndex ? '#f97316' : 'rgba(255,255,255,0.2)',
          }]} />
        ))}
      </View>

      {/* Timer Section */}
      <View style={styles.timerSection}>
        <View style={styles.circularContainer}>
            <Svg width={320} height={320}>
                <Circle cx={160} cy={160} r={152} stroke="rgba(255,255,255,0.1)" strokeWidth={16} fill="none" />
                <Circle 
                    cx={160} cy={160} r={152} stroke={isResting ? '#f97316' : '#10b981'} 
                    strokeWidth={16} fill="none" strokeDasharray={2 * Math.PI * 152}
                    strokeDashoffset={2 * Math.PI * 152 - (progress / 100) * 2 * Math.PI * 152}
                    strokeLinecap="round" rotation="-90" origin="160, 160"
                />
            </Svg>
            <View style={styles.circularContent}>
                <Text style={[styles.phaseText, { color: isResting ? '#f97316' : '#10b981' }]}>{isResting ? 'REST' : 'WORK'}</Text>
                <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.exerciseNameText}>{currentExercise.name}</Text>
            </View>
        </View>
      </View>

      {/* Info & Controls */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}><Text style={styles.infoLabel}>Exercise</Text><Text style={styles.infoValue}>{currentExerciseIndex + 1}/{exercises.length}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoLabel}>Next Up</Text><Text style={styles.infoValue}>{currentExerciseIndex < exercises.length - 1 ? exercises[currentExerciseIndex+1].name : 'Finish'}</Text></View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => handleIntervalComplete()}>
          <Ionicons name="play-skip-forward" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pauseButton, isPaused && styles.pauseButtonActive]} onPress={() => setIsPaused(!isPaused)}>
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  workoutTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  audioSettingsCard: { backgroundColor: '#1a1a1a', marginHorizontal: 20, padding: 15, borderRadius: 12, marginBottom: 20 },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  voiceToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginVertical: 20 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  timerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circularContainer: { alignItems: 'center', justifyContent: 'center' },
  circularContent: { position: 'absolute', alignItems: 'center' },
  phaseText: { fontSize: 16, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  timeText: { fontSize: 72, fontWeight: '700', color: '#fff' },
  exerciseNameText: { fontSize: 20, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  infoSection: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 40 },
  infoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 20 },
  controlButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pauseButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  pauseButtonActive: { backgroundColor: '#f97316' },
  completedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completedTitle: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 20 },
  completedSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginVertical: 10 },
  doneButton: { backgroundColor: '#10b981', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 16, marginTop: 30 },
  doneButtonText: { fontSize: 18, fontWeight: '700' },
});