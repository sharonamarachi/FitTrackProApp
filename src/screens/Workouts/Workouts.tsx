import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../api/supabaseClient';
import Header from '../../components/Header';

interface Workout {
  id: string;
  title: string;
  description?: string;
  exercises: any[];
  category?: string;
  created_at: string;
  updated_at: string;
}

export default function Workouts({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['all', 'core', 'glutes', 'upper', 'lower', 'cardio']);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        Alert.alert('Error', 'Please log in to view workouts');
        return;
      }

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkouts(data || []);
    } catch (error: any) {
      console.error('Error fetching workouts:', error);
      Alert.alert('Error', 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId);

              if (error) throw error;

              // Remove from local state
              setWorkouts(workouts.filter(w => w.id !== workoutId));
              Alert.alert('Success', 'Workout deleted');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete workout');
            }
          }
        }
      ]
    );
  };

  const filteredWorkouts = activeFilter === 'all' 
    ? workouts 
    : workouts.filter(w => w.category?.toLowerCase() === activeFilter.toLowerCase());

  const getWorkoutCount = (category: string) => {
    if (category === 'all') return workouts.length;
    return workouts.filter(w => w.category?.toLowerCase() === category.toLowerCase()).length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Library</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterRow}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                activeFilter === category && styles.filterActive
              ]}
              onPress={() => setActiveFilter(category)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === category && styles.filterTextActive
              ]}>
                {category.toUpperCase()} ({getWorkoutCount(category)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading workouts...</Text>
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all' 
                ? 'Create your first workout to get started' 
                : `No ${activeFilter} workouts found`}
            </Text>
          </View>
        ) : (
          filteredWorkouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
              onDelete={() => handleDeleteWorkout(workout.id)}
              onEdit={() => navigation.navigate('EditWorkout', { workoutId: workout.id })}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateWorkout')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Workout Card Component
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  filterScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterActive: {
    backgroundColor: '#4438c3',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4438c3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4438c3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});