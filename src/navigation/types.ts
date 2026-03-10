// src/navigation/types.ts
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  SettingsStack: undefined; 
  EditProfile: undefined; 
  WorkoutStack: undefined;
  RecentlyDeleted: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  WorkoutStack: undefined;
  QuickStartStack: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  AccountSettings: undefined;
  Notifications: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  ContactUs: undefined;
};

export type QuickStartStackParamList = {
  QuickStart: undefined;
  QuickTimer: undefined;
  YouTubeImport: undefined;
  TranscriptImport: undefined;
  TimerScreen: { work: number; rest: number; rounds: number; exercises: number };
  CreateWorkoutTemplate: undefined;
  VideoImport: undefined;
};

export type WorkoutsStackParamList = {
  WorkoutLibrary: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId?: string };
  CreateWorkoutTemplate: undefined;
  IntervalTimerPlayback: {
    exercises: Array<{
      name: string;
      duration: number;
      restTime: number;
    }>;
    workoutName: string;
  };
};



export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export type QuickStartScreenProps = NativeStackScreenProps<
  QuickStartStackParamList,
  'QuickStart'
>;
export type QuickTimerScreenProps = NativeStackScreenProps<
  QuickStartStackParamList,
  'QuickTimer'
>;
export type TimerScreenProps = NativeStackScreenProps<
  QuickStartStackParamList,
  'TimerScreen'
>;