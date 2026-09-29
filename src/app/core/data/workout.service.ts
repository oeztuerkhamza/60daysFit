import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { DailyLog, SetLog } from '../models';

const LOG_COLUMNS =
  'id, user_id, day, logged_on, completed, duration_minutes, water_ml, steps, energy, notes';
const SET_LOG_COLUMNS = 'id, user_id, day, program_day_exercise_id, done, weight_kg, reps_done';

export type DailyLogPatch = Partial<
  Pick<DailyLog, 'completed' | 'duration_minutes' | 'water_ml' | 'steps' | 'energy' | 'notes' | 'logged_on'>
>;

export type SetLogPatch = Partial<Pick<SetLog, 'done' | 'weight_kg' | 'reps_done'>>;

/** Reads and writes the signed-in user's check-ins and per-exercise records. */
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async allLogs(): Promise<DailyLog[]> {
    const { data, error } = await this.supabase.client
      .from('daily_logs')
      .select(LOG_COLUMNS)
      .order('day', { ascending: true })
      .returns<DailyLog[]>();

    if (error) throw error;
    return data ?? [];
  }

  async logForDay(day: number): Promise<DailyLog | null> {
    const { data, error } = await this.supabase.client
      .from('daily_logs')
      .select(LOG_COLUMNS)
      .eq('day', day)
      .maybeSingle<DailyLog>();

    if (error) throw error;
    return data;
  }

  async saveLog(day: number, patch: DailyLogPatch): Promise<DailyLog> {
    const { data, error } = await this.supabase.client
      .from('daily_logs')
      .upsert({ user_id: this.requireUserId(), day, ...patch }, { onConflict: 'user_id,day' })
      .select(LOG_COLUMNS)
      .single<DailyLog>();

    if (error) throw error;
    return data;
  }

  async setLogsForDay(day: number): Promise<SetLog[]> {
    const { data, error } = await this.supabase.client
      .from('set_logs')
      .select(SET_LOG_COLUMNS)
      .eq('day', day)
      .returns<SetLog[]>();

    if (error) throw error;
    return data ?? [];
  }

  async saveSetLog(day: number, programDayExerciseId: string, patch: SetLogPatch): Promise<SetLog> {
    const { data, error } = await this.supabase.client
      .from('set_logs')
      .upsert(
        { user_id: this.requireUserId(), day, program_day_exercise_id: programDayExerciseId, ...patch },
        { onConflict: 'user_id,program_day_exercise_id' },
      )
      .select(SET_LOG_COLUMNS)
      .single<SetLog>();

    if (error) throw error;
    return data;
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');
    return userId;
  }
}
