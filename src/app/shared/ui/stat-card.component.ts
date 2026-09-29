import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A single headline number with a label and optional caption. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card--tight">
      <p class="label">{{ label() }}</p>
      <p class="value mono">{{ display() }}</p>
      @if (caption()) {
        <p class="caption muted">{{ caption() }}</p>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .label {
      margin: 0 0 0.3rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .value { margin: 0; font-size: 1.7rem; font-weight: 700; line-height: 1.1; }
    .caption { margin: 0.3rem 0 0; font-size: 0.8rem; }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  /** Accepts null so pipes such as `number` can be bound directly. */
  readonly value = input.required<string | number | null>();
  readonly suffix = input('');
  readonly caption = input('');

  protected readonly display = computed(() => {
    const value = this.value();
    return value === null || value === '' ? '—' : `${value}${this.suffix()}`;
  });
}
