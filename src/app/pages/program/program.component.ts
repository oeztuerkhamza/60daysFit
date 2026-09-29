import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { ProgramService } from '../../core/data/program.service';
import { WorkoutService } from '../../core/data/workout.service';
import { activeDay } from '../../core/data/stats';
import { DailyLog, DAY_TYPE_LABELS, ProgramDay } from '../../core/models';

interface ProgramDayView extends ProgramDay {
  done: boolean;
  isToday: boolean;
  colorVar: string;
}

interface WeekBlock {
  week: number;
  days: ProgramDayView[];
  doneCount: number;
  totalKm: number;
}

@Component({
  selector: 'app-program',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
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

  protected readonly dayTypeLabels = DAY_TYPE_LABELS;
  protected readonly totalDays = environment.challengeLengthDays;
  protected readonly currentDay = computed(() => activeDay(this.auth.startDate(), this.totalDays));

  private readonly completed = computed(
    () => new Set(this.logs().filter((log) => log.completed).map((log) => log.day)),
  );

  protected readonly doneCount = computed(() => this.completed().size);

  /** Total distance the plan asks for across all 60 days. */
  protected readonly plannedKm = computed(() =>
    Math.round(this.days().reduce((sum, day) => sum + day.walk_distance_km, 0)),
  );

  protected readonly weeks = computed<WeekBlock[]>(() => {
    const blocks = new Map<number, WeekBlock>();
    for (const day of this.days()) {
      const block = blocks.get(day.week) ?? { week: day.week, days: [], doneCount: 0, totalKm: 0 };
      const done = this.completed().has(day.day);
      block.days.push({
        ...day,
        done,
        isToday: day.day === this.currentDay(),
        colorVar: `var(--day-${day.day_type.replace('_', '-')})`,
      });
      if (done) block.doneCount += 1;
      block.totalKm = Math.round((block.totalKm + day.walk_distance_km) * 10) / 10;
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
