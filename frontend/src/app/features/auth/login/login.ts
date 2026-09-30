import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  imports: [],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly errorMessage = signal<string | null>(null);

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);
    const { error } = await this.auth.signIn(this.email(), this.password());
    if (error) {
      this.errorMessage.set('Credenciales incorrectas.');
      return;
    }
    void this.router.navigateByUrl('/');
  }
}
