import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { activeDay } from '../../core/data/stats';
import { DailyLog, FOCUS_LABELS, ProgramDay } from '../../core/models';

interface WeekBlock {
  week: number;
  days: Array<ProgramDay & { done: boolean; isToday: boolean }>;
  doneCount: number;
}

@Component({
  selector: 'app-program',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './program.component.html',
  styleUrl: './program.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramComponent {
  private readonly auth = inject(AuthService);
  private readonly program = inject(ProgramService);
  private readonly workouts = inject(WorkoutService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly days = signal<ProgramDay[]>([]);
  protected readonly logs = signal<DailyLog[]>([]);

  protected readonly focusLabels = FOCUS_LABELS;
  protected readonly totalDays = environment.challengeLengthDays;
  protected readonly currentDay = computed(() => activeDay(this.auth.startDate(), this.totalDays));

  private readonly completed = computed(
    () => new Set(this.logs().filter((log) => log.completed).map((log) => log.day)),
  );

  protected readonly doneCount = computed(() => this.completed().size);

  protected readonly weeks = computed<WeekBlock[]>(() => {
    const blocks = new Map<number, WeekBlock>();
    for (const day of this.days()) {
      const block = blocks.get(day.week) ?? { week: day.week, days: [], doneCount: 0 };
      const done = this.completed().has(day.day);
      block.days.push({ ...day, done, isToday: day.day === this.currentDay() });
      if (done) block.doneCount += 1;
      blocks.set(day.week, block);
    }
    return [...blocks.values()].sort((a, b) => a.week - b.week);
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [days, logs] = await Promise.all([this.program.days(), this.workouts.allLogs()]);
      this.days.set(days);
      this.logs.set(logs);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Program yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
