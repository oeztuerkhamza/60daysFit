import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { MealService } from '../../core/data/meal.service';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { parseDateOnly, toDateOnly } from '../../core/data/stats';
import {
  DailyLog,
  Meal,
  MEAL_TYPE_LABELS,
  Phase,
  PHASE_HINTS,
  PHASE_LABELS,
  ProgramDay,
  ProgramDayExercise,
  SetLog,
} from '../../core/models';
import { DayTypeBadgeComponent } from '../../shared/ui/day-type-badge.component';

/** One exercise of the day plus whatever the user has recorded against it. */
interface ExerciseRow {
  entry: ProgramDayExercise;
  done: boolean;
  reps: number | null;
}

interface RoundView {
  phase: Phase;
  label: string;
  hint: string;
  rows: ExerciseRow[];
}

const ENERGY_LABELS: Record<number, string> = {
  1: 'Çok yorgun',
  2: 'Yorgun',
  3: 'Normal',
  4: 'İyi',
  5: 'Harika',
};

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, DayTypeBadgeComponent],
  templateUrl: './day-detail.component.html',
  styleUrl: './day-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly program = inject(ProgramService);
  private readonly workouts = inject(WorkoutService);
  private readonly meals = inject(MealService);

  protected readonly totalDays = environment.challengeLengthDays;
  protected readonly energyLabels = ENERGY_LABELS;
  protected readonly energyLevels = [1, 2, 3, 4, 5];
  protected readonly mealTypeLabels = MEAL_TYPE_LABELS;

  protected readonly day = signal(1);
  protected readonly plan = signal<ProgramDay | null>(null);
  protected readonly rows = signal<ExerciseRow[]>([]);
  protected readonly log = signal<DailyLog | null>(null);
  protected readonly dayMeals = signal<Meal[]>([]);

  protected readonly loading = signal(true);
  protected readonly savingCheckIn = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly checkIn = new FormGroup({
    walk_distance_km: new FormControl<number | null>(null),
    walk_minutes: new FormControl<number | null>(null),
    steps: new FormControl<number | null>(null),
    water_ml: new FormControl<number | null>(null),
    energy: new FormControl<number | null>(null),
    notes: new FormControl<string>('', { nonNullable: true }),
  });

  protected readonly completed = computed(() => this.log()?.completed ?? false);
  protected readonly doneCount = computed(() => this.rows().filter((row) => row.done).length);
  protected readonly prevDay = computed(() => (this.day() > 1 ? this.day() - 1 : null));
  protected readonly nextDay = computed(() => (this.day() < this.totalDays ? this.day() + 1 : null));

  /** The calendar date this program day falls on, used to pull that day's meals. */
  protected readonly dayDate = computed(() => {
    const start = parseDateOnly(this.auth.startDate());
    start.setDate(start.getDate() + this.day() - 1);
    return toDateOnly(start);
  });

  /** The pre-walk and post-walk rounds, empty on walking-only and rest days. */
  protected readonly rounds = computed<RoundView[]>(() => {
    const phases: Phase[] = ['pre', 'post'];
    return phases
      .map((phase) => ({
        phase,
        label: PHASE_LABELS[phase],
        hint: PHASE_HINTS[phase],
        rows: this.rows().filter((row) => row.entry.phase === phase),
      }))
      .filter((round) => round.rows.length > 0);
  });

  protected readonly dayProgress = computed(() => {
    const total = this.rows().length;
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const parsed = Number(params.get('day'));
      const day = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), this.totalDays) : 1;
      this.day.set(day);
      void this.load(day);
    });
  }

  protected async toggleExercise(row: ExerciseRow): Promise<void> {
    const next = !row.done;
    this.patchRow(row.entry.id, { done: next });
    await this.persistSetLog(row.entry.id, { done: next });
  }

  protected async onRepsChange(row: ExerciseRow, event: Event): Promise<void> {
    const reps = this.readNumber(event);
    this.patchRow(row.entry.id, { reps });
    await this.persistSetLog(row.entry.id, { reps_done: reps });
  }

  protected async saveCheckIn(markCompleted: boolean | null = null): Promise<void> {
    this.savingCheckIn.set(true);
    this.error.set('');
    this.notice.set('');

    const values = this.checkIn.getRawValue();
    const completed = markCompleted ?? this.completed();

    try {
      const saved = await this.workouts.saveLog(this.day(), {
        completed,
        logged_on: this.dayDate(),
        walk_distance_km: values.walk_distance_km,
        walk_minutes: values.walk_minutes,
        steps: values.steps,
        water_ml: values.water_ml,
        energy: values.energy,
        notes: values.notes.trim() || null,
      });
      this.log.set(saved);
      this.notice.set(completed ? 'Gün tamamlandı olarak işaretlendi.' : 'Kaydedildi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      this.savingCheckIn.set(false);
    }
  }

  protected setEnergy(level: number): void {
    const current = this.checkIn.controls.energy.value;
    this.checkIn.controls.energy.setValue(current === level ? null : level);
  }

  private async load(day: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      const [plan, entries, log, setLogs] = await Promise.all([
        this.program.day(day),
        this.program.exercisesForDay(day),
        this.workouts.logForDay(day),
        this.workouts.setLogsForDay(day),
      ]);

      this.plan.set(plan);
      this.log.set(log);
      this.rows.set(this.mergeRows(entries, setLogs));

      this.checkIn.reset({
        // Pre-fill the target so finishing the planned walk is one tap.
        walk_distance_km: log?.walk_distance_km ?? plan?.walk_distance_km ?? null,
        walk_minutes: log?.walk_minutes ?? plan?.target_minutes ?? null,
        steps: log?.steps ?? null,
        water_ml: log?.water_ml ?? null,
        energy: log?.energy ?? null,
        notes: log?.notes ?? '',
      });

      // The meal list is a nice-to-have; a failure here must not blank the page.
      this.meals
        .forDate(this.dayDate())
        .then((meals) => this.dayMeals.set(meals))
        .catch(() => this.dayMeals.set([]));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Gün yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  private mergeRows(entries: ProgramDayExercise[], setLogs: SetLog[]): ExerciseRow[] {
    const byExercise = new Map(setLogs.map((setLog) => [setLog.program_day_exercise_id, setLog]));
    return entries.map((entry) => {
      const setLog = byExercise.get(entry.id);
      return { entry, done: setLog?.done ?? false, reps: setLog?.reps_done ?? null };
    });
  }

  /** Updates one row in place so the UI responds before the network round trip. */
  private patchRow(entryId: string, patch: Partial<Omit<ExerciseRow, 'entry'>>): void {
    this.rows.update((rows) => rows.map((row) => (row.entry.id === entryId ? { ...row, ...patch } : row)));
  }

  private async persistSetLog(
    entryId: string,
    patch: Parameters<WorkoutService['saveSetLog']>[2],
  ): Promise<void> {
    try {
      await this.workouts.saveSetLog(this.day(), entryId, patch);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Hareket kaydedilemedi.');
      // Reload so the UI stops showing a value the database never accepted.
      await this.load(this.day());
    }
  }

  private readNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
