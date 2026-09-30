# Instrucciones del proyecto — ddapp (PWA campaña de rol)

## Qué es esto
PWA para gestionar una campaña de rol de alta fantasía. La máster (1) tiene control
total; 4 jugadores gestionan personajes propios. Backend = Supabase (Postgres,
Auth, Storage, RLS). Sin NestJS, sin Prisma, sin backend propio: toda regla de
negocio sensible vive en Postgres (funciones, RLS), no en Angular.

Perfil del desarrollador: backend Spring Boot/Flyway/Postgres, frontend Angular,
GitLab CI/CD, OpenShift. Cuando expliques algo de Supabase, compáralo con esos
conceptos (RLS ≈ no tiene equivalente directo en Spring Security a nivel de fila,
migraciones ≈ Flyway pero con nombre de fichero distinto, Postgres functions
`SECURITY DEFINER` ≈ un método `@Transactional` con elevación de privilegios).

## Entorno local
- Supabase CLI vía `npx supabase`, corriendo sobre Podman rootless en WSL2 (no
  Docker Desktop). `DOCKER_HOST` apunta al socket de Podman.
- Si `supabase start` falla con contenedores "unhealthy" pero sus logs muestran
  que arrancaron bien, sospecha primero de proxy corporativo filtrándose en los
  healthchecks (`~/.config/containers/containers.conf` con `http_proxy = false`
  ya aplicado), no de timing de Podman.
- `analytics` y `edge_runtime` están desactivados en `supabase/config.toml` por
  incompatibilidades conocidas de esa versión del CLI con Podman. No los actives
  sin comprobar antes si siguen fallando.

## Resumen de dominio (no reinventar reglas, solo implementar)
- **Roles**: `master` (control total) y `player` (4 jugadores fijos, alta manual,
  sin signup público). Un jugador puede tener varios personajes pero como máximo
  uno con estado `activo` a la vez (constraint en BD).
- **Códice genérico**: tabla `entries` = cualquier elemento de lore (raza, lugar,
  NPC, facción, objeto, criatura, idioma, evento, misión, regla, magia...). Tipos
  y plantillas de campo configurables por datos (`entry_types`,
  `entry_field_templates`), nunca hay que tocar código para añadir un tipo o
  campo nuevo.
- **`entries` nunca contiene texto identificativo o de lore.** Solo metadatos
  estructurales (`entry_type_id`, `code` interno para la máster, `status`,
  `show_as_unknown_placeholder`). El nombre, descripción y cualquier contenido
  narrativo vive SIEMPRE en `entry_fragments`, sujeto a RLS por fragmento. Esto
  es intencional: si el nombre estuviera en `entries`, se filtraría por RLS de
  tabla aunque el fragmento con el nombre siga bloqueado. Ver
  `.github/instructions/supabase-schema-rls.instructions.md`.
- **Desbloqueo por fragmentos**: cada fragmento tiene su propio nivel mínimo
  (`descubierto` | `explorado`) y su propio par de contenido conocido/real.
  Desbloqueo en `player_unlocks` (por jugador o global si `player_id IS NULL`).
  Una entrada sin ningún unlock se muestra como "???" solo si
  `show_as_unknown_placeholder = true`; si no, no aparece en absoluto.
- **Doble versión + draft**: cada fragmento tiene `content_known` (pública por
  defecto, puede tener override por raza del observador) y `content_real`
  (solo máster hasta que exista un `player_reveal`). `status` (`draft` /
  `published`) existe tanto en `entries` (oculta toda la entrada) como en cada
  `entry_fragments` (oculta solo ese fragmento dentro de una entrada ya
  publicada).
- **Razas**: exactamente 4, dos capas. Capa 1 "ficha de creación" (tabla
  `races`, columnas fijas, visible siempre sin desbloqueo). Capa 2 "conocimiento
  del mundo" = una `entry` normal enlazada vía `races.entry_id`, con fragments y
  desbloqueo como cualquier otra entrada. Cada jugador empieza con su raza en
  nivel `explorado` (unlock automático al crear personaje).
- **Magia**: 6 verbos (2 razas c/u) y 4 rituales (1 por raza) son `entries` de
  tipo `verbo_magico`/`ritual_acceso`. Sin cálculo de costes ni efectos: solo
  documentación.
- **Personajes**: atributos fijos (Fuerza, Destreza, Velocidad, Perspicacia,
  Conocimientos, Conversación) como columnas en `characters`. Rasgos raciales
  variables y recursos van en tablas relacionales propias definidas por raza
  (`race_trait_slots`, `race_resource_definitions`...) — **nunca JSON libre**
  para esto, a diferencia del códice genérico que sí usa `jsonb` para valores
  de campo.
