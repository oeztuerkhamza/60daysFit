import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A circular completion indicator drawn as a stroked SVG arc. */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="viewBox()" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="label()">
      <circle
        class="track"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        [attr.stroke-width]="stroke()"
      />
      <circle
        class="value"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        [attr.stroke-width]="stroke()"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="offset()"
        [attr.transform]="'rotate(-90 ' + center() + ' ' + center() + ')'"
      />
      <text class="pct" [attr.x]="center()" [attr.y]="center()" dominant-baseline="central" text-anchor="middle">
        {{ clamped() }}%
      </text>
    </svg>
  `,
  styles: `
    :host { display: inline-block; line-height: 0; }
    .track { fill: none; stroke: var(--border); }
    .value { fill: none; stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset 0.4s ease; }
    .pct { fill: var(--text); font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  `,
})
export class ProgressRingComponent {
  readonly percent = input.required<number>();
  readonly size = input(120);
  readonly stroke = input(10);
  readonly label = input('Tamamlanma oranı');

  protected readonly clamped = computed(() => Math.min(Math.max(Math.round(this.percent()), 0), 100));
  protected readonly center = computed(() => this.size() / 2);
  protected readonly radius = computed(() => this.center() - this.stroke() / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly viewBox = computed(() => `0 0 ${this.size()} ${this.size()}`);
  protected readonly offset = computed(() => this.circumference() * (1 - this.clamped() / 100));
}
