# ddapp — PWA campaña de rol de alta fantasía

Backend: Supabase (Postgres, Auth, Storage, RLS) local sobre Podman en WSL2.
Frontend: Angular (standalone) en `frontend/`.

## Requisitos
- WSL2 con Ubuntu, proyecto real en `~/ddapp` (no en `/mnt/c`).
- Podman rootless configurado (`DOCKER_HOST` apuntando a su socket).
- Node.js (vía nvm) y Supabase CLI (`npx supabase`).

## Levantar el entorno local
```bash
cd ~/ddapp
npx supabase start        # arranca Postgres/Auth/Storage/Studio locales
cd frontend
npm install
npx ng serve
```

Supabase Studio local: http://127.0.0.1:54323
Angular dev server: http://localhost:4200

## Dónde mirar primero
- `BACKLOG.md` — fases, historias de usuario y checklist de progreso real.
- `.github/copilot-instructions.md` — resumen de dominio y convenciones del
  proyecto (léelo antes de asumir cualquier regla de negocio o estructura).
