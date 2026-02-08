export type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number; // NEW: weight in kg
  duration?: number; // seconds (60 = 1min, 90 = 1min 30s)
  restTime?: number; // seconds
};

export type Workout = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[]; // NEW: for organization
  exercises: Exercise[];
  created_at: string;  
  updated_at?: string; 
  source?: string;    
  source_url?: string;
};