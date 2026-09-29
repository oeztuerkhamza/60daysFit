import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/**
 * A single photo slot: tap to pick from the camera roll (or take one on a
 * phone), see the thumbnail, replace or remove it.
 *
 * The component never uploads anything itself — it emits the chosen `File` and
 * lets the page decide where it belongs.
 */
@Component({
  selector: 'app-photo-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="slot" [class.is-busy]="busy()" [style.--aspect]="aspect()">
      <label class="slot__drop" [attr.for]="inputId">
        @if (previewUrl()) {
          <img class="slot__img" [src]="previewUrl()" [alt]="label() + ' fotoğrafı'" />
        } @else {
          <span class="slot__empty">
            <span class="slot__icon" aria-hidden="true">＋</span>
            <span class="slot__hint">Fotoğraf ekle</span>
          </span>
        }

        @if (busy()) {
          <span class="slot__busy">Yükleniyor…</span>
        }
      </label>

      <input
        class="sr-only"
        type="file"
        accept="image/*"
        [id]="inputId"
        [disabled]="busy()"
        (change)="onPick($event)"
      />

      <figcaption class="slot__caption">
        <span>{{ label() }}</span>
        @if (previewUrl() && removable()) {
          <button class="slot__remove" type="button" [disabled]="busy()" (click)="removed.emit()">Kaldır</button>
        }
      </figcaption>
    </figure>
  `,
  styles: `
    :host { display: block; }

    .slot__drop {
      position: relative;
      display: block;
      aspect-ratio: var(--aspect, 3 / 4);
      margin: 0;
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      overflow: hidden;
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
      font-size: inherit;
      color: inherit;
      font-weight: inherit;
    }

    .slot.is-busy .slot__drop { cursor: progress; }
    .slot__drop:hover { border-color: var(--accent); }

    .slot__img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .slot__empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 0.25rem;
      color: var(--text-muted);
    }

    .slot__icon { font-size: 1.5rem; line-height: 1; }
    .slot__hint { font-size: 0.78rem; font-weight: 600; }

    .slot__busy {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      background: rgb(0 0 0 / 55%);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .slot { margin: 0; }

    .slot__caption {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      /* In a narrow slot the remove button drops below the label instead of
         colliding with the next slot's caption. */
      flex-wrap: wrap;
      gap: 0.1rem 0.5rem;
      margin-top: 0.35rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .slot__remove {
      padding: 0;
      border: 0;
      background: none;
      color: var(--danger);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
    }
  `,
})
export class PhotoUploadComponent {
  readonly label = input.required<string>();
  /** Signed URL of the photo already stored for this slot, if any. */
  readonly url = input<string | null>(null);
  readonly busy = input(false);
  readonly removable = input(true);
  /** CSS aspect ratio for the slot — portrait for body shots, landscape for meals. */
  readonly aspect = input('3 / 4');

  readonly picked = output<File>();
  readonly removed = output<void>();

  /** Unique per instance so the label/input pairing works with several slots on a page. */
  protected readonly inputId = `photo-${Math.random().toString(36).slice(2, 10)}`;

  /** Local object URL shown straight after picking, before the upload finishes. */
  private readonly localPreview = signal<string | null>(null);

  protected previewUrl(): string | null {
    return this.localPreview() ?? this.url();
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const previous = this.localPreview();
    if (previous) URL.revokeObjectURL(previous);
    this.localPreview.set(URL.createObjectURL(file));

    this.picked.emit(file);
    // Let the same file be picked again after a failed upload.
    input.value = '';
  }
}
