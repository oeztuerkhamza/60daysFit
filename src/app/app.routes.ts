import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'giris',
    title: 'Giriş yap · 60dayfit',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'kayit',
    title: 'Kayıt ol · 60dayfit',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    title: 'Panel · 60dayfit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'program',
    title: 'Program · 60dayfit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/program/program.component').then((m) => m.ProgramComponent),
  },
  {
    path: 'gun/:day',
    title: 'Antrenman · 60dayfit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/day-detail/day-detail.component').then((m) => m.DayDetailComponent),
  },
  {
    path: 'olcumler',
    title: 'Ölçümler · 60dayfit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/measurements/measurements.component').then((m) => m.MeasurementsComponent),
  },
  {
    path: 'profil',
    title: 'Profil · 60dayfit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: '**',
    title: 'Sayfa bulunamadı · 60dayfit',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
