export interface WorkoutLog {
  id: string;
  workout_id: string | null;
  title: string;
  duration_seconds: number;
  completed_at: string;
}

export interface ExerciseLog {
  id: string;
  exercise_name: string;
  weight_kg: number | null;
  reps_completed: number | null;
  sets_completed: number | null;
  duration_seconds: number | null;
  logged_at: string;
}

export interface BodyMeasurement {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

export interface PREntry {
  exerciseName: string;
  history: { date: string; weight: number; reps: number }[];
  best: { weight: number; reps: number; date: string };
}