import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Shown instead of the app when the build has no Supabase credentials. */
@Component({
  selector: 'app-setup-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card stack">
      <h1>Kurulum tamamlanmadı</h1>
      <p class="muted">
        60dayfit bir Supabase projesine bağlanmadan çalışamaz. Üç adımda hazır hâle getirebilirsin:
      </p>
      <ol class="steps">
        <li>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">Supabase</a>
          üzerinde yeni bir proje oluştur.
        </li>
        <li>
          <code>supabase/migrations</code> altındaki iki SQL dosyasını sırayla SQL Editor'de çalıştır.
        </li>
        <li>
          <code>.env.example</code> dosyasını <code>.env</code> olarak kopyala,
          <code>SUPABASE_URL</code> ve <code>SUPABASE_ANON_KEY</code> değerlerini doldur, ardından
          <code>npm start</code> komutunu yeniden çalıştır.
        </li>
      </ol>
      <p class="muted">Ayrıntılı anlatım için depodaki README dosyasına bakabilirsin.</p>
    </section>
  `,
  styles: `
    :host { display: block; max-width: 640px; margin-inline: auto; }
    .steps { margin: 0; padding-left: 1.25rem; }
    .steps li + li { margin-top: 0.55rem; }
    code {
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
      background: var(--surface-2);
      font-family: var(--font-mono);
      font-size: 0.85em;
    }
  `,
})
export class SetupNoticeComponent {}
