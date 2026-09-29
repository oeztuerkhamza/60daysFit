import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { SupabaseService } from './core/supabase/supabase.service';
import { SetupNoticeComponent } from './shared/ui/setup-notice.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SetupNoticeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly supabase = inject(SupabaseService);

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async signOut(): Promise<void> {
    this.closeMenu();
    await this.auth.signOut();
    await this.router.navigate(['/giris']);
  }
}
