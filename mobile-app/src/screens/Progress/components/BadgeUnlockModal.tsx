import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

interface Props {
  visible: boolean;
  emoji: string;
  label: string;
  onClose: () => void;
}

export default function BadgeUnlockModal({
  visible,
  emoji,
  label,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card, transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <Text style={styles.badgeEmoji}>{emoji}</Text>
          <View style={[styles.unlockBadge, { backgroundColor: '#f59e0b22' }]}>
            <Ionicons name="trophy" size={14} color="#f59e0b" />
            <Text style={[styles.unlockText, { color: '#f59e0b' }]}>Badge Unlocked!</Text>
          </View>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Keep it up — you're building a great habit.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Awesome! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  badgeEmoji: { fontSize: 72 },
  unlockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unlockText: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 18 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});