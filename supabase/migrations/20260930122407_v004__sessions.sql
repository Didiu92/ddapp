-- Sesiones de juego, referenciadas por Pregunta Ancestral, desgaste del
-- sello y diario de campaña en fases posteriores.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  session_date date not null,
  title text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy sessions_select_authenticated
  on public.sessions
  for select
  using (auth.role() = 'authenticated');

create policy sessions_insert_master
  on public.sessions
  for insert
  with check (public.is_master());

create policy sessions_update_master
  on public.sessions
  for update
  using (public.is_master())
  with check (public.is_master());

create policy sessions_delete_master
  on public.sessions
  for delete
  using (public.is_master());
