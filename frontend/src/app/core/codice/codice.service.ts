import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CharacterRow,
  Entry,
  EntryFieldTemplate,
  EntryFragmentResolved,
  EntryType,
  FieldType,
  PlayerReveal,
  PlayerUnlock,
  Profile,
  Race,
  UnlockLevel,
} from './models';

@Injectable({ providedIn: 'root' })
export class CodiceService {
  private readonly supabase = inject(SupabaseService).client;

  async listEntryTypes(): Promise<EntryType[]> {
    const { data, error } = await this.supabase.from('entry_types').select('*').order('label');
    if (error) throw error;
    return data as EntryType[];
  }

  async createEntryType(code: string, label: string): Promise<void> {
    const { error } = await this.supabase.from('entry_types').insert({ code, label });
    if (error) throw error;
  }

  async listFieldTemplates(entryTypeId: string): Promise<EntryFieldTemplate[]> {
    const { data, error } = await this.supabase
      .from('entry_field_templates')
      .select('*')
      .eq('entry_type_id', entryTypeId)
      .order('sort_order');
    if (error) throw error;
    return data as EntryFieldTemplate[];
  }

  async createFieldTemplate(
    entryTypeId: string,
    fieldKey: string,
    label: string,
    fieldType: FieldType,
    sortOrder: number,
  ): Promise<void> {
    const { error } = await this.supabase.from('entry_field_templates').insert({
      entry_type_id: entryTypeId,
      field_key: fieldKey,
      label,
      field_type: fieldType,
      sort_order: sortOrder,
    });
    if (error) throw error;
  }

  async listEntries(): Promise<Entry[]> {
    const { data, error } = await this.supabase.from('entries').select('*').order('code');
    if (error) throw error;
    return data as Entry[];
  }

  async createEntry(
    entryTypeId: string,
    code: string,
    showAsUnknownPlaceholder: boolean,
  ): Promise<Entry> {
    const { data, error } = await this.supabase
      .from('entries')
      .insert({ entry_type_id: entryTypeId, code, show_as_unknown_placeholder: showAsUnknownPlaceholder })
      .select()
      .single();
    if (error) throw error;
    return data as Entry;
  }

  async updateEntryStatus(entryId: string, status: 'draft' | 'published'): Promise<void> {
    const { error } = await this.supabase.from('entries').update({ status }).eq('id', entryId);
    if (error) throw error;
  }

  async listFragmentsResolved(entryId: string): Promise<EntryFragmentResolved[]> {
    const { data, error } = await this.supabase
      .from('entry_fragments_resolved')
      .select('*')
      .eq('entry_id', entryId)
      .order('sort_order');
    if (error) throw error;
    return data as EntryFragmentResolved[];
  }

  async createFragment(
    entryId: string,
    fieldKey: string,
    unlockLevel: UnlockLevel,
    contentKnown: string,
    contentReal: string | null,
    sortOrder: number,
  ): Promise<void> {
    const { error } = await this.supabase.from('entry_fragments').insert({
      entry_id: entryId,
      field_key: fieldKey,
      unlock_level: unlockLevel,
      content_known: contentKnown,
      content_real: contentReal,
      sort_order: sortOrder,
    });
    if (error) throw error;
  }

  async updateFragmentStatus(fragmentId: string, status: 'draft' | 'published'): Promise<void> {
    const { error } = await this.supabase
      .from('entry_fragments')
      .update({ status })
      .eq('id', fragmentId);
    if (error) throw error;
  }

  async listRaces(): Promise<Race[]> {
    const { data, error } = await this.supabase.from('races').select('*').order('name');
    if (error) throw error;
    return data as Race[];
  }

  async listCharacters(): Promise<CharacterRow[]> {
    const { data, error } = await this.supabase.from('characters').select('*').order('name');
    if (error) throw error;
    return data as CharacterRow[];
  }

  async createCharacter(input: {
    playerId: string;
    raceId: string;
    name: string;
    profession: string | null;
    age: number | null;
  }): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('characters').insert({
      player_id: input.playerId,
      race_id: input.raceId,
      name: input.name,
      profession: input.profession,
      age: input.age,
    });
    return { error: error?.message ?? null };
  }

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('display_name');
    if (error) throw error;
    return data as Profile[];
  }

  async createUnlock(
    playerId: string | null,
    entryId: string,
    unlockLevel: UnlockLevel,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('player_unlocks')
      .insert({ player_id: playerId, entry_id: entryId, unlock_level: unlockLevel });
    if (error) throw error;
  }

  async listUnlocksForEntry(entryId: string): Promise<PlayerUnlock[]> {
    const { data, error } = await this.supabase
      .from('player_unlocks')
      .select('*')
      .eq('entry_id', entryId);
    if (error) throw error;
    return data as PlayerUnlock[];
  }

  async createReveal(playerId: string | null, entryFragmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('player_reveals')
      .insert({ player_id: playerId, entry_fragment_id: entryFragmentId });
    if (error) throw error;
  }

  async listRevealsForFragment(entryFragmentId: string): Promise<PlayerReveal[]> {
    const { data, error } = await this.supabase
      .from('player_reveals')
      .select('*')
      .eq('entry_fragment_id', entryFragmentId);
    if (error) throw error;
    return data as PlayerReveal[];
  }
}
