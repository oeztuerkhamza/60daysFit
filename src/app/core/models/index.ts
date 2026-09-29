/** Matches the `focus_type` enum in the database. */
export type Focus = 'push' | 'pull' | 'legs' | 'cardio' | 'core' | 'full' | 'rest';

/** Matches the `goal_type` enum in the database. */
export type Goal = 'lose' | 'build' | 'maintain';

export interface Profile {
  id: string;
  display_name: string | null;
  start_date: string;
  height_cm: number | null;
  goal: Goal;
  weekly_target: number;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  equipment: string;
  instructions: string | null;
}

export interface ProgramDay {
  day: number;
  week: number;
  title: string;
  focus: Focus;
  target_minutes: number;
  notes: string | null;
}

export interface ProgramDayExercise {
  id: string;
  day: number;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  exercise: Exercise;
}

export interface DailyLog {
  id: string;
  user_id: string;
  day: number;
  logged_on: string;
  completed: boolean;
  duration_minutes: number | null;
  water_ml: number | null;
  steps: number | null;
  energy: number | null;
  notes: string | null;
}

export interface SetLog {
  id: string;
  user_id: string;
  day: number;
  program_day_exercise_id: string;
  done: boolean;
  weight_kg: number | null;
  reps_done: number | null;
}

export interface Measurement {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  note: string | null;
}

export const FOCUS_LABELS: Record<Focus, string> = {
  push: 'İtme',
  pull: 'Çekme',
  legs: 'Bacak',
  cardio: 'Kardiyo',
  core: 'Core',
  full: 'Full Body',
  rest: 'Dinlenme',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Yağ yakımı',
  build: 'Kas kazanımı',
  maintain: 'Formu koruma',
};

/** CSS custom property holding the accent colour for a focus type. */
export function focusColorVar(focus: Focus): string {
  return `var(--focus-${focus})`;
}
