import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { CheckpointService } from '../../core/data/checkpoint.service';
import { activeDay, checkpointSlots, CheckpointSlot, toDateOnly } from '../../core/data/stats';
import { Checkpoint, CheckpointPhoto, PhotoPose, POSES, POSE_LABELS } from '../../core/models';
import { PhotoUploadComponent } from '../../shared/ui/photo-upload.component';

interface SlotView extends CheckpointSlot {
  key: string;
  checkpoint: Checkpoint | null;
  /** The calendar has reached this slot. */
  due: boolean;
  recorded: boolean;
}

interface ChartPoint {
  x: number;
  y: number;
  weight: number;
  label: string;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 110;
const CHART_PADDING = 8;
const TOTAL_DAYS = environment.challengeLengthDays;

function slotKey(kind: string, week: number): string {
  return `${kind}:${kind === 'week' ? week : 0}`;
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, PhotoUploadComponent],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  private readonly auth = inject(AuthService);
  private readonly service = inject(CheckpointService);

  protected readonly poses = POSES;
  protected readonly poseLabels = POSE_LABELS;
  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly checkpoints = signal<Checkpoint[]>([]);
  private readonly photoUrls = signal<Map<string, string>>(new Map());
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploadingPose = signal<PhotoPose | null>(null);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  /** Which slot the editor is showing; empty until the first load picks one. */
  private readonly selectedKey = signal('');

  protected readonly currentDay = computed(() => activeDay(this.auth.startDate(), TOTAL_DAYS));

  protected readonly form = new FormGroup({
    recorded_on: new FormControl<string>(toDateOnly(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    weight_kg: new FormControl<number | null>(null),
    height_cm: new FormControl<number | null>(null),
    waist_cm: new FormControl<number | null>(null),
    chest_cm: new FormControl<number | null>(null),
    arm_cm: new FormControl<number | null>(null),
    thigh_cm: new FormControl<number | null>(null),
    note: new FormControl<string>('', { nonNullable: true }),
  });

  protected readonly slots = computed<SlotView[]>(() => {
    const byKey = new Map(this.checkpoints().map((entry) => [slotKey(entry.kind, entry.week), entry]));
    const today = this.currentDay();

    return checkpointSlots(TOTAL_DAYS).map((slot) => {
      const key = slotKey(slot.kind, slot.week);
      const checkpoint = byKey.get(key) ?? null;
      return { ...slot, key, checkpoint, due: today >= slot.dueFromDay, recorded: checkpoint !== null };
    });
  });

  protected readonly selected = computed<SlotView | null>(
    () => this.slots().find((slot) => slot.key === this.selectedKey()) ?? null,
  );

  /** Photos of the selected slot, keyed by pose, with signed URLs resolved. */
  protected readonly selectedPhotos = computed(() => {
    const urls = this.photoUrls();
    const photos = this.selected()?.checkpoint?.photos ?? [];
    const byPose = new Map<PhotoPose, { photo: CheckpointPhoto; url: string | null }>();
    for (const photo of photos) {
      byPose.set(photo.pose, { photo, url: urls.get(photo.storage_path) ?? null });
    }
    return byPose;
  });

  private readonly weighIns = computed(() =>
    this.checkpoints()
      .filter((entry): entry is Checkpoint & { weight_kg: number } => entry.weight_kg !== null)
      .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on)),
  );

  protected readonly summary = computed(() => {
    const series = this.weighIns();
    if (series.length === 0) return null;
    const first = series[0];
    const last = series[series.length - 1];
    return {
      first: first.weight_kg,
      latest: last.weight_kg,
      change: last.weight_kg - first.weight_kg,
      count: series.length,
    };
  });

