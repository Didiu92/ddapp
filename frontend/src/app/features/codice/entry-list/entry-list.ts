import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodiceService } from '../../../core/codice/codice.service';
import type { Entry, EntryType } from '../../../core/codice/models';

interface EntryRow extends Entry {
  typeLabel: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-entry-list',
  templateUrl: './entry-list.html',
})
export class EntryList {
  private readonly codice = inject(CodiceService);

  readonly entryTypes = signal<EntryType[]>([]);
  readonly rows = signal<EntryRow[]>([]);
  readonly selectedTypeId = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const [types, entries] = await Promise.all([
      this.codice.listEntryTypes(),
      this.codice.listEntries(),
    ]);
    this.entryTypes.set(types);
    const typeById = new Map(types.map((t) => [t.id, t.label]));
    this.rows.set(
      entries.map((e) => ({ ...e, typeLabel: typeById.get(e.entry_type_id) ?? '?' })),
    );
  }

  filteredRows(): EntryRow[] {
    const typeId = this.selectedTypeId();
    return typeId ? this.rows().filter((r) => r.entry_type_id === typeId) : this.rows();
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTypeId.set(value || null);
  }
}
