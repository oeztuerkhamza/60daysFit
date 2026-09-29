import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { PROGRESS_BUCKET, StorageService } from '../storage/storage.service';
import { Checkpoint, CheckpointKind, CheckpointPhoto, PhotoPose } from '../models';

const COLUMNS =
  'id, user_id, kind, week, recorded_on, weight_kg, height_cm, waist_cm, chest_cm, arm_cm, thigh_cm, note, ' +
  'photos:checkpoint_photos(id, checkpoint_id, user_id, pose, storage_path)';

export type CheckpointPatch = Partial<
  Pick<Checkpoint, 'recorded_on' | 'weight_kg' | 'height_cm' | 'waist_cm' | 'chest_cm' | 'arm_cm' | 'thigh_cm' | 'note'>
>;

/**
 * The weigh-in and body-photo record: one at the start, one at the end of every
 * week, one on the final day.
 */
@Injectable({ providedIn: 'root' })
export class CheckpointService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);

  /** Oldest first, so charts and comparisons read left to right. */
  async list(): Promise<Checkpoint[]> {
    const { data, error } = await this.supabase.client
      .from('checkpoints')
      .select(COLUMNS)
      .order('recorded_on', { ascending: true })
      .returns<Checkpoint[]>();

    if (error) throw error;
    return (data ?? []).map((checkpoint) => ({ ...checkpoint, photos: checkpoint.photos ?? [] }));
  }

  /**
   * Creates or updates the single checkpoint for this slot.
   * `week` is 1–9 for a weekly check-in and 0 for the start and end records.
   */
  async save(kind: CheckpointKind, week: number, patch: CheckpointPatch): Promise<Checkpoint> {
    const { data, error } = await this.supabase.client
      .from('checkpoints')
      .upsert(
        { user_id: this.requireUserId(), kind, week: kind === 'week' ? week : 0, ...patch },
        { onConflict: 'user_id,kind,week' },
      )
      .select(COLUMNS)
      .single<Checkpoint>();

    if (error) throw error;
    return { ...data, photos: data.photos ?? [] };
  }

  /** Uploads a pose photo and links it to the checkpoint, replacing any earlier one. */
  async savePhoto(checkpoint: Checkpoint, pose: PhotoPose, file: File): Promise<CheckpointPhoto> {
    const folder = checkpoint.kind === 'week' ? `week-${checkpoint.week}` : checkpoint.kind;
    const storagePath = await this.storage.upload(PROGRESS_BUCKET, folder, pose, file);

    const { data, error } = await this.supabase.client
      .from('checkpoint_photos')
      .upsert(
        {
          checkpoint_id: checkpoint.id,
          user_id: this.requireUserId(),
          pose,
          storage_path: storagePath,
        },
        { onConflict: 'checkpoint_id,pose' },
      )
      .select('id, checkpoint_id, user_id, pose, storage_path')
      .single<CheckpointPhoto>();

    if (error) throw error;

    // Drop the file the row used to point at; a failure here only wastes space.
    const previous = checkpoint.photos.find((photo) => photo.pose === pose);
    if (previous && previous.storage_path !== storagePath) {
      await this.storage.remove(PROGRESS_BUCKET, previous.storage_path).catch(() => undefined);
    }

    return data;
  }

  async removePhoto(photo: CheckpointPhoto): Promise<void> {
    const { error } = await this.supabase.client.from('checkpoint_photos').delete().eq('id', photo.id);
    if (error) throw error;
    await this.storage.remove(PROGRESS_BUCKET, photo.storage_path).catch(() => undefined);
  }

  /** Signed URLs for every photo across the given checkpoints, keyed by storage path. */
  signedUrls(checkpoints: readonly Checkpoint[]): Promise<Map<string, string>> {
    const paths = checkpoints.flatMap((checkpoint) => checkpoint.photos.map((photo) => photo.storage_path));
    return paths.length === 0 ? Promise.resolve(new Map()) : this.storage.signedUrls(PROGRESS_BUCKET, paths);
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');
    return userId;
  }
}
