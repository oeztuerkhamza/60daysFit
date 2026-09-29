import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from '../models';

/** A promise paired with the function that settles it. */
function createGate(): { promise: Promise<void>; open: () => void } {
  let open: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open: () => open() };
}

/** Fields a user may edit on their own profile. */
export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'start_date' | 'height_cm' | 'goal' | 'weekly_target'>>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  private readonly sessionState = signal<Session | null>(null);
  private readonly profileState = signal<Profile | null>(null);
  private readonly readyState = signal(false);

  /**
   * Resolves once the initial session lookup has finished.
   *
   * Held in a single field: splitting the promise and its resolver across two
   * class fields makes the pair order-dependent, and the later declaration
   * silently overwrites the resolver captured by the earlier one.
   */
  private readonly readyGate = createGate();

  readonly session = this.sessionState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly ready = this.readyState.asReadonly();

  readonly user = computed<User | null>(() => this.sessionState()?.user ?? null);
  readonly isSignedIn = computed(() => this.sessionState() !== null);

  readonly displayName = computed(() => {
    const fromProfile = this.profileState()?.display_name;
    if (fromProfile) return fromProfile;
    const email = this.user()?.email;
    return email ? email.split('@')[0] : 'Sporcu';
  });

  /** Program day 1 date; defaults to today until a profile loads. */
  readonly startDate = computed(() => this.profileState()?.start_date ?? new Date().toISOString().slice(0, 10));

  /**
   * Reads the persisted session and starts listening for auth changes.
   * Registered as an app initializer so guards never run before it settles.
   */
  async restore(): Promise<void> {
    if (!this.supabase.isConfigured) {
      this.markReady();
      return;
    }

    try {
      const { data } = await this.supabase.client.auth.getSession();
      this.sessionState.set(data.session);

      this.supabase.client.auth.onAuthStateChange((event, session) => {
        // restore() already loads the profile for the session it just read.
        if (event === 'INITIAL_SESSION') return;

        this.sessionState.set(session);
        if (session) {
          void this.loadProfile();
        } else {
          this.profileState.set(null);
        }
      });

      if (data.session) {
        await this.loadProfile();
      }
    } catch (err) {
      // A failed profile read must not leave every guard awaiting forever.
      console.error('[auth] oturum geri yüklenemedi', err);
    } finally {
      this.markReady();
    }
  }

  whenReady(): Promise<void> {
    return this.readyGate.promise;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    // With "confirm email" on, Supabase returns a user but no session.
    return { needsConfirmation: data.session === null };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this.profileState.set(null);
  }

  async loadProfile(): Promise<void> {
    const userId = this.user()?.id;
    if (!userId) return;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, display_name, start_date, height_cm, goal, weekly_target')
      .eq('id', userId)
      .maybeSingle<Profile>();

    if (error) throw error;
    this.profileState.set(data);
  }

  async saveProfile(patch: ProfilePatch): Promise<void> {
    const userId = this.user()?.id;
    if (!userId) throw new Error('Oturum açık değil.');

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('id, display_name, start_date, height_cm, goal, weekly_target')
      .single<Profile>();

    if (error) throw error;
    this.profileState.set(data);
  }

  private markReady(): void {
    this.readyState.set(true);
    this.readyGate.open();
  }
}
