import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { MealService } from '../../core/data/meal.service';
import { NUTRITION_RULES } from '../../core/data/nutrition';
import { toDateOnly } from '../../core/data/stats';
import { Meal, MealType, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../core/models';
import { PhotoUploadComponent } from '../../shared/ui/photo-upload.component';

interface MealView extends Meal {
  photoUrl: string | null;
}

interface DayGroup {
  date: string;
  meals: MealView[];
  proteinG: number;
  sugarCount: number;
}

@Component({
  selector: 'app-meals',
  standalone: true,
  imports: [ReactiveFormsModule, PhotoUploadComponent],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealsComponent {
  private readonly service = inject(MealService);
  private readonly auth = inject(AuthService);

  protected readonly rules = NUTRITION_RULES;
  protected readonly mealTypes = MEAL_TYPE_ORDER;
  protected readonly mealTypeLabels = MEAL_TYPE_LABELS;

  protected readonly meals = signal<Meal[]>([]);
  private readonly photoUrls = signal<Map<string, string>>(new Map());
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  /** The photo picked for the entry being written, uploaded on save. */
  protected readonly pendingPhoto = signal<File | null>(null);

  protected readonly proteinTarget = computed(() => this.auth.profile()?.protein_target_g ?? null);

  protected readonly form = new FormGroup({
    eaten_on: new FormControl<string>(toDateOnly(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    meal_type: new FormControl<MealType>('ogle', { nonNullable: true }),
    description: new FormControl<string>('', { nonNullable: true }),
    protein_source: new FormControl<string>('', { nonNullable: true }),
    protein_g: new FormControl<number | null>(null),
    has_sugar: new FormControl<boolean>(false, { nonNullable: true }),
    has_refined_carbs: new FormControl<boolean>(false, { nonNullable: true }),
  });

  /** The diary, newest day first, with each day's protein and sugar tally. */
  protected readonly groups = computed<DayGroup[]>(() => {
    const urls = this.photoUrls();
    const byDate = new Map<string, MealView[]>();

    for (const meal of this.meals()) {
      const view: MealView = {
        ...meal,
        photoUrl: meal.storage_path ? (urls.get(meal.storage_path) ?? null) : null,
      };
      byDate.set(meal.eaten_on, [...(byDate.get(meal.eaten_on) ?? []), view]);
    }

    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, meals]) => ({
        date,
        meals,
        proteinG: meals.reduce((sum, meal) => sum + (meal.protein_g ?? 0), 0),
        sugarCount: meals.filter((meal) => meal.has_sugar || meal.has_refined_carbs).length,
      }));
  });

  constructor() {
    void this.load();
  }

  protected onPhotoPicked(file: File): void {
    this.pendingPhoto.set(file);
  }

  protected clearPhoto(): void {
    this.pendingPhoto.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      await this.service.create(
        {
          eaten_on: values.eaten_on,
          meal_type: values.meal_type,
          description: values.description.trim() || null,
          protein_source: values.protein_source.trim() || null,
          protein_g: values.protein_g,
          has_sugar: values.has_sugar,
          has_refined_carbs: values.has_refined_carbs,
        },
        this.pendingPhoto(),
      );

      this.pendingPhoto.set(null);
      this.form.reset({
        eaten_on: values.eaten_on,
        meal_type: values.meal_type,
        description: '',
        protein_source: '',
        protein_g: null,
        has_sugar: false,
        has_refined_carbs: false,
      });
      this.notice.set('Öğün kaydedildi.');
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Öğün kaydedilemedi.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(meal: Meal): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      await this.service.remove(meal);
      this.meals.update((list) => list.filter((candidate) => candidate.id !== meal.id));
      this.notice.set('Öğün silindi.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Öğün silinemedi.');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const meals = await this.service.recent();
      this.meals.set(meals);

      // Thumbnails are a bonus: a signing failure must not hide the diary.
      try {
        this.photoUrls.set(await this.service.signedUrls(meals));
      } catch {
        this.photoUrls.set(new Map());
        this.error.set('Fotoğraflar yüklenemedi, kayıtlar etkilenmedi.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Öğünler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
