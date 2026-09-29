/** Matches the `day_type` enum in the database. */
export type DayType = 'walk' | 'walk_strength' | 'rest';

/** Where a strength round sits relative to the walk. */
export type Phase = 'pre' | 'post';

export type Goal = 'lose' | 'build' | 'maintain';
export type MealType = 'kahvalti' | 'ogle' | 'aksam' | 'ara';
export type CheckpointKind = 'start' | 'week' | 'end';
export type PhotoPose = 'front' | 'side' | 'back';

export interface Profile {
  id: string;
  display_name: string | null;
  start_date: string;
  height_cm: number | null;
  goal: Goal;
  protein_target_g: number | null;
  water_target_ml: number;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  instructions: string | null;
  easier_variant: string | null;
  harder_variant: string | null;
}

export interface ProgramDay {
  day: number;
  week: number;
  title: string;
  day_type: DayType;
  walk_distance_km: number;
  target_minutes: number;
  notes: string | null;
}

export interface ProgramDayExercise {
  id: string;
  day: number;
  phase: Phase;
  order_index: number;
  sets: number;
  reps: number;
  rest_seconds: number;
  exercise: Exercise;
}

export interface DailyLog {
  id: string;
  user_id: string;
  day: number;
  logged_on: string;
  completed: boolean;
  walk_distance_km: number | null;
  walk_minutes: number | null;
  steps: number | null;
  water_ml: number | null;
  energy: number | null;
  notes: string | null;
}

export interface SetLog {
  id: string;
  user_id: string;
  day: number;
  program_day_exercise_id: string;
  done: boolean;
  reps_done: number | null;
}

export interface CheckpointPhoto {
  id: string;
  checkpoint_id: string;
  user_id: string;
  pose: PhotoPose;
  storage_path: string;
}

export interface Checkpoint {
  id: string;
  user_id: string;
  kind: CheckpointKind;
  /** 1–9 for weekly check-ins, 0 for the start and end records. */
  week: number;
  recorded_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  note: string | null;
  photos: CheckpointPhoto[];
}

export interface Meal {
  id: string;
  user_id: string;
  eaten_on: string;
  eaten_at: string;
  meal_type: MealType;
  storage_path: string | null;
  description: string | null;
  protein_source: string | null;
  protein_g: number | null;
  has_sugar: boolean;
  has_refined_carbs: boolean;
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  walk: 'Yürüyüş',
  walk_strength: 'Yürüyüş + Kuvvet',
  rest: 'Dinlenme',
};

export const PHASE_LABELS: Record<Phase, string> = {
  pre: 'Yürüyüş öncesi',
  post: 'Yürüyüş sonrası',
};

export const PHASE_HINTS: Record<Phase, string> = {
  pre: 'Isınma turu — kontrollü tempoda, kaslarını uyandırmak için.',
  post: 'Bitirici tur — yürüyüşten hemen sonra, tempoyu düşürmeden.',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Yağ yakımı',
  build: 'Kas kazanımı',
  maintain: 'Formu koruma',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  kahvalti: 'Kahvaltı',
  ogle: 'Öğle',
  aksam: 'Akşam',
  ara: 'Ara öğün',
};

export const MEAL_TYPE_ORDER: MealType[] = ['kahvalti', 'ogle', 'aksam', 'ara'];

export const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Önden',
  side: 'Yandan',
  back: 'Arkadan',
};

export const POSES: PhotoPose[] = ['front', 'side', 'back'];

export function checkpointLabel(checkpoint: Pick<Checkpoint, 'kind' | 'week'>): string {
  switch (checkpoint.kind) {
    case 'start':
      return 'Başlangıç';
    case 'end':
      return 'Bitiş';
    default:
      return `${checkpoint.week}. hafta`;
  }
}
