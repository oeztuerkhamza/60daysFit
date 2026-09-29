import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { Measurement } from '../models';

const COLUMNS =
  'id, user_id, measured_on, weight_kg, body_fat_pct, waist_cm, chest_cm, hip_cm, arm_cm, thigh_cm, note';

export type MeasurementPatch = Partial<Omit<Measurement, 'id' | 'user_id'>> & { measured_on: string };

/** Weight and tape-measure history for the signed-in user. */
@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Oldest first, so charts and deltas read left to right. */
  async list(): Promise<Measurement[]> {
    const { data, error } = await this.supabase.client
      .from('measurements')
      .select(COLUMNS)
      .order('measured_on', { ascending: true })
      .returns<Measurement[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** One entry per date — saving the same date again replaces it. */
  async save(patch: MeasurementPatch): Promise<Measurement> {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');

    const { data, error } = await this.supabase.client
      .from('measurements')
      .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id,measured_on' })
      .select(COLUMNS)
      .single<Measurement>();

    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('measurements').delete().eq('id', id);
    if (error) throw error;
  }
}
