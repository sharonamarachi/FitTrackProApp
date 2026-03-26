export type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number; // seconds
  restTime?: number; // seconds
};

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  exercises: Exercise[];
  created_at: string;
  updated_at?: string;
  source?: string;
  source_url?: string;
  is_pinned?: boolean;
  is_favorited?: boolean;
};