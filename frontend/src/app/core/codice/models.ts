export type UnlockLevel = 'descubierto' | 'explorado';
export type EntryStatus = 'draft' | 'published';
export type CharacterStatus = 'activo' | 'retirado' | 'muerto';
export type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'reference'
  | 'enum_list';

export interface EntryType {
  id: string;
  code: string;
  label: string;
}

export interface EntryFieldTemplate {
  id: string;
  entry_type_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  config: Record<string, unknown>;
  sort_order: number;
}

export interface Entry {
  id: string;
  entry_type_id: string;
  code: string;
  status: EntryStatus;
  show_as_unknown_placeholder: boolean;
}

export interface EntryFragmentResolved {
  id: string;
  entry_id: string;
  sort_order: number;
  unlock_level: UnlockLevel;
  status: EntryStatus;
  field_key: string;
  content_known: string;
  content_real: string | null;
}

export interface Race {
  id: string;
  code: string;
  name: string;
  summary: string;
  ancestral_question: string;
  entry_id: string | null;
}

export interface CharacterRow {
  id: string;
  player_id: string;
  race_id: string;
  name: string;
  profession: string | null;
  age: number | null;
  status: CharacterStatus;
}

export interface Profile {
  id: string;
  display_name: string;
  role: 'master' | 'player';
}

export interface PlayerUnlock {
  id: string;
  player_id: string | null;
  entry_id: string;
  unlock_level: UnlockLevel;
}

export interface PlayerReveal {
  id: string;
  player_id: string | null;
  entry_fragment_id: string;
}
