import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type AppRole = 'master' | 'player';

interface Profile {
  id: string;
  display_name: string;
  role: AppRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly profileSignal = signal<Profile | null>(null);

  readonly session = this.sessionSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly role = computed<AppRole | null>(() => this.profileSignal()?.role ?? null);
  readonly isMaster = computed(() => this.role() === 'master');
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSignal.set(data.session);
      void this.loadProfile(data.session?.user.id ?? null);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      void this.loadProfile(session?.user.id ?? null);
    });
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  private async loadProfile(userId: string | null): Promise<void> {
    if (!userId) {
      this.profileSignal.set(null);
      return;
    }
    const { data } = await this.supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', userId)
      .single();
    this.profileSignal.set((data as Profile | null) ?? null);
  }
}
