import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Owns the single Supabase client for the app.
 *
 * The client is created lazily so an unconfigured build (no SUPABASE_URL) can
 * still boot and render the setup notice instead of throwing during bootstrap.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private instance: SupabaseClient | null = null;

  /** False when the build has no Supabase credentials — see scripts/set-env.mjs. */
  readonly isConfigured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);

  get client(): SupabaseClient {
    if (!this.isConfigured) {
      throw new Error(
        'Supabase yapılandırılmadı. .env.example dosyasını .env olarak kopyalayıp ' +
          'SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini girin.',
      );
    }
    this.instance ??= createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return this.instance;
  }
}
