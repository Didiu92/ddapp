-- Creación de personaje (mínima; atributos/rasgos/recursos llegan en Fase 3).
-- Se adelanta a esta migración porque HU 2.2 (fragmentos) necesita esta
-- tabla para resolver la raza del personaje activo del jugador en la vista
-- de fragmentos resueltos; el trigger de auto-unlock de raza se añade en
-- la migración siguiente, una vez existe player_unlocks.
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id),
  race_id uuid not null references public.races (id),
  name text not null,
  profession text,
  age int,
  status text not null default 'activo' check (status in ('activo', 'retirado', 'muerto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Como máximo un personaje activo por jugador.
create unique index characters_one_active_per_player
  on public.characters (player_id)
  where (status = 'activo');

alter table public.characters enable row level security;

create trigger trg_characters_set_updated_at
  before update on public.characters
  for each row
  execute function public.set_updated_at();

-- Datos no sensibles (nombre, raza, profesión, edad, estado): visibles para
-- cualquier autenticado. Lo sensible (secreto personal) llega en Fase 3 en
-- una tabla aparte con su propia RLS restrictiva.
create policy characters_select_authenticated
  on public.characters
  for select
  using (auth.role() = 'authenticated');

create policy characters_insert_own_or_master
  on public.characters
  for insert
  with check (player_id = auth.uid() or public.is_master());

create policy characters_update_own_or_master
  on public.characters
  for update
  using (player_id = auth.uid() or public.is_master())
  with check (player_id = auth.uid() or public.is_master());

create policy characters_delete_master
  on public.characters
  for delete
  using (public.is_master());
