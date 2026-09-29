import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { authErrorMessage } from '../../core/auth/auth-errors';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly confirmationSent = signal(false);

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const { displayName, email, password } = this.form.getRawValue();

    try {
      const { needsConfirmation } = await this.auth.signUp(email.trim(), password, displayName.trim());
      if (needsConfirmation) {
        this.confirmationSent.set(true);
        return;
      }
      await this.router.navigate(['/']);
    } catch (err) {
      this.error.set(authErrorMessage(err));
    } finally {
      this.submitting.set(false);
    }
  }
}
