-- Razas: dos capas. Capa 1 "ficha de creación" = columnas fijas de esta
-- tabla (solo 4 razas, campos conocidos de antemano, visible desde el
-- principio sin desbloqueo). Capa 2 "conocimiento del mundo" = la entry
-- enlazada vía entry_id, con sus propios fragments y desbloqueo normal
-- (HU 2.2). El resumen/pregunta ancestral de la ficha de creación NO son
-- spoiler: se muestran a todos los jugadores desde el primer momento.
create table public.races (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  summary text not null,
  ancestral_question text not null,
  entry_id uuid references public.entries (id),
  created_at timestamptz not null default now()
);

alter table public.races enable row level security;

create policy races_select_authenticated
  on public.races
  for select
  using (auth.role() = 'authenticated');

create policy races_write_master
  on public.races
  for all
  using (public.is_master())
  with check (public.is_master());

-- Bonos/penalizaciones de atributo por raza (punto 5). attribute_code
-- coincide con las columnas fijas que tendrá characters (HU 3.1): fuerza,
-- destreza, velocidad, perspicacia, conocimientos, conversacion.
create table public.race_attribute_modifiers (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  attribute_code text not null check (
    attribute_code in ('fuerza', 'destreza', 'velocidad', 'perspicacia', 'conocimientos', 'conversacion')
  ),
  modifier int not null,
  unique (race_id, attribute_code)
);

alter table public.race_attribute_modifiers enable row level security;

create policy race_attribute_modifiers_select_authenticated
  on public.race_attribute_modifiers
  for select
  using (auth.role() = 'authenticated');

create policy race_attribute_modifiers_write_master
  on public.race_attribute_modifiers
  for all
  using (public.is_master())
  with check (public.is_master());
