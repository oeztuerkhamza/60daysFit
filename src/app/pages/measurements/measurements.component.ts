import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MeasurementService } from '../../core/data/measurement.service';
import { Measurement } from '../../core/models';
import { toDateOnly } from '../../core/data/stats';

/** A point on the weight chart, already projected into the SVG viewBox. */
interface ChartPoint {
  x: number;
  y: number;
  weight: number;
  date: string;
}

// Wide and shallow: the SVG scales uniformly, so this ratio also sets the
// rendered height at any container width.
const CHART_WIDTH = 640;
const CHART_HEIGHT = 110;
const CHART_PADDING = 8;

@Component({
  selector: 'app-measurements',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './measurements.component.html',
  styleUrl: './measurements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeasurementsComponent {
  private readonly service = inject(MeasurementService);

  protected readonly entries = signal<Measurement[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly form = new FormGroup({
    measured_on: new FormControl<string>(toDateOnly(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    weight_kg: new FormControl<number | null>(null),
    body_fat_pct: new FormControl<number | null>(null),
    waist_cm: new FormControl<number | null>(null),
    chest_cm: new FormControl<number | null>(null),
    hip_cm: new FormControl<number | null>(null),
    arm_cm: new FormControl<number | null>(null),
    thigh_cm: new FormControl<number | null>(null),
    note: new FormControl<string>('', { nonNullable: true }),
  });

  /** Newest first for the table; the service returns oldest first for the chart. */
  protected readonly newestFirst = computed(() => [...this.entries()].reverse());

  private readonly weightSeries = computed(() =>
    this.entries().filter((entry): entry is Measurement & { weight_kg: number } => entry.weight_kg !== null),
  );

  protected readonly summary = computed(() => {
    const series = this.weightSeries();
    if (series.length === 0) return null;
    const first = series[0];
    const last = series[series.length - 1];
    return {
      first: first.weight_kg,
      latest: last.weight_kg,
      change: last.weight_kg - first.weight_kg,
      count: this.entries().length,
    };
  });

  protected readonly chartPoints = computed<ChartPoint[]>(() => {
    const series = this.weightSeries();
    if (series.length < 2) return [];

    const weights = series.map((entry) => entry.weight_kg);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    // A flat series would divide by zero; give it a 1 kg band so the line sits mid-height.
    const span = max - min || 1;
    const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

    return series.map((entry, index) => ({
      x: CHART_PADDING + (index / (series.length - 1)) * usableWidth,
      y: CHART_PADDING + (1 - (entry.weight_kg - min) / span) * usableHeight,
      weight: entry.weight_kg,
      date: entry.measured_on,
    }));
  });

  protected readonly chartLine = computed(() =>
    this.chartPoints()
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' '),
  );

  constructor() {
    void this.load();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (this.isEmptyEntry(values)) {
      this.error.set('En az bir ölçüm alanı doldurulmalı.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      await this.service.save({ ...values, note: values.note.trim() || null });
      await this.load();
      this.notice.set('Ölçüm kaydedildi.');
      this.form.reset({ measured_on: toDateOnly(new Date()), note: '' });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Ölçüm kaydedilemedi.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(entry: Measurement): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      await this.service.remove(entry.id);
      this.entries.update((list) => list.filter((candidate) => candidate.id !== entry.id));
      this.notice.set('Ölçüm silindi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Ölçüm silinemedi.');
    }
  }

  /** Loads an existing row back into the form so the same date can be corrected. */
  protected edit(entry: Measurement): void {
    this.form.reset({
      measured_on: entry.measured_on,
      weight_kg: entry.weight_kg,
      body_fat_pct: entry.body_fat_pct,
      waist_cm: entry.waist_cm,
      chest_cm: entry.chest_cm,
      hip_cm: entry.hip_cm,
      arm_cm: entry.arm_cm,
      thigh_cm: entry.thigh_cm,
      note: entry.note ?? '',
    });
    this.notice.set(`${entry.measured_on} tarihli ölçüm forma yüklendi.`);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.entries.set(await this.service.list());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Ölçümler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  private isEmptyEntry(values: ReturnType<MeasurementsComponent['form']['getRawValue']>): boolean {
    const { measured_on, note, ...metrics } = values;
    return Object.values(metrics).every((value) => value === null);
  }
}
