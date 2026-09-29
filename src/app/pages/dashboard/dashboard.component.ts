import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { MeasurementService } from '../../core/data/measurement.service';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { activeDay, buildStats } from '../../core/data/stats';
import { DailyLog, Measurement, ProgramDay } from '../../core/models';
import { FocusBadgeComponent } from '../../shared/ui/focus-badge.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatCardComponent } from '../../shared/ui/stat-card.component';

const TOTAL_DAYS = environment.challengeLengthDays;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProgressRingComponent, StatCardComponent, FocusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly program = inject(ProgramService);
  private readonly workouts = inject(WorkoutService);
  private readonly measurements = inject(MeasurementService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly days = signal<ProgramDay[]>([]);
  protected readonly logs = signal<DailyLog[]>([]);
  protected readonly history = signal<Measurement[]>([]);

  protected readonly totalDays = TOTAL_DAYS;
  protected readonly stats = computed(() => buildStats(this.logs(), TOTAL_DAYS));
  protected readonly currentDay = computed(() => activeDay(this.auth.startDate(), TOTAL_DAYS));
  protected readonly todayPlan = computed(() => this.days().find((d) => d.day === this.currentDay()) ?? null);

  private readonly completedDays = computed(
    () => new Set(this.logs().filter((log) => log.completed).map((log) => log.day)),
  );

  protected readonly todayDone = computed(() => this.completedDays().has(this.currentDay()));

  /** The seven days of the week the user is currently in. */
  protected readonly weekStrip = computed(() => {
    const weekIndex = Math.floor((this.currentDay() - 1) / 7);
    return this.days()
      .slice(weekIndex * 7, weekIndex * 7 + 7)
      .map((day) => ({
        ...day,
        done: this.completedDays().has(day.day),
        isToday: day.day === this.currentDay(),
      }));
  });

  protected readonly currentWeek = computed(() => Math.floor((this.currentDay() - 1) / 7) + 1);

  /** Weight change between the first and most recent measurement, if both exist. */
  protected readonly weightDelta = computed(() => {
    const withWeight = this.history().filter((entry) => entry.weight_kg !== null);
    if (withWeight.length < 2) return null;
    const first = withWeight[0];
    const last = withWeight[withWeight.length - 1];
    return { latest: last.weight_kg as number, change: (last.weight_kg as number) - (first.weight_kg as number) };
  });

  protected readonly latestWeight = computed(() => {
    const withWeight = this.history().filter((entry) => entry.weight_kg !== null);
    return withWeight.length > 0 ? (withWeight[withWeight.length - 1].weight_kg as number) : null;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [days, logs, history] = await Promise.all([
        this.program.days(),
        this.workouts.allLogs(),
        this.measurements.list(),
      ]);
      this.days.set(days);
      this.logs.set(logs);
      this.history.set(history);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Veriler yüklenemedi. Sayfayı yenilemeyi dene.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
