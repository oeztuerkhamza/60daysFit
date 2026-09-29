import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { CheckpointService } from '../../core/data/checkpoint.service';
import { MealService } from '../../core/data/meal.service';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { activeDay, buildStats, pendingCheckpoints, toDateOnly } from '../../core/data/stats';
import { Checkpoint, DailyLog, Meal, ProgramDay } from '../../core/models';
import { DayTypeBadgeComponent } from '../../shared/ui/day-type-badge.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { StatCardComponent } from '../../shared/ui/stat-card.component';

const TOTAL_DAYS = environment.challengeLengthDays;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProgressRingComponent, StatCardComponent, DayTypeBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly program = inject(ProgramService);
  private readonly workouts = inject(WorkoutService);
  private readonly checkpoints = inject(CheckpointService);
  private readonly meals = inject(MealService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly days = signal<ProgramDay[]>([]);
  protected readonly logs = signal<DailyLog[]>([]);
  protected readonly history = signal<Checkpoint[]>([]);
  protected readonly todayMeals = signal<Meal[]>([]);

  protected readonly totalDays = TOTAL_DAYS;
  protected readonly stats = computed(() => buildStats(this.logs(), TOTAL_DAYS));
  protected readonly currentDay = computed(() => activeDay(this.auth.startDate(), TOTAL_DAYS));
  protected readonly todayPlan = computed(() => this.days().find((d) => d.day === this.currentDay()) ?? null);

  private readonly completedDays = computed(
    () => new Set(this.logs().filter((log) => log.completed).map((log) => log.day)),
  );

  protected readonly todayDone = computed(() => this.completedDays().has(this.currentDay()));

  /** Check-ins the calendar has reached but the user has not recorded. */
  protected readonly duePhotos = computed(() =>
    pendingCheckpoints(this.currentDay(), this.history(), TOTAL_DAYS),
  );

  /** The seven days of the week the user is currently in. */
  protected readonly weekStrip = computed(() => {
    const weekIndex = Math.floor((this.currentDay() - 1) / 7);
    return this.days()
      .slice(weekIndex * 7, weekIndex * 7 + 7)
      .map((day) => ({
        ...day,
        done: this.completedDays().has(day.day),
        isToday: day.day === this.currentDay(),
        colorVar: `var(--day-${day.day_type.replace('_', '-')})`,
      }));
  });

  protected readonly currentWeek = computed(() => Math.floor((this.currentDay() - 1) / 7) + 1);

  private readonly weighIns = computed(() =>
    this.history().filter((entry): entry is Checkpoint & { weight_kg: number } => entry.weight_kg !== null),
  );

  protected readonly latestWeight = computed(() => {
    const series = this.weighIns();
    return series.length > 0 ? series[series.length - 1].weight_kg : null;
  });

  /** Weight change between the first and most recent weigh-in, if both exist. */
  protected readonly weightChange = computed(() => {
    const series = this.weighIns();
    if (series.length < 2) return null;
    return series[series.length - 1].weight_kg - series[0].weight_kg;
  });

  protected readonly proteinToday = computed(() =>
    this.todayMeals().reduce((sum, meal) => sum + (meal.protein_g ?? 0), 0),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [days, logs, history, meals] = await Promise.all([
        this.program.days(),
        this.workouts.allLogs(),
        this.checkpoints.list(),
        this.meals.forDate(toDateOnly(new Date())),
      ]);
      this.days.set(days);
      this.logs.set(logs);
      this.history.set(history);
      this.todayMeals.set(meals);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Veriler yüklenemedi. Sayfayı yenilemeyi dene.');
    } finally {
      this.loading.set(false);
    }
  }
}