  protected readonly chartPoints = computed<ChartPoint[]>(() => {
    const series = this.weighIns();
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
      label: entry.recorded_on,
    }));
  });

  protected readonly chartLine = computed(() =>
    this.chartPoints()
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' '),
  );

  /** Start and latest photo sets, for the before/after strip. */
  protected readonly comparison = computed(() => {
    const urls = this.photoUrls();
    const withPhotos = this.checkpoints().filter((entry) => entry.photos.length > 0);
    if (withPhotos.length < 2) return null;

    const pick = (checkpoint: Checkpoint) =>
      POSES.map((pose) => {
        const photo = checkpoint.photos.find((candidate) => candidate.pose === pose);
        return { pose, url: photo ? (urls.get(photo.storage_path) ?? null) : null };
      });

    const first = withPhotos[0];
    const last = withPhotos[withPhotos.length - 1];
    return {
      firstLabel: first.recorded_on,
      lastLabel: last.recorded_on,
      first: pick(first),
      last: pick(last),
    };
  });

  constructor() {
    void this.load();
  }

  protected select(slot: SlotView): void {
    this.selectedKey.set(slot.key);
    this.notice.set('');
    this.error.set('');
    this.fillForm(slot);
  }

  protected async save(): Promise<void> {
    const slot = this.selected();
    if (!slot || this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      await this.persist(slot);
      this.notice.set('Kayıt güncellendi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Kayıt tamamlanamadı.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async onPhotoPicked(pose: PhotoPose, file: File): Promise<void> {
    const slot = this.selected();
    if (!slot) return;

    this.uploadingPose.set(pose);
    this.error.set('');
    this.notice.set('');

    try {
      // A photo needs a checkpoint row to hang off, so create it first if needed.
      const checkpoint = slot.checkpoint ?? (await this.persist(slot));
      await this.service.savePhoto(checkpoint, pose, file);
      await this.load();
      this.notice.set(`${POSE_LABELS[pose]} fotoğraf yüklendi.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.');
    } finally {
      this.uploadingPose.set(null);
    }
  }

  protected async removePhoto(photo: CheckpointPhoto): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      await this.service.removePhoto(photo);
      await this.load();
      this.notice.set('Fotoğraf silindi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Fotoğraf silinemedi.');
    }
  }

  /** Writes the form into the slot's checkpoint, creating it when missing. */
  private async persist(slot: SlotView): Promise<Checkpoint> {
    const values = this.form.getRawValue();
    const saved = await this.service.save(slot.kind, slot.week, {
      recorded_on: values.recorded_on,
      weight_kg: values.weight_kg,
      height_cm: slot.kind === 'start' ? values.height_cm : null,
      waist_cm: values.waist_cm,
      chest_cm: values.chest_cm,
      arm_cm: values.arm_cm,
      thigh_cm: values.thigh_cm,
      note: values.note.trim() || null,
    });

    this.checkpoints.update((list) => {
      const rest = list.filter((entry) => slotKey(entry.kind, entry.week) !== slot.key);
      return [...rest, saved].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
    });
    return saved;
  }

  private fillForm(slot: SlotView): void {
    const checkpoint = slot.checkpoint;
    this.form.reset({
      recorded_on: checkpoint?.recorded_on ?? toDateOnly(new Date()),
      weight_kg: checkpoint?.weight_kg ?? null,
      height_cm: checkpoint?.height_cm ?? this.auth.profile()?.height_cm ?? null,
      waist_cm: checkpoint?.waist_cm ?? null,
      chest_cm: checkpoint?.chest_cm ?? null,
      arm_cm: checkpoint?.arm_cm ?? null,
      thigh_cm: checkpoint?.thigh_cm ?? null,
      note: checkpoint?.note ?? '',
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const checkpoints = await this.service.list();
      this.checkpoints.set(checkpoints);

      // Thumbnails are a bonus: if signing fails the weigh-ins and the editor
      // must still work, so this failure never reaches the outer catch.
      try {
        this.photoUrls.set(await this.service.signedUrls(checkpoints));
      } catch {
        this.photoUrls.set(new Map());
        this.error.set('Fotoğraflar yüklenemedi, ölçümler etkilenmedi.');
      }

      const slots = this.slots();
      // Land on the oldest check-in still owed, falling back to the first slot.
      const target = slots.find((slot) => slot.due && !slot.recorded) ?? slots[0];
      const current = slots.find((slot) => slot.key === this.selectedKey());
      const next = current ?? target;
      if (next) {
        this.selectedKey.set(next.key);
        this.fillForm(next);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Kayıtlar yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
