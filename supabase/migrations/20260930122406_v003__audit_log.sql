-- Auditoría transversal para acciones sensibles que no tengan ya su propio
-- historial (unlocked_by/revealed_by/opened_by en fases posteriores sí lo
-- tienen y no necesitan pasar por aquí).
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Solo la máster puede leerlo. No hay política de insert para
-- 'authenticated'/'anon': las inserciones se hacen desde funciones
-- SECURITY DEFINER (o service_role), nunca directamente desde el cliente.
create policy audit_log_select_master
  on public.audit_log
  for select
  using (public.is_master());
