import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { compressImage } from './image';

export const PROGRESS_BUCKET = 'progress-photos';
export const MEAL_BUCKET = 'meal-photos';

/** Signed URLs are short-lived; long enough to browse a page, short enough to leak little. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Uploads and reads photos from the private storage buckets.
 *
 * Every object path starts with the owner's user id — that first segment is what
 * the storage policies check, so paths are always built here rather than by
 * callers.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Cache of resolved signed URLs, so a grid of photos is signed once per load. */
  private readonly urlCache = new Map<string, { url: string; expiresAt: number }>();

  /** Uploads a photo and returns its storage path. `suffix` must not contain slashes. */
  async upload(bucket: string, folder: string, suffix: string, file: File): Promise<string> {
    const userId = this.requireUserId();
    const body = await compressImage(file);
    const path = `${userId}/${folder}/${suffix}-${Date.now()}.jpg`;

    const { error } = await this.supabase.client.storage.from(bucket).upload(path, body, {
      contentType: body.type || 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;

    return path;
  }

  async signedUrl(bucket: string, path: string): Promise<string | null> {
    const urls = await this.signedUrls(bucket, [path]);
    return urls.get(path) ?? null;
  }

  /** Signs several paths in one request, reusing any that are still valid. */
  async signedUrls(bucket: string, paths: readonly string[]): Promise<Map<string, string>> {
    const resolved = new Map<string, string>();
    const now = Date.now();
    const missing: string[] = [];

    for (const path of new Set(paths)) {
      const cached = this.urlCache.get(`${bucket}/${path}`);
      if (cached && cached.expiresAt > now) {
        resolved.set(path, cached.url);
      } else {
        missing.push(path);
      }
    }

    if (missing.length === 0) return resolved;

    const { data, error } = await this.supabase.client.storage
      .from(bucket)
      .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;

    for (const entry of data ?? []) {
      // `path` is echoed back per item; a failed item carries an error instead.
      if (!entry.signedUrl || !entry.path) continue;
      resolved.set(entry.path, entry.signedUrl);
      this.urlCache.set(`${bucket}/${entry.path}`, {
        url: entry.signedUrl,
        // Re-sign a minute early so a URL never expires mid-render.
        expiresAt: now + (SIGNED_URL_TTL_SECONDS - 60) * 1000,
      });
    }

    return resolved;
  }

  async remove(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.client.storage.from(bucket).remove([path]);
    if (error) throw error;
    this.urlCache.delete(`${bucket}/${path}`);
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');
    return userId;
  }
}
