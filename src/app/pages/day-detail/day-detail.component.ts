import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { DailyLog, ProgramDay, ProgramDayExercise, SetLog } from '../../core/models';
import { FocusBadgeComponent } from '../../shared/ui/focus-badge.component';

/** One exercise of the day plus whatever the user has recorded against it. */
interface ExerciseRow {
  entry: ProgramDayExercise;
  done: boolean;
  weight: number | null;
  reps: number | null;
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
  imports: [ReactiveFormsModule, RouterLink, FocusBadgeComponent],
  templateUrl: './day-detail.component.html',
  styleUrl: './day-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly program = inject(ProgramService);
  private readonly workouts = inject(WorkoutService);

  protected readonly totalDays = environment.challengeLengthDays;
  protected readonly energyLabels = ENERGY_LABELS;
  protected readonly energyLevels = [1, 2, 3, 4, 5];

  protected readonly day = signal(1);
  protected readonly plan = signal<ProgramDay | null>(null);
  protected readonly rows = signal<ExerciseRow[]>([]);
  protected readonly log = signal<DailyLog | null>(null);

  protected readonly loading = signal(true);
  protected readonly savingCheckIn = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly checkIn = new FormGroup({
    duration_minutes: new FormControl<number | null>(null),
    water_ml: new FormControl<number | null>(null),
    steps: new FormControl<number | null>(null),
    energy: new FormControl<number | null>(null),
    notes: new FormControl<string>('', { nonNullable: true }),
  });

  protected readonly completed = computed(() => this.log()?.completed ?? false);
  protected readonly doneCount = computed(() => this.rows().filter((row) => row.done).length);
  protected readonly prevDay = computed(() => (this.day() > 1 ? this.day() - 1 : null));
  protected readonly nextDay = computed(() => (this.day() < this.totalDays ? this.day() + 1 : null));

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

  protected async onWeightChange(row: ExerciseRow, event: Event): Promise<void> {
    const weight = this.readNumber(event);
    this.patchRow(row.entry.id, { weight });
    await this.persistSetLog(row.entry.id, { weight_kg: weight });
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
        duration_minutes: values.duration_minutes,
        water_ml: values.water_ml,
        steps: values.steps,
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
        duration_minutes: log?.duration_minutes ?? plan?.target_minutes ?? null,
        water_ml: log?.water_ml ?? null,
        steps: log?.steps ?? null,
        energy: log?.energy ?? null,
        notes: log?.notes ?? '',
      });
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
      return {
        entry,
        done: setLog?.done ?? false,
        weight: setLog?.weight_kg ?? null,
        reps: setLog?.reps_done ?? null,
      };
    });
  }

  /** Updates one row in place so the UI responds before the network round trip. */
  private patchRow(entryId: string, patch: Partial<Omit<ExerciseRow, 'entry'>>): void {
    this.rows.update((rows) =>
      rows.map((row) => (row.entry.id === entryId ? { ...row, ...patch } : row)),
    );
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
