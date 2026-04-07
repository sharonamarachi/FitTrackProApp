export type WorkoutLog = {
  id: string;
  title: string;
  duration_seconds: number;
  completed_at: string;
  workout_id: string;
};

export type RecentWorkout = {
  id: string;
  title: string;
  category?: string;
  exercises: any[];
};
