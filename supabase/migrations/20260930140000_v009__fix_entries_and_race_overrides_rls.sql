-- Corrige dos fallos de RLS detectados en revisión de la Fase 2:
-- 1) entries_select_published_for_players no comprobaba player_unlocks,
--    así que un jugador veía TODAS las entries publicadas (con su code),
--    tuviera o no desbloqueo, estuviera o no marcada como placeholder.
-- 2) entry_fragment_race_overrides_select_via_fragment solo comprobaba que
--    el fragmento fuera visible, no que el override fuera de la raza propia
--    del personaje activo de quien consulta: exponía lo que creen TODAS
--    las razas, no solo la suya, a quien consultara la tabla directamente.

-- 1) entries: fila visible solo si hay unlock (propio o global) o si está
-- marcada como placeholder. Mismo patrón "no aparece si no toca" que ya
-- usa entry_fragments.
drop policy entries_select_published_for_players on public.entries;

create policy entries_select_visible_for_players
  on public.entries
  for select
  using (
    status = 'published'
    and (
      exists (
        select 1 from public.player_unlocks pu
        where pu.entry_id = entries.id
          and (pu.player_id = auth.uid() or pu.player_id is null)
      )
      or show_as_unknown_placeholder = true
    )
  );

-- code nunca se lee de la tabla base (mismo patrón que content_real): una
-- entry placeholder sin unlock no debe filtrar su código interno real.
revoke select (code) on public.entries from authenticated, anon;

-- Vista segura: único punto de lectura de "code" resuelto. No es
-- security_invoker a propósito, igual que entry_fragments_resolved, para
-- poder leer code internamente pese al REVOKE y decidir aquí si mostrarlo.
create view public.entries_visible as
select
  e.id,
  e.entry_type_id,
  e.status,
  e.show_as_unknown_placeholder,
  case
    when public.is_master() then e.code
    when exists (
      select 1 from public.player_unlocks pu
      where pu.entry_id = e.id
        and (pu.player_id = auth.uid() or pu.player_id is null)
    ) then e.code
    else null
  end as code,
  e.created_by,
  e.created_at,
  e.updated_at
from public.entries e
where
  public.is_master()
  or (
    e.status = 'published'
    and (
      exists (
        select 1 from public.player_unlocks pu
        where pu.entry_id = e.id
          and (pu.player_id = auth.uid() or pu.player_id is null)
      )
      or e.show_as_unknown_placeholder = true
    )
  );

grant select on public.entries_visible to authenticated;

-- 2) entry_fragment_race_overrides: solo la raza del personaje activo de
-- quien consulta, no todas las razas que tengan override en ese fragmento.
drop policy entry_fragment_race_overrides_select_via_fragment on public.entry_fragment_race_overrides;

create policy entry_fragment_race_overrides_select_own_race
  on public.entry_fragment_race_overrides
  for select
  using (
    exists (
      select 1 from public.characters c
      where c.player_id = auth.uid()
        and c.status = 'activo'
        and c.race_id = entry_fragment_race_overrides.race_id
    )
  );
