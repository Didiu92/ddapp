# BACKLOG — ddapp

Backlog por fases. Cada historia de usuario (HU) tiene una checklist de tareas
marcable. Sigue el orden salvo indicación explícita en contra. Antes de dar
por cerrada cualquier tabla nueva, pasa por
`.github/prompts/review-rls.prompt.md`.

Convenciones generales: ver `.github/copilot-instructions.md` y las
instrucciones específicas en `.github/instructions/`.

---

## FASE 0 — Fundación técnica

### HU 0.1 — Repositorio limpio y bajo control de versiones
- [x] Eliminar ficheros temporales de diagnóstico de entorno (`_tmp_watch.sh`,
      `_tmp_watch_health.sh`, `_tmp_health_poll.log`).
- [x] Eliminar carpeta `backend/` (vacía, no usada — Supabase es el backend;
      si algún día hace falta lógica de servidor, va en `supabase/functions/`).
- [x] `git init` + primer commit + `.gitignore` (node_modules, dist,
      `supabase/.branches`, `supabase/.temp`, `.angular/cache`).
- [x] Repositorio remoto ([Didiu92/ddapp](https://github.com/Didiu92/ddapp)
      en GitHub) y push inicial.

### HU 0.2 — Convención de migraciones y estructura Supabase
- [x] Documentar (ya hecho en `copilot-instructions.md` y
      `new-migration.prompt.md`) la convención
      `YYYYMMDDHHMMSS_v001__nombre.sql`.
- [x] Migración inicial: habilitar extensiones `pgcrypto` y `unaccent`
      (`20260930103416_v001__enable_extensions.sql`, verificado con
      `pg_extension` tras `db reset`).
- [x] Crear `supabase/seed.sql` vacío (con comentario de cabecera explicando
      su propósito) para no arrancar sin el fichero que espera `db reset`.
- [x] Confirmar que `supabase start` sigue arrancando limpio tras estos
      cambios.

### HU 0.3 — Scaffold Angular standalone PWA
- [x] `ng new frontend --routing --style=scss` (Angular 22 genera standalone
      por defecto; sin flag `--standalone` explícito, ya no existe).
- [x] Añadir soporte PWA (`ng add @angular/pwa`): manifest + service worker.
- [x] Instalar `@supabase/supabase-js`.
- [x] Crear `environment.ts` / `environment.development.ts` con URL y anon key
      de Supabase local (sin `service_role key` en el frontend, nunca).
- [x] Estructura de carpetas: `core/` (servicios transversales, cliente
      Supabase, `AuthService`), `features/` (una carpeta por dominio),
      `shared/` (componentes reutilizables).
- [x] Confirmar `ng serve` arrancando contra el Supabase local.

### HU 0.4 — Convenciones documentadas
- [x] Nombres de tablas `snake_case` plural; estados como `text` + `CHECK`
      (no `ENUM` nativo) — documentado en `copilot-instructions.md`.
- [x] Angular standalone/signals/`inject()`/control flow nativo — documentado
      en `angular-frontend.instructions.md`.
- [x] README raíz mínimo: cómo levantar el entorno completo (Supabase local +
      `ng serve`) para no depender solo de la memoria del usuario.

---

## FASE 1 — Autenticación y roles

### HU 1.1 — Modelo de usuarios y roles
- [ ] Migración: tabla `profiles` (`id uuid PK references auth.users`,
      `display_name text`, `role text CHECK (role IN ('master','player'))`,
      `created_at timestamptz default now()`).
- [x] RLS `profiles`: cualquier usuario autenticado puede leer todos los
      `profiles` (necesario para mostrar nombres de otros jugadores en diario,
      diario de sesión, etc.); solo el propio usuario o la máster puede
      actualizar su fila (trigger bloquea auto-escalado de `role`).
- [x] Desactivar signup público en la configuración de Auth (local y, más
      adelante, producción).
- [x] Crear manualmente las 5 cuentas (1 máster + 4 jugadores) vía Supabase
      Studio local, y su fila correspondiente en `profiles` con el `role`
      correcto. Creadas vía Auth Admin API local: `master@ddapp.local`,
      `jugador1..4@ddapp.local`, contraseña `ddapp-local-dev` (solo entorno
      local; en producción se recrean con credenciales reales).

### HU 1.2 — Guard de roles en Angular
- [x] `AuthService` en `core/` con `signal` de sesión actual y `signal`
      computado de rol (`master`/`player`/`null`).
- [x] Guards funcionales `canActivateFn`: `masterGuard`, `authenticatedGuard`.
- [x] Pantalla de login (email+password, Supabase Auth) y logout.
- [ ] Redirección post-login según rol (jugador → su panel, máster → panel de
      administración) — pendiente hasta que existan paneles reales distintos
      en fases posteriores; por ahora hay una única página placeholder tras
      login que muestra nombre y rol.

### HU 1.3 — RLS base y auditoría transversal
- [x] Función `is_master() RETURNS boolean` (`SECURITY DEFINER` o `STABLE`
      consultando `profiles`), reutilizable en el resto de políticas del
      proyecto.
- [x] Migración: tabla `audit_log` (`id`, `actor_id`, `action text`,
      `entity text`, `entity_id uuid`, `payload jsonb`,
      `created_at timestamptz default now()`). RLS: solo la máster puede
      leerla; inserciones vía funciones/triggers, no directamente desde el
      cliente.
- [x] Pasar `profiles` y `audit_log` por `review-rls.prompt.md`.

### HU 1.4 — Sesiones de juego
- [x] Migración: tabla `sessions` (`id`, `number int unique`,
      `session_date date`, `title text`, `created_by`, `created_at`).
- [x] RLS: `SELECT` para cualquier autenticado; `INSERT`/`UPDATE`/`DELETE`
      solo máster.
- [ ] UI mínima de máster: listar/crear sesiones (número autoincremental
      sugerido, editable).

---

## FASE 2 — Núcleo del códice + Razas + Creación de personaje

### HU 2.1 — Motor genérico de tipos de entrada
- [x] Migración: `entry_types` (`id`, `code text unique`, `label text`).
- [x] Migración: `entry_field_templates` (`id`, `entry_type_id FK`,
      `field_key text`, `label text`, `field_type text CHECK` en conjunto
      cerrado (`text`,`richtext`,`number`,`boolean`,`date`,`reference`,
      `enum_list`), `config jsonb`, `sort_order int`).
- [x] Migración: `entries` (`id`, `entry_type_id FK`, `code text` — slug
      interno para la máster, `status text CHECK ('draft','published')`,
      `show_as_unknown_placeholder boolean default false`, timestamps).
      **Sin columna de nombre/descripción** (ver regla de oro en
      `supabase-schema-rls.instructions.md`).
- [x] Migración: `entry_field_values` (`entry_id FK`, `field_template_id FK`,
      `value jsonb`).
- [x] RLS `entries`: la máster ve todo; el jugador ve filas con
      `status='published'` (el resto de la lógica de "???" se resuelve
      combinando esto con `entry_fragments`, no aquí).
- [x] Seed de `entry_types` inicial con los tipos del dominio (raza, lugar,
      npc, facción, objeto, criatura, fauna_flora, idioma, tecnologia, rumor,
      evento, mision, regla, verbo_magico, ritual_acceso...).

### HU 2.2 — Fragmentos, desbloqueo y doble versión ⚠️ tabla más sensible del proyecto
- [ ] Migración: `entry_fragments` (`id`, `entry_id FK`, `sort_order int`,
      `unlock_level text CHECK ('descubierto','explorado')`,
      `status text CHECK ('draft','published')`, `field_key text` (p. ej.
      `'nombre'`, `'descripcion'`...), `content_known text`,
      `content_real text NULL`).
- [ ] Migración: `entry_fragment_race_overrides` (`fragment_id FK`,
      `race_id FK`, `content_known_override text`, `UNIQUE(fragment_id,
      race_id)`).
- [ ] Migración: `player_unlocks` (`id`, `player_id FK NULL`, `entry_id FK`,
      `unlock_level text CHECK`, `unlocked_by FK`, `unlocked_at`).
      `player_id IS NULL` = desbloqueo global.
- [ ] Migración: `player_reveals` (`id`, `player_id FK NULL`,
      `entry_fragment_id FK`, `revealed_by FK`, `revealed_at`).
- [ ] RLS `entry_fragments`: `SELECT` visible si `status='published'` Y existe
      `player_unlocks` con nivel alcanzado para `(player_id = auth.uid() OR
      player_id IS NULL)` sobre `entry_fragments.entry_id`. La máster ve todo
      siempre (incluyendo `draft` y `content_real` sin revelar).
- [ ] Vista o función auxiliar para resolver `content_known` efectivo
      (aplicando override racial si existe uno para la raza del personaje
      activo del jugador) sin filtrar `content_real` salvo revelación.
- [ ] RLS `player_unlocks`/`player_reveals`: jugador ve solo las suyas (+ las
      globales); solo la máster inserta.
- [ ] **Checkpoint obligatorio**: pasar esta HU completa por
      `.github/prompts/review-rls.prompt.md`, con prueba manual explícita de
      "jugador sin ningún unlock" y "jugador con unlock pero sin reveal".
- [ ] UI de máster: editor de entries + fragments (crear/editar, marcar
      draft/published a ambos niveles) y panel de gestión de
      unlocks/reveals (por jugador o global).

### HU 2.3 — Razas: ficha de creación + conocimiento del mundo
- [ ] Migración: `races` (`id`, `code text unique`, `name text`,
      `summary text`, `ancestral_question text`, `entry_id FK NULL` → entry de
      tipo `raza` para el "conocimiento del mundo").
- [ ] Migración: `race_attribute_modifiers` (`race_id FK`,
      `attribute_code text CHECK` sobre los 6 atributos fijos,
      `modifier int`).
- [ ] RLS `races`: lectura pública para cualquier autenticado (la ficha de
      creación es visible desde el principio, sin desbloqueo); solo máster
      escribe.
- [ ] Seed de las 4 razas con su ficha de creación (resumen, pregunta
      ancestral, modificadores) — contenido real lo aporta el usuario, no
      inventar lore.
- [ ] Trigger o función: al insertar un `player_unlocks` derivado de "crear
      personaje", usar nivel `explorado` sobre `races.entry_id` (ver HU 2.4).

### HU 2.4 — Creación de personaje (mínima)
- [ ] Migración: `characters` (`id`, `player_id FK`, `race_id FK`,
      `name text`, `profession text`, `age int`,
      `status text CHECK ('activo','retirado','muerto')`, timestamps).
- [ ] Constraint: índice único parcial
      `UNIQUE(player_id) WHERE status = 'activo'` (máximo 1 personaje activo
      por jugador).
- [ ] RLS `characters`: jugador ve/edita los suyos; máster ve/edita todos;
      resto de jugadores solo ven datos no sensibles de personajes ajenos (a
      definir alcance exacto en la propia HU de UI, pero nunca el secreto —
      eso es Fase 3).
- [ ] Función o trigger: al crear un personaje, insertar automáticamente en
      `player_unlocks` su raza en nivel `explorado`.
- [ ] UI: formulario de creación de personaje (nombre, raza, profesión, edad),
      manejo amigable del error si ya tiene un personaje `activo` (proponer
      retirarlo primero).

### HU 2.5 — UI códice mínima
- [ ] Listado de entries por tipo (sin buscador global todavía — eso es
      Fase 10), consumiendo directamente lo que RLS ya filtra.
- [ ] Vista de detalle de entry: pinta los fragments visibles en orden,
      "???" genérico (usando solo `entry_types.label`) cuando no hay ningún
      fragment visible y `show_as_unknown_placeholder = true`.
- [ ] Panel de máster: gestión de `entry_types`/`entry_field_templates`
      (alta de tipos y campos sin tocar código) y de entries/fragments.

---

## FASE 3 — Personajes en profundidad

### HU 3.1 — Atributos
- [ ] Migración: columnas fijas en `characters` para los 6 atributos
      (`strength`, `dexterity`, `speed`, `insight`, `knowledge`,
      `conversation`, todos `int`). Son un conjunto cerrado y estable; no
      necesitan modelado data-driven.
- [ ] UI: ficha de personaje mostrando atributos + modificadores raciales de
      `race_attribute_modifiers`.

### HU 3.2 — Rasgos raciales variables
- [ ] Migración: `race_trait_slots` (`id`, `race_id FK`, `slot_code text`,
      `label text`, `input_type text CHECK ('choice','multi_choice','text')`).
- [ ] Migración: `race_trait_options` (`id`, `slot_id FK`, `option_code text`,
      `label text`) — para slots de tipo `choice`/`multi_choice`.
- [ ] Migración: `character_trait_values` (`character_id FK`, `slot_id FK`,
      `option_id FK NULL`, `free_text text NULL`).
- [ ] RLS: jugador ve/edita los suyos; máster ve/edita todos; resto de
      jugadores según se defina en UI (probablemente lectura de rasgos no
      secretos de personajes ajenos).
- [ ] UI: sección de ficha de personaje para elegir/editar sus rasgos según
      los slots definidos por su raza.

### HU 3.3 — Recursos flexibles por raza
- [ ] Migración: `race_resource_definitions` (`id`, `race_id FK`,
      `resource_code text`, `label text`, `unit text NULL`).
- [ ] Migración: `character_resources` (`character_id FK`,
      `resource_definition_id FK`, `quantity numeric`, `notes text NULL`).
- [ ] RLS: mismo patrón que rasgos.
- [ ] UI: sección de recursos en ficha de personaje (cantidad editable por el
      jugador o solo por la máster, según se decida al implementar — dejar
      configurable por recurso si hace falta).

### HU 3.4 — Inventario
- [ ] Migración: `character_inventory_items` (`id`, `character_id FK`,
      `entry_id FK NULL`, `custom_name text NULL`, `quantity int`,
      `item_status text`, `notes text`).
- [ ] RLS: jugador ve/edita el suyo; máster ve/edita todos.
- [ ] UI: lista de inventario con opción de enlazar a una entry existente del
      códice o usar nombre libre.

### HU 3.5 — Historial personal por sesión
- [ ] Migración: `character_session_logs` (`id`, `character_id FK`,
      `session_id FK`, `content text`, `created_by`, `created_at`).
- [ ] RLS: jugador ve/edita las de su personaje; máster ve/edita todas.
- [ ] UI: entrada de historial enlazada a la sesión correspondiente.

### HU 3.6 — Pregunta Ancestral
- [ ] Migración: `ancestral_question_uses` (`id`, `character_id FK`,
      `session_id FK`, `used_at`, `UNIQUE(character_id, session_id)`).
- [ ] RLS: jugador inserta/lee las de su personaje; máster lee/inserta todas.
- [ ] UI: botón "usar Pregunta Ancestral" en sesión activa, deshabilitado si
      ya existe uso para `(character_id, session_id)` (comprobación por
      `NOT EXISTS`, no contador).

### HU 3.7 — Secreto personal + pistas
- [ ] Migración: `character_secrets` (`character_id FK UNIQUE`,
      `content text`, `updated_at`).
- [ ] RLS `character_secrets`: el propio jugador ve/edita el suyo; máster ve
      todos; el resto de jugadores no ven ninguno.
- [ ] Migración: `secret_clues` (`id`, `character_secret_id FK`,
      `linked_entry_id FK NULL`, `linked_map_marker_id FK NULL`,
      `content text`, `released boolean default false`, `released_at`,
      `released_by`).
- [ ] RLS `secret_clues`: solo visibles a jugadores cuando `released = true`;
      la máster ve y crea todas. Solo la máster puede cambiar `released`.
- [ ] **Checkpoint**: pasar `character_secrets`/`secret_clues` por
      `review-rls.prompt.md` (dato muy sensible: fuga entre jugadores).
- [ ] UI: editor de secreto propio (jugador), panel de pistas de la máster
      (crear, enlazar a NPC/lugar/objeto/evento/marcador, liberar).

---

## FASE 4 — Magia (verbos y rituales)

### HU 4.1 — Modelo de verbos y rituales
- [ ] Seed: `entry_types` para `verbo_magico` y `ritual_acceso` (si no se
      creó ya en Fase 2).
- [ ] Migración: `race_magic_verbs` (`race_id FK`, `verb_entry_id FK`,
      `UNIQUE(race_id, verb_entry_id)`) — relación muchos a muchos, 2 razas
      por verbo.
- [ ] Migración: columna `ritual_entry_id FK NULL` en `races` (1 ritual por
      raza).
- [ ] Seed de los 6 verbos y 4 rituales como `entries` + `entry_fragments`
      (contenido real lo aporta el usuario).
- [ ] RLS: hereda la de `entries`/`entry_fragments` sin cambios adicionales.

### HU 4.2 — UI de consulta de magia
- [ ] Sección en ficha de raza listando sus verbos compartidos y su ritual.
- [ ] Vista de detalle de verbo/ritual reutilizando el componente de detalle
      de entry de Fase 2 (sin cálculos, solo documentación).

---

## FASE 5 — Contenido sellado (cartas/esquirlas)

### HU 5.1 — Modelo de datos
- [ ] Migración: `sealed_contents` (`id`, `kind text CHECK ('carta',
      'esquirla')`, `title text`, `status text CHECK ('pendiente',
      'disponible','abierto')`, `real_content text`, `linked_entry_id FK
      NULL`, `made_available_at`, `made_available_by`, `opened_by FK NULL`,
      `opened_at NULL`).
- [ ] RLS: jugadores solo pueden `SELECT` una vista/columnas sin
      `real_content` (o el acceso a `real_content` queda bloqueado por
      política incluso para `SELECT` directo); la máster ve todo.

### HU 5.2 — Función de apertura
- [ ] Función `open_sealed_content(id uuid) RETURNS text` `SECURITY DEFINER`:
      valida permisos + `status = 'disponible'`, actualiza a `'abierto'` +
      `opened_by`/`opened_at`, devuelve `real_content`.
- [ ] **Checkpoint obligatorio**: `review-rls.prompt.md`, con prueba manual de
      intentar `SELECT real_content` directo como jugador (debe fallar/venir
      vacío) y de llamar la función dos veces (la segunda debe fallar por
      estado ya `abierto`).

### HU 5.3 — UI de contenido sellado
- [ ] Listado de cartas/esquirlas con estado visible.
- [ ] Botón "abrir" que invoca la función vía `supabase.rpc(...)`, solo
      habilitado si `status = 'disponible'`.
- [ ] Panel de máster: crear contenido sellado y activar `disponible`.

---

## FASE 6 — Mapa

### HU 6.1 — Capas del mapa
- [ ] Migración: `map_layers` (`id`, `code text CHECK ('mundo_real',
      'mundo_espejo')`, `visible_to_players boolean`). Fila `mundo_real` con
      `visible_to_players = true` fija; `mundo_espejo` controlable por la
      máster.
- [ ] RLS: jugadores solo ven capas con `visible_to_players = true`.

### HU 6.2 — Marcadores
- [ ] Migración: `map_markers` (`id`, `layer_id FK`,
      `marker_type text CHECK ('lugar','evento','mision','glitch',
      'posicion_grupo')`, `x numeric`, `y numeric`, `linked_entry_id FK NULL`,
      `visible_to_players boolean default true` (solo relevante si
      `linked_entry_id IS NULL`), `created_by`).
- [ ] RLS `map_markers`: si `linked_entry_id IS NOT NULL`, visibilidad sigue
      el desbloqueo de esa entry (existe algún `player_unlocks` propio o
      global) — sin usar `visible_to_players` en ese caso; si
      `linked_entry_id IS NULL`, visibilidad = `visible_to_players` propio.
      Recordar: el nombre real del marcador enlazado sigue viniendo de
      `entry_fragments`, nunca de esta tabla.
- [ ] **Checkpoint**: pasar por `review-rls.prompt.md` aplicando
      explícitamente el patrón de "nombre en fragmento, no en contenedor".

### HU 6.3 — Glitches
- [ ] Migración: `map_glitches` (`marker_id FK`, `starts_at`, `ends_at NULL`,
      `intensity int`).
- [ ] RLS: hereda visibilidad de `map_markers` (glitch siempre sin
      `linked_entry_id`, control manual de la máster).

### HU 6.4 — Posición del grupo
- [ ] Decidir modelo: marcador único de tipo `posicion_grupo` que la máster
      actualiza (mueve), o histórico con `is_current boolean`. Recomendado:
      un único marcador que se actualiza in-place (más simple).
- [ ] RLS/UI: solo la máster puede mover este marcador.

### HU 6.5 — UI del mapa
- [ ] Componente de imagen con zoom/pan (biblioteca a elegir) sobre la imagen
      del continente.
- [ ] Renderizado de marcadores por capa, con búsqueda por texto sobre los
      marcadores visibles (usa lo que RLS ya devolvió).
- [ ] Toggle de capa `mundo_espejo` para la máster.

---

## FASE 7 — Calendario y cronología (Calendario Imperial Xuoim)

### HU 7.1 — Modelo de fechas
- [ ] Migración: `event_dates` (`entry_id FK unique` → entry de tipo
      `evento`, `year int NULL`, `day int NULL`, `unknown_date boolean
      default false`, `relative_order int NULL`).
- [ ] RLS: hereda la de `entries`/`entry_fragments` (no expone nada nuevo,
      son solo metadatos de fecha; valorar si el propio hecho de la fecha es
      spoiler — si lo es, aplicar mismo patrón de checkpoint).

### HU 7.2 — UI de cronología
- [ ] Vista de línea temporal ordenada por `year`/`day`, con los eventos de
      `unknown_date = true` intercalados según `relative_order` o listados
      aparte (a definir en diseño de detalle, no bloqueante).
- [ ] Reutiliza el componente de detalle de entry para cada evento (respeta
      conocida/real/draft automáticamente).

---

## FASE 8 — Facciones

### HU 8.1 — Jerarquía configurable
- [ ] Migración: `factions` (`id`, `parent_faction_id FK NULL
      self-reference`, `level_label text`, `name text`, `entry_id FK NULL` →
      entry de tipo `faccion` para su descripción con desbloqueo).
- [ ] RLS: lectura pública de la jerarquía (nombres de nodo intermedio si no
      son spoiler) + desbloqueo vía `entry_fragments` para la descripción
      real, mismo patrón que razas.

### HU 8.2 — UI de facciones
- [ ] Árbol expandible/colapsable de facciones.
- [ ] Enlace a la ficha de entry con fragments para cada nodo.

---

## FASE 9 — Diario de campaña

### HU 9.1 — Entradas de diario
- [ ] Migración: `journal_entries` (`id`, `session_id FK unique`,
      `content text`, `created_by`, `created_at`).
- [ ] RLS: lectura para cualquier autenticado; escritura solo máster.

### HU 9.2 — Participantes y enlaces
- [ ] Migración: `journal_entry_participants` (`journal_entry_id FK`,
      `character_id FK`).
- [ ] Migración: `journal_entry_entry_links` (`journal_entry_id FK`,
      `entry_id FK`, `role text NULL`) para enlazar lugares/NPCs/objetos/
      eventos mencionados.

### HU 9.3 — Comentarios y moderación
- [ ] Migración: `journal_comments` (`id`, `journal_entry_id FK`,
      `author_id FK`, `content text`, `created_at`, `is_hidden boolean
      default false`).
- [ ] RLS: cualquier autenticado inserta/edita su propio comentario; la
      máster puede ocultar (`is_hidden`) o editar cualquiera.
- [ ] UI: vista de diario por sesión con hilo de comentarios.

---

## FASE 10 — Relaciones entre entradas + búsqueda global

### HU 10.1 — Relaciones genéricas
- [ ] Migración: `entry_relations` (`id`, `source_entry_id FK`,
      `relation_type text`, `target_entry_id FK`).
- [ ] RLS: visible si el jugador tiene acceso a ambas entries relacionadas
      (mismo criterio que `entries`/`entry_fragments`).
- [ ] UI: sección "relacionado con" en el detalle de entry.

### HU 10.2 — Búsqueda global insensible a acentos/apóstrofes
- [ ] Migración: función `search_entries(query text)` `SECURITY INVOKER`
      (no `DEFINER`) que busca sobre `entry_fragments` visibles usando
      `unaccent` (normalizando acentos y apóstrofes en ambos lados de la
      comparación), agrupando por `entry_id`.
- [ ] Índice de apoyo (`GIN`/`trigram` con `unaccent`) para rendimiento.
- [ ] **Checkpoint**: `review-rls.prompt.md`, confirmar explícitamente que la
      función es `SECURITY INVOKER` y que un jugador sin unlocks no obtiene
      resultados de fragments bloqueados.
- [ ] UI: barra de búsqueda global, resultados agrupados por tipo de entry.

---

## FASE 11 — Auditoría transversal, PWA y despliegue

### HU 11.1 — Revisión de auditoría
- [ ] Repasar todas las acciones sensibles del proyecto (unlocks, reveals,
      apertura de sellado, cambios de secreto, cambios de configuración de
      campaña) y confirmar que cada una tiene rastro propio o pasa por
      `audit_log`.
- [ ] Rellenar huecos encontrados con inserciones a `audit_log` donde no
      exista ya un historial propio.

### HU 11.2 — PWA
- [ ] Estrategia de cache del Service Worker: solo assets estáticos, nunca
      respuestas de Supabase.
- [ ] Prueba de instalación en dispositivo móvil (jugadores usan esto en
      sesión).

### HU 11.3 — Pulido y responsive
- [ ] Revisión de UI en móvil para las vistas más usadas en sesión (ficha de
      personaje, mapa, códice, diario).

### HU 11.4 — Despliegue
- [ ] Decidir hosting de Supabase (Cloud gestionado vs. self-hosted) y de la
      build de Angular (estático).
- [ ] Pipeline CI/CD si se desea automatizar (GitLab CI, según preferencia del
      usuario) — opcional, no bloqueante para uso personal de la campaña.
