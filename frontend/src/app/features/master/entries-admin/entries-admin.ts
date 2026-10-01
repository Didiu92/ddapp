import { Component, inject, signal } from '@angular/core';
import { CodiceService } from '../../../core/codice/codice.service';
import type {
  Entry,
  EntryFragmentResolved,
  EntryType,
  PlayerReveal,
  PlayerUnlock,
  Profile,
  UnlockLevel,
} from '../../../core/codice/models';

@Component({
  imports: [],
  selector: 'app-entries-admin',
  templateUrl: './entries-admin.html',
})
export class EntriesAdmin {
  private readonly codice = inject(CodiceService);

  readonly entryTypes = signal<EntryType[]>([]);
  readonly entries = signal<Entry[]>([]);
  readonly profiles = signal<Profile[]>([]);
  readonly selectedEntry = signal<Entry | null>(null);
  readonly fragments = signal<EntryFragmentResolved[]>([]);
  readonly unlocks = signal<PlayerUnlock[]>([]);
  readonly revealsByFragment = signal<Record<string, PlayerReveal[]>>({});

  readonly newEntryTypeId = signal('');
  readonly newEntryCode = signal('');
  readonly newEntryPlaceholder = signal(false);

  readonly newFragmentFieldKey = signal('');
  readonly newFragmentLevel = signal<UnlockLevel>('descubierto');
  readonly newFragmentKnown = signal('');
  readonly newFragmentReal = signal('');

  readonly unlockPlayerId = signal('');
  readonly unlockLevel = signal<UnlockLevel>('descubierto');

  constructor() {
    void this.reloadAll();
  }

  private async reloadAll(): Promise<void> {
    const [types, entries, profiles] = await Promise.all([
      this.codice.listEntryTypes(),
      this.codice.listEntries(),
      this.codice.listProfiles(),
    ]);
    this.entryTypes.set(types);
    this.entries.set(entries);
    this.profiles.set(profiles);
  }

  typeLabel(entryTypeId: string): string {
    return this.entryTypes().find((t) => t.id === entryTypeId)?.label ?? '?';
  }

  async createEntry(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.newEntryTypeId()) return;
    await this.codice.createEntry(
      this.newEntryTypeId(),
      this.newEntryCode(),
      this.newEntryPlaceholder(),
    );
    this.newEntryCode.set('');
    this.newEntryPlaceholder.set(false);
    await this.reloadAll();
  }

  async selectEntry(entry: Entry): Promise<void> {
    this.selectedEntry.set(entry);
    this.fragments.set(await this.codice.listFragmentsResolved(entry.id));
    this.unlocks.set(await this.codice.listUnlocksForEntry(entry.id));
    const revealsByFragment: Record<string, PlayerReveal[]> = {};
    for (const fragment of this.fragments()) {
      revealsByFragment[fragment.id] = await this.codice.listRevealsForFragment(fragment.id);
    }
    this.revealsByFragment.set(revealsByFragment);
  }

  async toggleEntryStatus(entry: Entry): Promise<void> {
    const next = entry.status === 'draft' ? 'published' : 'draft';
    await this.codice.updateEntryStatus(entry.id, next);
    await this.reloadAll();
    if (this.selectedEntry()?.id === entry.id) {
      await this.selectEntry({ ...entry, status: next });
    }
  }

  async createFragment(event: Event): Promise<void> {
    event.preventDefault();
    const entry = this.selectedEntry();
    if (!entry) return;
    await this.codice.createFragment(
      entry.id,
      this.newFragmentFieldKey(),
      this.newFragmentLevel(),
      this.newFragmentKnown(),
      this.newFragmentReal() || null,
      this.fragments().length,
    );
    this.newFragmentFieldKey.set('');
    this.newFragmentKnown.set('');
    this.newFragmentReal.set('');
    await this.selectEntry(entry);
  }

  async toggleFragmentStatus(fragment: EntryFragmentResolved): Promise<void> {
    const next = fragment.status === 'draft' ? 'published' : 'draft';
    await this.codice.updateFragmentStatus(fragment.id, next);
    const entry = this.selectedEntry();
    if (entry) await this.selectEntry(entry);
  }

  async assignUnlock(event: Event): Promise<void> {
    event.preventDefault();
    const entry = this.selectedEntry();
    if (!entry) return;
    await this.codice.createUnlock(this.unlockPlayerId() || null, entry.id, this.unlockLevel());
    await this.selectEntry(entry);
  }

  async assignReveal(fragmentId: string, playerId: string): Promise<void> {
    await this.codice.createReveal(playerId || null, fragmentId);
    const entry = this.selectedEntry();
    if (entry) await this.selectEntry(entry);
  }

  profileName(playerId: string | null): string {
    if (!playerId) return 'Global (todos)';
    return this.profiles().find((p) => p.id === playerId)?.display_name ?? playerId;
  }
}
