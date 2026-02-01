import { useEffect, useState } from 'react';
import { Workout } from '../domain/workout';
import * as service from '../services/workoutService';
import { supabase } from '../api/supabaseClient';

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadWorkouts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await service.fetchWorkouts(user.id);
    if (!error && data) setWorkouts(data);
    setLoading(false);
  }

  async function addWorkout(workout: Partial<Workout>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await service.createWorkout(user.id, workout);
    if (error) throw error;

    await loadWorkouts();
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  return {
    workouts,
    loading,
    refresh: loadWorkouts,
    addWorkout,
  };
}
