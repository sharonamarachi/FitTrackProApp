import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
  primaryColor: string;
  playBeep?: () => void;
  coachVoiceEnabled?: boolean;
  coachVoiceGender?: 'male' | 'female';
  coachVoiceIdentifier?: string | null;
  beepsEnabled?: boolean;
}

const STEP_DURATION = 1000; // ms per step
const CIRCLE_SIZE = 180;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  
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

  const startStepAnimation = () => {
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);
    progressAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STEP_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    startStepAnimation();
    speakStep(step);
    if (beepsEnabled && playBeep && step > 0) playBeep();

    timeoutRef.current = setTimeout(() => {
      if (step > 0) {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setStep(s => s - 1);
        });
      } else {
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onComplete();
        });
      }
    }, STEP_DURATION);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const isGo = step === 0;
  const displayText = isGo ? 'GO!' : String(step);
  const accentColor = isGo ? primaryColor : '#00e5ff'; // Electric Cyan for countdown

  return (
    <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.96)', 'rgba(10,20,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.timerWrapper}>
          <Svg width={CIRCLE_SIZE + 20} height={CIRCLE_SIZE + 20} style={styles.svg}>
            <Defs>
              <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={isGo ? '#10b981' : '#3b82f6'} stopOpacity="0.8" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={(CIRCLE_SIZE + 20) / 2}
              cy={(CIRCLE_SIZE + 20) / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={(CIRCLE_SIZE + 20) / 2}
              cy={(CIRCLE_SIZE + 20) / 2}
              r={RADIUS}
              stroke="url(#grad)"
              strokeWidth={STROKE_WIDTH + 2}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${(CIRCLE_SIZE + 20) / 2} ${(CIRCLE_SIZE + 20) / 2})`}
            />
          </Svg>

          <Animated.View
            style={[
              styles.circle,
              {
                borderColor: isGo ? 'transparent' : 'rgba(0,229,255,0.2)',
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {isGo && (
              <LinearGradient
                colors={[primaryColor, '#0ea5e9']}
                style={styles.goBackground}
              />
            )}
            <Text style={[styles.countText, { color: '#FFFFFF', fontSize: isGo ? 64 : 84 }]}>
              {displayText}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.labelContainer, { opacity: opacityAnim }]}>
          <Text style={styles.mainLabel}>
            {isGo ? 'LETS GO!' : 'READY'}
          </Text>
          <Text style={styles.subLabel}>
            {isGo ? 'Session started' : `Starting in ${step}`}
          </Text>
        </Animated.View>

        <View style={styles.dots}>
          {[3, 2, 1].map(n => (
            <View
              key={n}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    n >= step && step > 0
                      ? '#00e5ff'
                      : 'rgba(255,255,255,0.15)',
                  width: n === step ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerWrapper: {
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  circle: {
    width: CIRCLE_SIZE - 20,
    height: CIRCLE_SIZE - 20,
    borderRadius: (CIRCLE_SIZE - 20) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  goBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  countText: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  labelContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  mainLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  subLabel: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 50,
    height: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});