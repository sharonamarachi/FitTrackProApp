import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

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

  const currentExercise = exercises[currentExerciseIndex];
  const progress = isResting
    ? ((currentExercise.restTime - timeLeft) / currentExercise.restTime) * 100
    : ((currentExercise.duration - timeLeft) / currentExercise.duration) * 100;

  useEffect(() => {
    if (isPaused || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleIntervalComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isCompleted, currentExerciseIndex, isResting]);

  const handleIntervalComplete = () => {
    if (isResting) {
      // Move to next exercise
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setIsResting(false);
        setTimeLeft(exercises[currentExerciseIndex + 1].duration);
      } else {
        setIsCompleted(true);
      }
    } else {
      // Move to rest
      if (currentExercise.restTime > 0) {
        setIsResting(true);
        setTimeLeft(currentExercise.restTime);
      } else {
        // No rest, move to next exercise
        if (currentExerciseIndex < exercises.length - 1) {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setTimeLeft(exercises[currentExerciseIndex + 1].duration);
        } else {
          setIsCompleted(true);
        }
      }
    }
  };

  const skip = () => {
    handleIntervalComplete();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const CircularProgress = () => {
    const size = 320;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const color = isResting ? '#f97316' : '#10b981';

    return (
      <View style={styles.circularContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} />
              <Stop offset="100%" stopColor={color + 'CC'} />
            </LinearGradient>
          </Defs>

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        <View style={styles.circularContent}>
          <Text style={[styles.phaseText, { color }]}>
            {isResting ? 'REST' : 'WORK'}
          </Text>
          <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.exerciseNameText}>{currentExercise.name}</Text>
        </View>
      </View>
    );
  };

  if (isCompleted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.completedContainer}>
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-circle" size={120} color="#10b981" />
          </View>
          <Text style={styles.completedTitle}>Workout Complete!</Text>
          <Text style={styles.completedSubtitle}>
            Great job finishing {workoutName}
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
          >
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
        <View style={{ width: 48 }} />
      </View>

      {/* Progress Indicators */}
      <View style={styles.progressBar}>
        {exercises.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              {
                backgroundColor: index < currentExerciseIndex 
                  ? '#10b981' 
                  : index === currentExerciseIndex 
                  ? '#f97316' 
                  : 'rgba(255,255,255,0.2)',
              },
            ]}
          />
        ))}
      </View>

      {/* Circular Timer */}
      <View style={styles.timerSection}>
        <CircularProgress />
      </View>

      {/* Exercise Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Exercise</Text>
          <Text style={styles.infoValue}>
            {currentExerciseIndex + 1} / {exercises.length}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Next Up</Text>
          <Text style={styles.infoValue}>
            {currentExerciseIndex < exercises.length - 1
              ? exercises[currentExerciseIndex + 1].name
              : 'Finish!'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={skip}>
          <Ionicons name="play-skip-forward" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={40}
            color="#000"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="stop" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 40,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  timerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
  },
  circularContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  exerciseNameText: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 40,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  pauseButtonActive: {
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  completedIcon: {
    marginBottom: 32,
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  completedSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 48,
  },
  doneButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 16,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});