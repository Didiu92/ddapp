---
applyTo: "supabase/**"
---

# Modelado de base de datos y RLS en Supabase

Instrucciones específicas para trabajar dentro de `supabase/` (migraciones,
seed, funciones). Complementan `.github/copilot-instructions.md`, no lo
repiten.

## Antes de crear una tabla nueva
1. Decide si el dato es **narrativo/lore** (va en el motor genérico
   `entries`/`entry_fragments`, ver más abajo) o **estructural de personaje**
   (va en tablas relacionales propias, nunca `jsonb` libre).
2. Decide qué es sensible: ¿necesita registrar quién/cuándo (auditoría)? ¿tiene
   una versión oculta que solo la máster debe ver hasta cierto momento?
3. Escribe la migración con su RLS en el mismo commit/migración. Nunca dejar
   una tabla sin `ENABLE ROW LEVEL SECURITY` y sin políticas, ni siquiera
   temporalmente.
4. Antes de dar la tabla por cerrada, pasa por
   `.github/prompts/review-rls.prompt.md`.

## Regla de oro: `entries` nunca lleva texto identificativo
`entries` solo guarda metadatos estructurales: `entry_type_id`, `code` (slug
interno para la máster, no necesariamente un spoiler pero tampoco pensado para
mostrarse tal cual), `status` (`draft`/`published`), `show_as_unknown_placeholder`.
El nombre, resumen o cualquier contenido narrativo vive en `entry_fragments`
(el fragmento de menor `unlock_level`, convención `field_key = 'nombre'` para
el que hace de título). Motivo: si el nombre estuviera en una columna de
`entries`, cualquier política RLS a nivel de fila de `entries` lo dejaría ver
igualmente, aunque el fragmento con ese nombre siga bloqueado por nivel. Este
mismo patrón —cualquier dato que revele identidad debe filtrarse a nivel de
fragmento/fila hija, nunca en la tabla contenedora— se repite en mapa
(`map_markers` enlazados a una `entry`), facciones y cualquier tabla futura
que envuelva una `entry`.

## Motor genérico del códice (`entries`)
- `entry_types(code, label)` — tipos configurables por datos.
- `entry_field_templates(entry_type_id, field_key, field_type, config jsonb,
  sort_order)` — plantillas de campo por tipo. `field_type` con `CHECK` sobre
  un conjunto cerrado (`text`, `richtext`, `number`, `boolean`, `date`,
  `reference`, `enum_list`...).
- `entries(entry_type_id, code, status, show_as_unknown_placeholder)`.
- `entry_field_values(entry_id, field_template_id, value jsonb)` — valores
  concretos. Aquí sí es correcto usar `jsonb`: es contenido de lore flexible,
  no datos estructurales de personaje.
- `entry_fragments(entry_id, sort_order, unlock_level, status, content_known,
  content_real)` — unidad real de desbloqueo y de doble versión.
- `entry_fragment_race_overrides(fragment_id, race_id, content_known_override)`
  — versión conocida alternativa según la raza de quien consulta.
- `player_unlocks(player_id NULL=global, entry_id, unlock_level, unlocked_by,
  unlocked_at)`.
- `player_reveals(player_id NULL=global, entry_fragment_id, revealed_by,
  revealed_at)`.

## RLS estándar para `entry_fragments`
Un jugador ve un fragmento si:
1. `entries.status = 'published'` y `entry_fragments.status = 'published'`, Y
2. existe un `player_unlocks` con `unlock_level` alcanzado para
   `(player_id = auth.uid() OR player_id IS NULL)` sobre esa `entry_id`.

`content_real` solo se expone si además existe un `player_reveals`
correspondiente; si no, sirve `content_known` (con el override racial si
aplica). El "???" se resuelve en la aplicación combinando: existe la `entry`
(`show_as_unknown_placeholder = true`) pero no hay ningún `player_unlocks` para
ella — en ese caso no se sirve ningún fragmento, solo `entry_types.label`
genérico.

## Contenido sellado: nunca `SELECT` directo del contenido real
Las tablas de contenido sellado deben separar lo listable (estado, tipo) de lo
protegido (contenido real). La forma recomendada: la tabla base tiene RLS que
nunca permite `SELECT` de la columna de contenido real a jugadores (o se sirve
a través de una vista sin esa columna); el contenido real solo se obtiene
mediante una función `SECURITY DEFINER` que:
1. comprueba permisos del rol actual,
2. comprueba `status = 'disponible'`,
3. actualiza a `'abierto'` y registra `opened_by`/`opened_at`,
4. devuelve el contenido,
todo en una única función (transaccional por naturaleza en Postgres).

## Búsqueda global
Usa la extensión `unaccent` sobre `entry_fragments.content_known` (nunca sobre
`entries`, ahí no hay texto). Implementa la búsqueda como función
`SECURITY INVOKER` (no `DEFINER`): así hereda automáticamente la RLS del
usuario que llama y nunca puede filtrar contenido bloqueado.

## Convenciones
- `snake_case`, plural para tablas.
- Estados/enums: `text` + `CHECK`, no `ENUM` nativo.
- Migración: `YYYYMMDDHHMMSS_v001__nombre.sql` (ver
  `.github/prompts/new-migration.prompt.md`).
- Toda tabla sensible que no tenga ya su propio rastro (`unlocked_by`,
  `revealed_by`, `opened_by`...) debe registrar en `audit_log` en vez de
  quedar sin auditoría.
