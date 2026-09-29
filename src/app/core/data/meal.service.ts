import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { MEAL_BUCKET, StorageService } from '../storage/storage.service';
import { Meal, MealType } from '../models';

const COLUMNS =
  'id, user_id, eaten_on, eaten_at, meal_type, storage_path, description, protein_source, protein_g, ' +
  'has_sugar, has_refined_carbs';

export interface MealDraft {
  eaten_on: string;
  meal_type: MealType;
  description: string | null;
  protein_source: string | null;
  protein_g: number | null;
  has_sugar: boolean;
  has_refined_carbs: boolean;
}

/** The meal diary: every meal gets a photo and a line about what was in it. */
@Injectable({ providedIn: 'root' })
export class MealService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);

  /** Most recent first, capped so the diary page stays quick on long challenges. */
  async recent(limit = 120): Promise<Meal[]> {
    const { data, error } = await this.supabase.client
      .from('meals')
      .select(COLUMNS)
      .order('eaten_on', { ascending: false })
      .order('eaten_at', { ascending: false })
      .limit(limit)
      .returns<Meal[]>();

    if (error) throw error;
    return data ?? [];
  }

  async forDate(eatenOn: string): Promise<Meal[]> {
    const { data, error } = await this.supabase.client
      .from('meals')
      .select(COLUMNS)
      .eq('eaten_on', eatenOn)
      .order('eaten_at', { ascending: true })
      .returns<Meal[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Saves the entry, uploading the photo first when one was picked. */
  async create(draft: MealDraft, photo: File | null): Promise<Meal> {
    const userId = this.requireUserId();
    const storagePath = photo ? await this.storage.upload(MEAL_BUCKET, draft.eaten_on, draft.meal_type, photo) : null;

    const { data, error } = await this.supabase.client
      .from('meals')
      .insert({ user_id: userId, storage_path: storagePath, ...draft })
      .select(COLUMNS)
      .single<Meal>();

    if (error) {
      // The row never landed, so the uploaded file would be orphaned.
      if (storagePath) await this.storage.remove(MEAL_BUCKET, storagePath).catch(() => undefined);
      throw error;
    }
    return data;
  }

  async remove(meal: Meal): Promise<void> {
    const { error } = await this.supabase.client.from('meals').delete().eq('id', meal.id);
    if (error) throw error;
    if (meal.storage_path) {
      await this.storage.remove(MEAL_BUCKET, meal.storage_path).catch(() => undefined);
    }
  }

  /** Signed URLs for the photos of the given meals, keyed by storage path. */
  signedUrls(meals: readonly Meal[]): Promise<Map<string, string>> {
    const paths = meals.map((meal) => meal.storage_path).filter((path): path is string => path !== null);
    return paths.length === 0 ? Promise.resolve(new Map()) : this.storage.signedUrls(MEAL_BUCKET, paths);
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');
    return userId;
  }
}
