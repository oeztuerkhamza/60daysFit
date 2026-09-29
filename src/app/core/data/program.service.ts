import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { ProgramDay, ProgramDayExercise } from '../models';

const DAY_COLUMNS = 'day, week, title, focus, target_minutes, notes';
const DAY_EXERCISE_COLUMNS =
  'id, day, order_index, sets, reps, rest_seconds, ' +
  'exercise:exercises(id, slug, name, muscle_group, equipment, instructions)';

/**
 * Reads the shared 60-day template. The template never changes at runtime, so
 * the day list is fetched once and reused for the lifetime of the tab.
 */
@Injectable({ providedIn: 'root' })
export class ProgramService {
  private readonly supabase = inject(SupabaseService);
  private daysCache: Promise<ProgramDay[]> | null = null;

  days(): Promise<ProgramDay[]> {
    this.daysCache ??= this.fetchDays();
    return this.daysCache;
  }

  async day(day: number): Promise<ProgramDay | null> {
    const days = await this.days();
    return days.find((candidate) => candidate.day === day) ?? null;
  }

  async exercisesForDay(day: number): Promise<ProgramDayExercise[]> {
    const { data, error } = await this.supabase.client
      .from('program_day_exercises')
      .select(DAY_EXERCISE_COLUMNS)
      .eq('day', day)
      .order('order_index', { ascending: true })
      .returns<ProgramDayExercise[]>();

    if (error) throw error;
    return data ?? [];
  }

  private async fetchDays(): Promise<ProgramDay[]> {
    const { data, error } = await this.supabase.client
      .from('program_days')
      .select(DAY_COLUMNS)
      .order('day', { ascending: true })
      .returns<ProgramDay[]>();

    if (error) {
      // Don't cache a failure — the next caller should get a fresh attempt.
      this.daysCache = null;
      throw error;
    }
    return data ?? [];
  }
}
