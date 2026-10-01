import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { CodiceService } from '../../../core/codice/codice.service';
import type { Entry, EntryFragmentResolved, EntryType } from '../../../core/codice/models';

@Component({
  imports: [],
  selector: 'app-entry-detail',
  templateUrl: './entry-detail.html',
})
export class EntryDetail {
  private readonly supabase = inject(SupabaseService).client;
  private readonly codice = inject(CodiceService);
  private readonly route = inject(ActivatedRoute);

  readonly entry = signal<Entry | null>(null);
  readonly entryType = signal<EntryType | null>(null);
  readonly fragments = signal<EntryFragmentResolved[]>([]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.load(id);
    }
  }

  private async load(entryId: string): Promise<void> {
    const { data: entry } = await this.supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .single();
    this.entry.set(entry as Entry | null);

    if (entry) {
      const { data: entryType } = await this.supabase
        .from('entry_types')
        .select('*')
        .eq('id', (entry as Entry).entry_type_id)
        .single();
      this.entryType.set(entryType as EntryType | null);
    }

    this.fragments.set(await this.codice.listFragmentsResolved(entryId));
  }

  showUnknownPlaceholder(): boolean {
    return (this.entry()?.show_as_unknown_placeholder ?? false) && this.fragments().length === 0;
  }
}
