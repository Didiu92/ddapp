import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CodiceService } from '../../../core/codice/codice.service';
import type { Race } from '../../../core/codice/models';

@Component({
  imports: [],
  selector: 'app-crear-personaje',
  templateUrl: './crear-personaje.html',
})
export class CrearPersonaje {
  private readonly auth = inject(AuthService);
  private readonly codice = inject(CodiceService);
  private readonly router = inject(Router);

  readonly races = signal<Race[]>([]);
  readonly name = signal('');
  readonly raceId = signal('');
  readonly profession = signal('');
  readonly age = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.codice.listRaces().then((races) => this.races.set(races));
  }

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onRaceChange(event: Event): void {
    this.raceId.set((event.target as HTMLSelectElement).value);
  }

  onProfessionInput(event: Event): void {
    this.profession.set((event.target as HTMLInputElement).value);
  }

  onAgeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.age.set(value ? Number(value) : null);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);
    const playerId = this.auth.session()?.user.id;
    if (!playerId || !this.raceId()) {
      this.errorMessage.set('Falta seleccionar una raza.');
      return;
    }

    const { error } = await this.codice.createCharacter({
      playerId,
      raceId: this.raceId(),
      name: this.name(),
      profession: this.profession() || null,
      age: this.age(),
    });

    if (error) {
      this.errorMessage.set(
        error.includes('characters_one_active_per_player')
          ? 'Ya tienes un personaje activo. Retíralo primero para crear uno nuevo.'
          : error,
      );
      return;
    }

    void this.router.navigateByUrl('/');
  }
}
