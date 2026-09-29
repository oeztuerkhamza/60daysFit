import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card center stack">
      <h1>Sayfa bulunamadı</h1>
      <p class="muted">Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <p><a class="btn btn--primary" routerLink="/">Panele dön</a></p>
    </section>
  `,
})
export class NotFoundComponent {}
