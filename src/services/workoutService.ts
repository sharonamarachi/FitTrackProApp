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
  // Don't send 'id' or 'createdAt' - let Supabase generate these
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
  // Create a clean update object without fields that shouldn't be updated
  const cleanUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) cleanUpdates.title = updates.title;
  if (updates.description !== undefined) cleanUpdates.description = updates.description;
  if (updates.category !== undefined) cleanUpdates.category = updates.category;
  if (updates.exercises !== undefined) cleanUpdates.exercises = updates.exercises;

  return supabase
    .from('workouts')
    .update(cleanUpdates)
    .eq('id', id);
}

export async function deleteWorkout(id: string) {
  return supabase.from('workouts').delete().eq('id', id);
}

export async function softDeleteWorkout(userId: string, id: string, workout: Workout) {
  // Move workout to deleted_workouts table
  return supabase.from('deleted_workouts').insert({
    original_id: id,
    user_id: userId,
    title: workout.title,
    description: workout.description,
    category: workout.category,
    exercises: workout.exercises,
    source: workout.source,
    created_at: workout.created_at,
  }).then(() => {
    // Then delete from workouts table
    return supabase.from('workouts').delete().eq('id', id);
  });
}

export async function fetchDeletedWorkouts(userId: string) {
  return supabase
    .from('deleted_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('deleted_at', { ascending: false });
}

export async function restoreWorkout(userId: string, deletedWorkoutId: string, originalWorkout: Workout) {
  // Create workout back in workouts table
  const { error: createError } = await supabase.from('workouts').insert({
    id: originalWorkout.id,
    user_id: userId,
    title: originalWorkout.title,
    description: originalWorkout.description,
    category: originalWorkout.category,
    exercises: originalWorkout.exercises,
    source: originalWorkout.source,
    created_at: originalWorkout.created_at,
  });

  if (createError) return { error: createError };

  // Delete from deleted_workouts table
  return supabase.from('deleted_workouts').delete().eq('id', deletedWorkoutId);
}

export async function permanentlyDeleteWorkout(id: string) {
  return supabase.from('deleted_workouts').delete().eq('id', id);
}