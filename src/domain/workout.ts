export type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  duration?: number; // seconds
};

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  exercises: Exercise[];
  createdAt: string;
};
