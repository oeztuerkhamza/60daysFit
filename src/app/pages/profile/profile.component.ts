import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { activeDay } from '../../core/data/stats';
import { Goal, GOAL_LABELS } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly goals = Object.entries(GOAL_LABELS) as Array<[Goal, string]>;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly currentDay = computed(() =>
    activeDay(this.auth.startDate(), environment.challengeLengthDays),
  );

  protected readonly form = new FormGroup({
    display_name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    start_date: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    height_cm: new FormControl<number | null>(null),
    goal: new FormControl<Goal>('maintain', { nonNullable: true }),
    weekly_target: new FormControl<number>(6, { nonNullable: true }),
  });

  constructor() {
    const profile = this.auth.profile();
    this.form.reset({
      display_name: profile?.display_name ?? this.auth.displayName(),
      start_date: profile?.start_date ?? new Date().toISOString().slice(0, 10),
      height_cm: profile?.height_cm ?? null,
      goal: profile?.goal ?? 'maintain',
      weekly_target: profile?.weekly_target ?? 6,
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    const values = this.form.getRawValue();

    try {
      await this.auth.saveProfile({
        display_name: values.display_name.trim(),
        start_date: values.start_date,
        height_cm: values.height_cm,
        goal: values.goal,
        weekly_target: values.weekly_target,
      });
      this.notice.set('Profil güncellendi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Profil kaydedilemedi.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/giris']);
  }
}
