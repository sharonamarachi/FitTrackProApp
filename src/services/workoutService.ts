import { supabase } from '../api/supabaseClient';
import { Workout } from '../domain/workout';

export async function fetchWorkouts(userId: string) {
  return supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function fetchWorkoutById(id: string) {
  return supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createWorkout(
  userId: string,
  workout: Partial<Workout>
) {
  return supabase.from('workouts').insert({
    user_id: userId,
    title: workout.title,
    description: workout.description,
    category: workout.category,
    exercises: workout.exercises ?? [],
    source: 'manual',
  });
}

export async function updateWorkout(
  id: string,
  updates: Partial<Workout>
) {
  return supabase
    .from('workouts')
    .update(updates)
    .eq('id', id);
}

export async function deleteWorkout(id: string) {
  return supabase.from('workouts').delete().eq('id', id);
}