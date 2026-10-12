-- Kokorosd Entreno · Esquema de base de datos (fase 1)
-- Pegar entero en Supabase > SQL Editor y pulsar Run. Se puede ejecutar una sola vez.
-- Seguridad: todas las tablas tienen permisos por fila (RLS).
--   alumno  -> ve el contenido y SOLO sus propios registros
--   maestro -> ve todo y gestiona contenido, asignaciones y validaciones

-- ───────────────────────── Personas ─────────────────────────
create table public.perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique,
  rol text not null default 'alumno' check (rol in ('alumno','maestro')),
  debe_cambiar_clave boolean not null default true,
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- El alias se toma de la parte anterior a la @ del correo interno (alias@kokorosd.example)
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfil (id, alias)
  values (new.id, lower(split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
for each row execute function public.crear_perfil();

create function public.es_maestro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfil
                 where id = (select auth.uid()) and rol = 'maestro' and activo);
$$;

create function public.es_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfil
                 where id = (select auth.uid()) and activo);
$$;

-- El alumno confirma que ya cambió su clave temporal (no puede tocar nada más de su perfil)
create function public.marcar_clave_cambiada() returns void
language sql security definer set search_path = '' as $$
  update public.perfil set debe_cambiar_clave = false where id = (select auth.uid());
$$;

revoke execute on function public.es_maestro(), public.es_activo(), public.marcar_clave_cambiada() from public, anon;
grant execute on function public.es_maestro(), public.es_activo(), public.marcar_clave_cambiada() to authenticated;

-- ───────────────────────── Catálogo ─────────────────────────
create table public.ejercicio (
  id text primary key,                       -- id de free-exercise-db o código propio
  nombre_es text not null,
  nombre_en text,
  musculos_principales text[] not null default '{}',
  musculos_secundarios text[] not null default '{}',
  equipo text,
  categoria text,
  tipo_registro text not null default 'reps' check (tipo_registro in ('reps','tiempo','check')),
  imagenes text[] not null default '{}',     -- rutas relativas dentro de free-exercise-db
  instrucciones text[] not null default '{}',
  fuente text,
  licencia text,
  activo boolean not null default true
);

create table public.recurso (                -- vídeos y enlaces (YouTube, Drive…)
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('youtube','drive','enlace')),
  url text not null,
  titulo text not null,
  inicio_seg int not null default 0,
  creado timestamptz not null default now()
);

-- ───────────────────────── Entreno físico ─────────────────────────
create table public.rutina (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  orden int not null default 0,
  activa boolean not null default true
);

create table public.bloque_entreno (         -- lo que llamamos "Día 1", "Día 2"…
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,               -- D1, D2, D20…
  nombre text not null,
  descripcion text
);

create table public.rutina_bloque (
  rutina_id uuid not null references public.rutina(id) on delete cascade,
  bloque_id uuid not null references public.bloque_entreno(id) on delete cascade,
  orden int not null default 0,
  primary key (rutina_id, bloque_id)
);

create table public.bloque_item (
  id uuid primary key default gen_random_uuid(),
  bloque_id uuid not null references public.bloque_entreno(id) on delete cascade,
  seccion text not null,                     -- Movilidad, Pecho, Tríceps…
  orden int not null default 0,
  tipo text not null default 'ejercicio' check (tipo in ('ejercicio','video')),
  ejercicio_id text references public.ejercicio(id),
  recurso_id uuid references public.recurso(id),
  modo text not null default 'reps' check (modo in ('reps','tiempo','check')),
  series int,
  repeticiones text,                         -- "10", "al fallo", "30 s"
  descanso_seg int,
  protocolo text,                            -- normal, asc, pir, iso, alt…
  etiqueta text,                             -- "Inclinado", "Agarre abierto"…
  nota text,                                 -- nota del maestro visible para todos
  check ((tipo = 'ejercicio' and ejercicio_id is not null)
      or (tipo = 'video' and recurso_id is not null))
);
create index on public.bloque_item (bloque_id, orden);

-- ───────────────────────── Programas técnicos (fase 3) ─────────────────────────
create table public.programa (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  orden int not null default 0
);

