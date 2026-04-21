import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import * as Speech from 'expo-speech';

interface Props {
  onComplete: () => void;
  primaryColor: string;
  playBeep?: () => void;
  coachVoiceEnabled?: boolean;
  coachVoiceGender?: 'male' | 'female';
  coachVoiceIdentifier?: string | null;
  beepsEnabled?: boolean;
}

const STEP_DURATION = 900; // ms per step

export default function CountdownOverlay({
  onComplete,
  primaryColor,
  playBeep,
  coachVoiceEnabled = true,
  coachVoiceGender = 'female',
  coachVoiceIdentifier = null,
  beepsEnabled = true,
}: Props) {
  const [step, setStep] = useState<number>(3); // 3 → 2 → 1 → 0 (GO!)
  const scaleAnim = useRef(new Animated.Value(2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const voiceConfig = {
    rate: 1.0,
    pitch: coachVoiceGender === 'male' ? 0.8 : 1.1,
    ...(coachVoiceIdentifier ? { voice: coachVoiceIdentifier } : {}),
  };

  const speakStep = (s: number) => {
    if (!coachVoiceEnabled) return;
    const text = s === 0 ? 'Go' : String(s);
    Speech.stop();
    Speech.speak(text, voiceConfig);
  };

  const animateIn = () => {
    scaleAnim.setValue(2.2);
    opacityAnim.setValue(0);
    ringAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: STEP_DURATION - 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
    speakStep(step);
    if (beepsEnabled && playBeep && step > 0) playBeep();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        if (step > 0) {
          setStep(s => s - 1);
        } else {
          onComplete();
        }
      });
    }, STEP_DURATION);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step]);

  // Removed Speech.stop() on unmount to prevent cutting off the initial workout announcement
  useEffect(() => {
    return () => {};
  }, []);

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.6],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.3, 0],
  });

  const isGo = step === 0;
  const displayText = isGo ? 'GO!' : String(step);
  const circleColor = isGo ? primaryColor : '#ffffff';
  const textColor = isGo ? '#ffffff' : '#000000';

  return (
    <View style={styles.overlay}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: isGo ? primaryColor : 'rgba(255,255,255,0.6)',
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* Main circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: circleColor,
            shadowColor: isGo ? primaryColor : '#fff',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={[styles.countText, { color: textColor }]}>
          {displayText}
        </Text>
      </Animated.View>

      {/* Label */}
      <Animated.Text style={[styles.label, { opacity: opacityAnim }]}>
        {isGo ? 'Let\'s go!' : 'Get ready…'}
      </Animated.Text>

      {/* Dots indicator */}
      <View style={styles.dots}>
        {[3, 2, 1].map(n => (
          <View
            key={n}
            style={[
              styles.dot,
              {
                backgroundColor:
                  n >= step && step > 0
                    ? primaryColor
                    : 'rgba(255,255,255,0.3)',
                transform: [{ scale: n === step ? 1.3 : 1 }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  countText: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  label: {
    marginTop: 32,
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});