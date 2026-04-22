import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '../../../domain/workout';
import { useTheme } from '../../../context/ThemeContext';

type Props = {
  workout: Workout;
  onPress: () => void;
  onDelete: () => void;
};

export default function WorkoutCard({
  workout,
  onPress,
  onDelete,
}: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  
  // Determine workout type: prioritize category, fall back to detection
  let type: 'strength' | 'cardio' | 'mixed' = 'strength';
  if (workout.category === 'mixed' || workout.category === 'strength' || workout.category === 'cardio') {
    type = workout.category as 'strength' | 'cardio' | 'mixed';
  } else {
    const hasTimer = workout.exercises?.some((e) => !!e.duration);
    const hasReps = workout.exercises?.some((e) => !!e.reps || !!e.sets);
    if (hasTimer && hasReps) type = 'mixed';
    else if (hasTimer) type = 'cardio';
  }

  const typeConfig = {
    strength: { icon: 'barbell' as const, color: '#428df7', label: 'Strength' },
    cardio: { icon: 'flash' as const, color: '#f97316', label: 'Cardio' },
    mixed: { icon: 'layers' as const, color: '#8b5cf6', label: 'Mixed' },
  };

  const config = typeConfig[type];

  return (
    <Pressable 
      onPress={onPress} 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{workout.title}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {workout.exercises.length} exercises
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: config.color + '20' }]}>
          <Text style={[styles.tagText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  }
});
