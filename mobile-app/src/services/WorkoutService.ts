import { supabase } from '../api/supabaseClient';
import { Workout } from '../domain/workout';

export async function fetchWorkouts(userId: string) {
  return supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
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
    tags: workout.tags || [],
    exercises: workout.exercises ?? [],
    source: 'manual',
    is_pinned: false,
    is_favorited: false,
  });
}

export async function updateWorkout(
  id: string,
  updates: Partial<Workout>
) {
  const cleanUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) cleanUpdates.title = updates.title;
  if (updates.description !== undefined) cleanUpdates.description = updates.description;
  if (updates.category !== undefined) cleanUpdates.category = updates.category;
  if (updates.exercises !== undefined) cleanUpdates.exercises = updates.exercises;
  if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;

  return supabase
    .from('workouts')
    .update(cleanUpdates)
    .eq('id', id);
}

export async function togglePinWorkout(id: string, currentValue: boolean) {
  return supabase
    .from('workouts')
    .update({ is_pinned: !currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function toggleFavoriteWorkout(id: string, currentValue: boolean) {
  return supabase
    .from('workouts')
    .update({ is_favorited: !currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteWorkout(id: string) {
  return supabase.from('workouts').delete().eq('id', id);
}

export async function softDeleteWorkout(userId: string, id: string, workout: Workout) {
  const { error: insertError } = await supabase.from('deleted_workouts').insert({
    original_id: id,
    user_id: userId,
    title: workout.title,
    description: workout.description,
    category: workout.category,
    tags: workout.tags || [],
    exercises: workout.exercises,
    source: workout.source,
    created_at: workout.created_at,
  });

  if (insertError) {
    return { error: insertError };
  }

  return supabase.from('workouts').delete().eq('id', id);
}

export async function fetchDeletedWorkouts(userId: string) {
  return supabase
    .from('deleted_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('deleted_at', { ascending: false });
}

export async function restoreWorkout(userId: string, deletedWorkoutId: string, originalWorkout: any) {
  const { error: createError } = await supabase.from('workouts').insert({
    user_id: userId,
    title: originalWorkout.title,
    description: originalWorkout.description,
    category: originalWorkout.category,
    tags: originalWorkout.tags || [],
    exercises: originalWorkout.exercises,
    source: originalWorkout.source || 'manual',
    is_pinned: false,
    is_favorited: false,
  });

  if (createError) {
    return { error: createError };
  }

  return supabase.from('deleted_workouts').delete().eq('id', deletedWorkoutId);
}

export async function permanentlyDeleteWorkout(id: string) {
  return supabase.from('deleted_workouts').delete().eq('id', id);
}