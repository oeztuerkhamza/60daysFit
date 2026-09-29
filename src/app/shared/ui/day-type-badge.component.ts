import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DayType, DAY_TYPE_LABELS } from '../../core/models';

/** Colour-coded label for what a program day asks of you. */
@Component({
  selector: 'app-day-type-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [style.--dot]="color()">{{ text() }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.15rem 0.6rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface-2);
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--dot, var(--text-muted));
    }
  `,
})
export class DayTypeBadgeComponent {
  readonly dayType = input.required<DayType>();

  protected readonly text = computed(() => DAY_TYPE_LABELS[this.dayType()]);
  protected readonly color = computed(() => `var(--day-${this.dayType().replace('_', '-')})`);
}
