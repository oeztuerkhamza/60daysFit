import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Focus, FOCUS_LABELS } from '../../core/models';

/** Colour-coded label for a program day's focus. */
@Component({
  selector: 'app-focus-badge',
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
export class FocusBadgeComponent {
  readonly focus = input.required<Focus>();

  protected readonly text = computed(() => FOCUS_LABELS[this.focus()]);
  protected readonly color = computed(() => `var(--focus-${this.focus()})`);
}
