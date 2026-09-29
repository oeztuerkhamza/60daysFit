import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

/** Stands in for a build with no Supabase credentials. */
class UnconfiguredSupabaseService {
  readonly isConfigured = false;
  get client(): never {
    throw new Error('not configured');
  }
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useClass: UnconfiguredSupabaseService }],
    });
    auth = TestBed.inject(AuthService);
  });

  it('starts signed out and not ready', () => {
    expect(auth.isSignedIn()).toBe(false);
    expect(auth.ready()).toBe(false);
  });

  // Regression: the ready gate used to be split across two class fields, and the
  // second declaration overwrote the resolver — every route guard hung forever.
  it('resolves whenReady() once restore() finishes', async () => {
    let resolved = false;
    const pending = auth.whenReady().then(() => {
      resolved = true;
    });

    await auth.restore();
    await pending;

    expect(resolved).toBe(true);
    expect(auth.ready()).toBe(true);
  });

  it('falls back to a placeholder display name without a profile', () => {
    expect(auth.displayName()).toBe('Sporcu');
  });

  it('defaults the start date to today until a profile loads', () => {
    expect(auth.startDate()).toBe(new Date().toISOString().slice(0, 10));
  });
});
