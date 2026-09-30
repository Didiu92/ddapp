-- Motor genérico del códice: tipos de entrada configurables por datos.
create table public.entry_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null
);

alter table public.entry_types enable row level security;

-- Los tipos en sí no son lore ni son sensibles: visibles para cualquier
-- autenticado (se necesitan para pintar "???" con la etiqueta del tipo).
-- Solo la máster los crea/edita.
create policy entry_types_select_authenticated
  on public.entry_types
  for select
  using (auth.role() = 'authenticated');

create policy entry_types_write_master
  on public.entry_types
  for all
  using (public.is_master())
  with check (public.is_master());

-- Plantillas de campo por tipo: qué campos tiene cada tipo de entrada, sin
-- tocar código para añadir uno nuevo.
create table public.entry_field_templates (
  id uuid primary key default gen_random_uuid(),
  entry_type_id uuid not null references public.entry_types (id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (
    field_type in ('text', 'richtext', 'number', 'boolean', 'date', 'reference', 'enum_list')
  ),
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  unique (entry_type_id, field_key)
);

alter table public.entry_field_templates enable row level security;

create policy entry_field_templates_select_authenticated
  on public.entry_field_templates
  for select
  using (auth.role() = 'authenticated');

create policy entry_field_templates_write_master
  on public.entry_field_templates
  for all
  using (public.is_master())
  with check (public.is_master());

-- Regla de oro: entries NUNCA lleva texto identificativo (nombre,
-- descripción...). Ese contenido vive siempre en entry_fragments (HU 2.2),
-- sujeto a su propia RLS por nivel de desbloqueo. Si aquí hubiera un
-- nombre visible, se filtraría por esta política de tabla aunque el
-- fragmento con ese nombre siguiera bloqueado.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  entry_type_id uuid not null references public.entry_types (id),
  code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  show_as_unknown_placeholder boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entries enable row level security;

-- La máster ve todo (incluido draft); el jugador solo ve entries publicadas.
-- Esto NO decide el "???": eso depende de si hay fragments visibles
-- (HU 2.2), no de esta tabla.
create policy entries_select_master
  on public.entries
  for select
  using (public.is_master());

create policy entries_select_published_for_players
  on public.entries
  for select
  using (status = 'published');

create policy entries_write_master
  on public.entries
  for insert
  with check (public.is_master());

create policy entries_update_master
  on public.entries
  for update
  using (public.is_master())
  with check (public.is_master());

create policy entries_delete_master
  on public.entries
  for delete
  using (public.is_master());

-- Valores concretos de campo para cada entrada (jsonb: es lore/metadatos de
-- contenido flexibles, no datos estructurales de personaje — ver
-- supabase-schema-rls.instructions.md).
create table public.entry_field_values (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  field_template_id uuid not null references public.entry_field_templates (id),
  value jsonb,
  unique (entry_id, field_template_id)
);

alter table public.entry_field_values enable row level security;

-- Hereda la visibilidad de la entry a la que pertenece.
create policy entry_field_values_select_master
  on public.entry_field_values
  for select
  using (public.is_master());

create policy entry_field_values_select_published_for_players
  on public.entry_field_values
  for select
  using (
    exists (
      select 1 from public.entries e
      where e.id = entry_field_values.entry_id and e.status = 'published'
    )
  );

create policy entry_field_values_write_master
  on public.entry_field_values
  for all
  using (public.is_master())
  with check (public.is_master());

-- Actualiza updated_at automáticamente en cada cambio de entries.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_entries_set_updated_at
  before update on public.entries
  for each row
  execute function public.set_updated_at();

-- Seed de los tipos de entrada del dominio (sin lore, solo catálogo).
insert into public.entry_types (code, label) values
  ('raza', 'Raza'),
  ('lugar', 'Lugar'),
  ('npc', 'NPC'),
  ('faccion', 'Facción'),
  ('objeto', 'Objeto'),
  ('criatura', 'Criatura'),
  ('fauna_flora', 'Fauna y flora'),
  ('idioma', 'Idioma'),
  ('tecnologia', 'Tecnología'),
  ('rumor', 'Rumor'),
  ('evento', 'Evento'),
  ('mision', 'Misión'),
  ('regla', 'Regla'),
  ('verbo_magico', 'Verbo mágico'),
  ('ritual_acceso', 'Ritual de acceso');
