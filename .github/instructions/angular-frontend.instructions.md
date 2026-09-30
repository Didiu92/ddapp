---
applyTo: "frontend/**"
---

# Frontend Angular — convenciones

Instrucciones específicas para trabajar dentro de `frontend/`. Complementan
`.github/copilot-instructions.md`, no lo repiten.

## Estilo de componentes
- Standalone components siempre; nunca `NgModule`.
- `inject()` para dependencias, no inyección por constructor.
- `signal`/`computed` para estado local; evita `BehaviorSubject` salvo que
  necesites de verdad un stream RxJS (ej. eventos de Supabase Realtime).
- Control flow nativo (`@if`, `@for`, `@switch`), nunca `*ngIf`/`*ngFor`.
- Un feature folder por dominio bajo `src/app/features/` (ej. `codice/`,
  `personajes/`, `mapa/`), con `core/` para servicios transversales
  (auth, cliente Supabase) y `shared/` para componentes reutilizables.

## Roles y visibilidad
- El frontend **nunca** decide qué ocultar por rol: pinta exactamente lo que
  la consulta a Supabase devuelve (la RLS ya filtró). No dupliques lógica de
  desbloqueo/visibilidad en Angular "por si acaso".
- Sí usa el rol (`master`/`player`) para decidir qué **rutas y controles de
  edición** mostrar (ej. panel de administración de la máster), mediante
  guards funcionales (`canActivateFn`) y un `AuthService` con `signal` de
  sesión/rol.
- Guards y componentes de administración son una capa de UX, no de
  seguridad: la seguridad real vive en RLS.

## Cliente Supabase
- Un único `SupabaseClient` inyectable (servicio en `core/`), configurado con
  la URL/anon key del `environment` correspondiente (local vs producción).
- Nunca uses la `service_role key` desde el frontend.
- Para contenido sellado, llama siempre a la función RPC dedicada
  (`supabase.rpc(...)`), nunca hagas `SELECT` directo esperando que la RLS
  "ya lo arregle": la tabla base no debe exponer el contenido real por
  `SELECT` en ningún caso.

## PWA
- Manifest + Service Worker vía `@angular/pwa`.
- Cachear solo assets estáticos (JS/CSS/imágenes de la app); no cachear
  respuestas de Supabase (son dinámicas y dependen de sesión/RLS).
