import { Component, inject, signal } from '@angular/core';
import { CodiceService } from '../../../core/codice/codice.service';
import type { EntryFieldTemplate, EntryType, FieldType } from '../../../core/codice/models';

const FIELD_TYPES: FieldType[] = [
  'text',
  'richtext',
  'number',
  'boolean',
  'date',
  'reference',
  'enum_list',
];

@Component({
  imports: [],
  selector: 'app-tipos-admin',
  templateUrl: './tipos-admin.html',
})
export class TiposAdmin {
  private readonly codice = inject(CodiceService);

  readonly fieldTypes = FIELD_TYPES;
  readonly entryTypes = signal<EntryType[]>([]);
  readonly selectedTypeId = signal<string | null>(null);
  readonly templates = signal<EntryFieldTemplate[]>([]);

  readonly newTypeCode = signal('');
  readonly newTypeLabel = signal('');

  readonly newFieldKey = signal('');
  readonly newFieldLabel = signal('');
  readonly newFieldType = signal<FieldType>('text');

  constructor() {
    void this.reloadTypes();
  }

  private async reloadTypes(): Promise<void> {
    this.entryTypes.set(await this.codice.listEntryTypes());
  }

  async selectType(typeId: string): Promise<void> {
    this.selectedTypeId.set(typeId);
    this.templates.set(await this.codice.listFieldTemplates(typeId));
  }

  async createType(event: Event): Promise<void> {
    event.preventDefault();
    await this.codice.createEntryType(this.newTypeCode(), this.newTypeLabel());
    this.newTypeCode.set('');
    this.newTypeLabel.set('');
    await this.reloadTypes();
  }

  async createField(event: Event): Promise<void> {
    event.preventDefault();
    const typeId = this.selectedTypeId();
    if (!typeId) return;
    await this.codice.createFieldTemplate(
      typeId,
      this.newFieldKey(),
      this.newFieldLabel(),
      this.newFieldType(),
      this.templates().length,
    );
    this.newFieldKey.set('');
    this.newFieldLabel.set('');
    await this.selectType(typeId);
  }
}
