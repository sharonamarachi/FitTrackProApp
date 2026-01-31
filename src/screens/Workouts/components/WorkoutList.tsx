import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Workout {
  id: string;
  title: string;
  description?: string;
  exercises: any[];
  category?: string;
  created_at: string;
  updated_at: string;
}

interface WorkoutListProps {
  workouts: Workout[];
  onPress: (workoutId: string) => void;
  onEdit: (workoutId: string) => void;
  onDelete: (workoutId: string) => void;
}

export default function WorkoutList({ workouts, onPress, onEdit, onDelete }: WorkoutListProps) {
  return (
    <View>
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          onPress={() => onPress(workout.id)}
          onEdit={() => onEdit(workout.id)}
          onDelete={() => onDelete(workout.id)}
        />
      ))}
    </View>
  );
}

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onPress, onDelete, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity 
      style={styles.workoutCard} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardHeader}>
          <Text style={styles.workoutName}>{workout.title}</Text>
          {workout.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{workout.category}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.workoutMeta}>
          {workout.exercises?.length || 0} exercises • {formatDate(workout.created_at)}
        </Text>
        
        {workout.description && (
          <Text style={styles.workoutDescription} numberOfLines={1}>
            {workout.description}
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setShowMenu(!showMenu)}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onEdit();
            }}
          >
            <Ionicons name="create-outline" size={18} color="#4438c3" />
            <Text style={styles.menuItemText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ff4444" />
            <Text style={[styles.menuItemText, { color: '#ff4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  workoutCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4caf50',
    textTransform: 'uppercase',
  },
  workoutMeta: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuButton: {
    padding: 4,
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    top: 45,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 120,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});