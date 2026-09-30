-- Fragmentos, desbloqueo por nivel y doble versión (conocida/real). Tabla
-- más sensible del proyecto: aquí vive todo el nombre/descripción/lore que
-- en entries.NUNCA aparece (ver regla de oro en
-- supabase-schema-rls.instructions.md).
create table public.entry_fragments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  sort_order int not null default 0,
  unlock_level text not null check (unlock_level in ('descubierto', 'explorado')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  field_key text not null,
  content_known text not null,
  content_real text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entry_fragments enable row level security;

create trigger trg_entry_fragments_set_updated_at
  before update on public.entry_fragments
  for each row
  execute function public.set_updated_at();

-- Ranking numérico de nivel de desbloqueo, para comparar "al menos este
-- nivel" sin depender de que el orden alfabético coincida con el narrativo.
create or replace function public.unlock_level_rank(level text)
returns int
language sql
immutable
as $$
  select case level
    when 'descubierto' then 1
    when 'explorado' then 2
    else 0
  end;
$$;

-- Desbloqueo por jugador (o global si player_id IS NULL). Se crea antes que
-- las políticas de entry_fragments porque estas la referencian.
create table public.player_unlocks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references auth.users (id),
  entry_id uuid not null references public.entries (id) on delete cascade,
  unlock_level text not null check (unlock_level in ('descubierto', 'explorado')),
  unlocked_by uuid references auth.users (id),
  unlocked_at timestamptz not null default now()
);

alter table public.player_unlocks enable row level security;

create policy player_unlocks_select_own_or_global_or_master
  on public.player_unlocks
  for select
  using (player_id = auth.uid() or player_id is null or public.is_master());

create policy player_unlocks_write_master
  on public.player_unlocks
  for all
  using (public.is_master())
  with check (public.is_master());

-- Revelación de la versión real de un fragmento concreto (por jugador o
-- global). Independiente del nivel de desbloqueo: se puede desbloquear sin
-- revelar, pero no al revés. Se crea antes que las políticas de
-- entry_fragments porque la vista de más abajo la referencia.
create table public.player_reveals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references auth.users (id),
  entry_fragment_id uuid not null references public.entry_fragments (id) on delete cascade,
  revealed_by uuid references auth.users (id),
  revealed_at timestamptz not null default now()
);

alter table public.player_reveals enable row level security;

create policy player_reveals_select_own_or_global_or_master
  on public.player_reveals
  for select
  using (player_id = auth.uid() or player_id is null or public.is_master());

create policy player_reveals_write_master
  on public.player_reveals
  for all
  using (public.is_master())
  with check (public.is_master());

-- Fila de fragmento visible (ROW-level) si está publicado, su entry está
-- publicada, y hay un unlock (propio o global) con nivel suficiente. OJO:
-- esto NO expone content_real (ver el REVOKE de columna más abajo); esta
-- política solo controla qué FILAS existen para el jugador.
create policy entry_fragments_select_master
  on public.entry_fragments
  for select
  using (public.is_master());

create policy entry_fragments_select_unlocked_for_players
  on public.entry_fragments
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.entries e
      where e.id = entry_fragments.entry_id and e.status = 'published'
    )
    and exists (
      select 1 from public.player_unlocks pu
      where pu.entry_id = entry_fragments.entry_id
        and (pu.player_id = auth.uid() or pu.player_id is null)
        and public.unlock_level_rank(pu.unlock_level) >= public.unlock_level_rank(entry_fragments.unlock_level)
    )
  );

create policy entry_fragments_write_master
  on public.entry_fragments
  for insert
  with check (public.is_master());

create policy entry_fragments_update_master
  on public.entry_fragments
  for update
  using (public.is_master())
  with check (public.is_master());

create policy entry_fragments_delete_master
  on public.entry_fragments
  for delete
  using (public.is_master());

-- content_real nunca se lee de la tabla base, ni siquiera por la máster:
-- todo el mundo pasa por la vista de abajo, que decide caso a caso.
revoke select (content_real) on public.entry_fragments from authenticated, anon;

-- Override racial de la versión conocida (punto 4): NO tiene versión real
-- propia, solo sustituye content_known según la raza del personaje activo
-- de quien consulta.
create table public.entry_fragment_race_overrides (
  id uuid primary key default gen_random_uuid(),
  fragment_id uuid not null references public.entry_fragments (id) on delete cascade,
  race_id uuid not null references public.races (id) on delete cascade,
  content_known_override text not null,
  unique (fragment_id, race_id)
);

alter table public.entry_fragment_race_overrides enable row level security;

-- Hereda la visibilidad del fragmento al que pertenece.
create policy entry_fragment_race_overrides_select_master
  on public.entry_fragment_race_overrides
  for select
  using (public.is_master());

create policy entry_fragment_race_overrides_select_via_fragment
  on public.entry_fragment_race_overrides
  for select
  using (
    exists (
      select 1 from public.entry_fragments ef
      where ef.id = entry_fragment_race_overrides.fragment_id
    )
  );

create policy entry_fragment_race_overrides_write_master
  on public.entry_fragment_race_overrides
  for all
  using (public.is_master())
  with check (public.is_master());

-- Vista segura: único punto de lectura de content_known/content_real
-- resueltos. Se ejecuta con los privilegios de quien la crea (no
-- security_invoker), precisamente para poder leer content_real internamente
-- pese al REVOKE de arriba, y decidir aquí mismo si mostrarlo. La lista de
-- filas que devuelve para un jugador sigue estando acotada por las mismas
-- condiciones que la política de fila de la tabla base (repetidas aquí a
-- propósito, no heredadas, porque esta vista no es security_invoker).
create view public.entry_fragments_resolved as
select
  ef.id,
  ef.entry_id,
  ef.sort_order,
  ef.unlock_level,
  ef.status,
  ef.field_key,
  coalesce(
    (
      select efro.content_known_override
      from public.entry_fragment_race_overrides efro
      join public.characters c
        on c.player_id = auth.uid()
        and c.status = 'activo'
        and c.race_id = efro.race_id
      where efro.fragment_id = ef.id
      limit 1
    ),
    ef.content_known
  ) as content_known,
  case
    when public.is_master() then ef.content_real
    when exists (
      select 1 from public.player_reveals pr
      where pr.entry_fragment_id = ef.id
        and (pr.player_id = auth.uid() or pr.player_id is null)
    ) then ef.content_real
    else null
  end as content_real
from public.entry_fragments ef
where
  public.is_master()
  or (
    ef.status = 'published'
    and exists (
      select 1 from public.entries e
      where e.id = ef.entry_id and e.status = 'published'
    )
    and exists (
      select 1 from public.player_unlocks pu
      where pu.entry_id = ef.entry_id
        and (pu.player_id = auth.uid() or pu.player_id is null)
        and public.unlock_level_rank(pu.unlock_level) >= public.unlock_level_rank(ef.unlock_level)
    )
  );

grant select on public.entry_fragments_resolved to authenticated;

-- Auto-unlock de la raza propia al crear personaje (punto 5): nivel
-- EXPLORADO sobre la entry de "conocimiento del mundo" de su raza, si
-- existe (races.entry_id puede ser NULL si aún no se ha creado esa entry).
create or replace function public.characters_auto_unlock_race()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  select entry_id into v_entry_id from public.races where id = new.race_id;

  if v_entry_id is not null then
    insert into public.player_unlocks (player_id, entry_id, unlock_level, unlocked_by)
    values (new.player_id, v_entry_id, 'explorado', new.player_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_characters_auto_unlock_race
  after insert on public.characters
  for each row
  execute function public.characters_auto_unlock_race();