- **Pregunta Ancestral**: 1 uso por sesión y personaje. Se modela como fila en
  `ancestral_question_uses` con `UNIQUE(character_id, session_id)`; comprobar
  disponibilidad es un `NOT EXISTS`, nunca un contador que resetear.
- **Secreto personal**: exactamente 1 por personaje (`UNIQUE(character_id)`),
  editable por su jugador, visible para la máster, invisible para el resto.
  Pistas (`secret_clues`) las crea solo la máster, con `released` que ella
  activa manualmente; nunca se liberan automáticamente al desbloquear el
  elemento asociado.
- **Contenido sellado** (cartas/esquirlas, `kind` como subtipo): estados
  `pendiente` → `disponible` (activado por la máster) → `abierto`. El contenido
  real nunca se expone por `SELECT` directo (RLS lo bloquea siempre); solo una
  función Postgres `SECURITY DEFINER` puede comprobar permisos + estado
  `disponible`, registrar la apertura y devolver el contenido, todo en una
  transacción.
- **Mapa**: dos capas con las mismas coordenadas (`mundo_real` visible a
  jugadores, `mundo_espejo` con flag `visible_to_players` que activa la
  máster). Si un marcador enlaza a una `entry`, su visibilidad seguirá el
  desbloqueo de esa entry (sin flag duplicado en el marcador). Marcadores sin
  entry enlazada (glitch, posición de grupo) llevan su propio control manual.
  Glitches son manuales, sin vínculo automático al desgaste del sello.
- **Desgaste del sello**: registro de tiradas por verbo/sesión, visible
  únicamente para la máster. Nunca expuesto a jugadores por RLS.
- **Calendario Imperial Xuoim**: año+día, o fecha desconocida con orden
  relativo opcional. Se modela como datos de fecha ligados 1:1 a una `entry`
  de tipo `evento` (reutiliza el motor de fragmentos/versiones ya existente).
- **Facciones**: jerarquía configurable (`parent_faction_id` autorreferencia +
  `level_label` libre por nodo, sin fijar número de niveles).
- **Diario de campaña**: entradas por sesión con comentarios de jugadores;
  moderación y edición reservadas a la máster.
- **Relaciones entre entradas**: tabla genérica `entry_relations`
  (`source_entry_id`, `relation_type`, `target_entry_id`) para navegar el
  códice como una wiki.
- **Búsqueda global**: usa la extensión `unaccent` de Postgres sobre
  `entry_fragments` (nunca sobre `entries`, ahí no vive el texto). Impleméntala
  como función `SECURITY INVOKER` (no `DEFINER`) para que la RLS del llamante
  se aplique automáticamente y la búsqueda nunca filtre contenido bloqueado.
- **Seguridad**: toda restricción de visibilidad vive en RLS en Postgres, nunca
  solo en Angular — el frontend pinta lo que la consulta devuelve, no decide
  qué ocultar. Auditoría dedicada solo para lo sensible: desbloqueos,
  revelaciones, aperturas de contenido sellado, cambios de secretos (la mayoría
  ya trae su propio rastro por diseño — `unlocked_by`, `revealed_by`,
  `opened_by` — usa `audit_log` genérico solo donde no exista ya un historial
  propio).
- **Imágenes**: bucket privado en Storage, URLs firmadas (nunca bucket
  público). Puede haber una imagen distinta por nivel de desbloqueo.

## Convenciones
- **Nombres de tablas**: `snake_case`, plural (`entries`, `entry_fragments`,
  `characters`...). Columnas de tipo/estado: `text` + `CHECK constraint`, nunca
  `ENUM` nativo de Postgres (más fácil de evolucionar sin `ALTER TYPE`).
- **Migraciones**: `YYYYMMDDHHMMSS_v001__nombre_descriptivo.sql`. El timestamp
  es el que manda para el orden real (lo exige `supabase migration
  new`/`db push`); el `v001` es solo decorativo para lectura humana tipo
  Flyway — si alguna vez se desincroniza, no le des más peso que al timestamp.
  Usa `.github/prompts/new-migration.prompt.md` para generarlas.
- **RLS**: ninguna tabla se da por cerrada sin pasar por
  `.github/prompts/review-rls.prompt.md`. Ver también
  `.github/instructions/supabase-schema-rls.instructions.md`.
- **Angular**: standalone components (sin `NgModule`), `signals` para estado
  local, `inject()` en vez de constructor DI, control flow nativo (`@if`,
  `@for`, `@switch`). Ver `.github/instructions/angular-frontend.instructions.md`.
- **Backlog**: el trabajo está organizado por fases en `BACKLOG.md`, con
  historias de usuario y checklists de tareas marcables. Sigue el orden de
  fases salvo que el usuario indique lo contrario explícitamente.
