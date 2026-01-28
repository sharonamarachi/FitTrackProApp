
// src/navigation/types.ts
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  SettingsStack: undefined; 
  EditProfile: undefined; 
};

export type TabParamList = {
  Home: undefined;
  Workouts: undefined;
  QuickStartStack: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  AccountSettings: undefined;
  Notifications: undefined;
  Privacy: undefined;
};

export type QuickStartStackParamList = {
  QuickStart: undefined;
  QuickTimer: undefined;
  CustomWorkout: undefined;
  YouTubeImport: undefined;
  TimerScreen: { work: number; rest: number; rounds: number; exercises: number };
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
