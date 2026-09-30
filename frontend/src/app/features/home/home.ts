import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly auth = inject(AuthService);

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
