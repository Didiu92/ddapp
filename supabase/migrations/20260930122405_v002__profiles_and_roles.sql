-- Perfiles de usuario y roles (máster / jugador).
-- No hay signup público: la máster crea las cuentas manualmente (Studio /
-- Admin API) y esta fila correspondiente en profiles, ambas operaciones con
-- la clave service_role, que ignora RLS. Por eso no hace falta política de
-- INSERT para 'authenticated'/'anon'.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('master', 'player')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Reutilizable en el resto de políticas RLS del proyecto (Fase 2 en adelante).
create or replace function public.is_master()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

-- Cualquier autenticado puede ver todos los perfiles (nombres visibles en
-- diario, participantes de sesión, etc.).
create policy profiles_select_authenticated
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

-- Cada jugador edita su propia fila; la máster edita cualquiera.
create policy profiles_update_own_or_master
  on public.profiles
  for update
  using (id = auth.uid() or public.is_master())
  with check (id = auth.uid() or public.is_master());

-- Evita que un jugador se autoasigne el rol de máster al editar su propio
-- display_name (la política RLS de arriba solo protege la fila, no la
-- columna); solo la máster puede cambiar el campo role.
create or replace function public.profiles_prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_master() then
    raise exception 'Solo la máster puede cambiar el rol de un perfil';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_role_escalation
  before update on public.profiles
  for each row
  execute function public.profiles_prevent_role_escalation();
