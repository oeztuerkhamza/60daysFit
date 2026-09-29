import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Blocks a route until a session exists, remembering where the user was headed. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  if (auth.isSignedIn()) return true;

  return router.createUrlTree(['/giris'], { queryParams: { next: state.url } });
};

/** Keeps signed-in users out of the login and sign-up screens. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  return auth.isSignedIn() ? router.createUrlTree(['/']) : true;
};