create table public.nivel (                  -- cinto o grado
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programa(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  orden int not null default 0,
  detalle jsonb not null default '{}',       -- virtud, actitudes, hitos…
  unique (programa_id, codigo)
);

create table public.tecnica (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.nivel(id) on delete cascade,
  seccion text not null,                     -- Combos, Drills, Proyecciones, Kata…
  codigo text,                               -- 1.1, 1.2…
  titulo text not null,
  descripcion text,
  orden int not null default 0
);
create index on public.tecnica (nivel_id, orden);

create table public.tecnica_recurso (
  tecnica_id uuid not null references public.tecnica(id) on delete cascade,
  recurso_id uuid not null references public.recurso(id) on delete cascade,
  orden int not null default 0,
  primary key (tecnica_id, recurso_id)
);

-- ───────────────────────── Datos por alumno ─────────────────────────
create table public.asignacion (             -- rutinas que sigue cada alumno
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  rutina_id uuid not null references public.rutina(id) on delete cascade,
  desde date not null default current_date,
  activa boolean not null default true,
  primary key (alumno_id, rutina_id)
);

create table public.recomendado (            -- ★ del maestro para un alumno concreto
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  bloque_item_id uuid not null references public.bloque_item(id) on delete cascade,
  nota text,
  primary key (alumno_id, bloque_item_id)
);

create table public.sustitucion (            -- ejercicio que el alumno cambia en SU plan
  alumno_id uuid not null default auth.uid() references public.perfil(id) on delete cascade,
  bloque_item_id uuid not null references public.bloque_item(id) on delete cascade,
  ejercicio_id text not null references public.ejercicio(id),
  primary key (alumno_id, bloque_item_id)
);

create table public.serie_registro (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null default auth.uid() references public.perfil(id) on delete cascade,
  bloque_item_id uuid references public.bloque_item(id) on delete set null,
  ejercicio_id text not null references public.ejercicio(id),
  fecha date not null default current_date,
  num_serie int not null default 1,
  peso_kg numeric(6,2),
  repeticiones int,
  tiempo_seg int,
  creado timestamptz not null default now()
);
create index on public.serie_registro (alumno_id, ejercicio_id, fecha);

create table public.marca_hecho (            -- movilidad y estiramientos marcados como hechos
  alumno_id uuid not null default auth.uid() references public.perfil(id) on delete cascade,
  bloque_item_id uuid not null references public.bloque_item(id) on delete cascade,
  fecha date not null default current_date,
  primary key (alumno_id, bloque_item_id, fecha)
);

create table public.progreso_tecnica (       -- lo que dice el alumno sobre cada técnica
  alumno_id uuid not null default auth.uid() references public.perfil(id) on delete cascade,
  tecnica_id uuid not null references public.tecnica(id) on delete cascade,
  estado text not null check (estado in ('practicando','dominada')),
  actualizado timestamptz not null default now(),
  primary key (alumno_id, tecnica_id)
);

create table public.validacion_tecnica (     -- lo que valida el maestro
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  tecnica_id uuid not null references public.tecnica(id) on delete cascade,
  validada_en timestamptz not null default now(),
  validada_por uuid references public.perfil(id),
  nota text,
  primary key (alumno_id, tecnica_id)
);

create table public.grado_alumno (
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  nivel_id uuid not null references public.nivel(id) on delete cascade,
  fecha date not null default current_date,
  asignado_por uuid references public.perfil(id),
  primary key (alumno_id, nivel_id)
);

-- ───────────────────────── Permisos por fila ─────────────────────────
-- Perfil: cada uno ve el suyo; el maestro ve y gestiona todos.
alter table public.perfil enable row level security;
create policy "ve el suyo" on public.perfil for select to authenticated
  using (id = (select auth.uid()) or public.es_maestro());
create policy "maestro gestiona" on public.perfil for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());

-- Contenido: lo leen todos los socios activos; solo el maestro lo modifica.
do $$
declare t text;
begin
  foreach t in array array['ejercicio','recurso','programa','nivel','tecnica',
                           'tecnica_recurso','rutina','bloque_entreno','rutina_bloque','bloque_item']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "leen socios activos" on public.%I for select to authenticated using (public.es_activo())', t);
    execute format('create policy "maestro escribe" on public.%I for all to authenticated using (public.es_maestro()) with check (public.es_maestro())', t);
  end loop;

  -- Registros propios: el alumno gestiona los suyos; el maestro solo lee.
  foreach t in array array['sustitucion','serie_registro','marca_hecho','progreso_tecnica']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "gestiona lo suyo" on public.%I for all to authenticated using (alumno_id = (select auth.uid()) and public.es_activo()) with check (alumno_id = (select auth.uid()) and public.es_activo())', t);
    execute format('create policy "maestro lee" on public.%I for select to authenticated using (public.es_maestro())', t);
  end loop;

  -- Datos que decide el maestro: el alumno solo lee los suyos.
  foreach t in array array['asignacion','recomendado','validacion_tecnica','grado_alumno']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "lee lo suyo" on public.%I for select to authenticated using (alumno_id = (select auth.uid()) or public.es_maestro())', t);
    execute format('create policy "maestro escribe" on public.%I for all to authenticated using (public.es_maestro()) with check (public.es_maestro())', t);
  end loop;
end $$;
