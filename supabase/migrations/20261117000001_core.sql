-- =====================================================================
-- HotelFlow — 001: núcleo (hotéis, perfis, permissões, notificações)
-- Idempotente: pode ser executado mais de uma vez com segurança.
-- =====================================================================

-- ---------- Utilitários ----------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Código de convite com ~49 bits de entropia (sem caracteres ambíguos)
create or replace function public.generate_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  idx int[] := array[0,1,2,3,4,5,7,9,10,11];
  result text := '';
  i int;
begin
  foreach i in array idx loop
    result := result || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

-- ---------- Hotéis ----------------------------------------------------
create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  city text check (city is null or char_length(city) <= 120),
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Perfis ----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  hotel_id uuid references public.hotels(id) on delete set null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role text not null default 'staff' check (role in ('admin', 'supervisor', 'staff')),
  department text not null default 'general'
    check (department in ('reception', 'housekeeping', 'maintenance', 'food_beverage', 'management', 'general')),
  locale text not null default 'pt-BR' check (locale in ('pt-BR', 'en', 'es')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_hotel_idx on public.profiles (hotel_id);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- Funções de contexto (usadas pelas políticas RLS) ----------
create or replace function public.current_hotel_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.hotel_id from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.current_member_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.active and p.hotel_id is not null
$$;

create or replace function public.current_department()
returns text language sql stable security definer set search_path = '' as $$
  select p.department from public.profiles p
  where p.id = auth.uid() and p.active and p.hotel_id is not null
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.role in ('admin', 'supervisor') from public.profiles p
    where p.id = auth.uid() and p.active and p.hotel_id is not null
  ), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.role = 'admin' from public.profiles p
    where p.id = auth.uid() and p.active and p.hotel_id is not null
  ), false)
$$;

-- O usuário informado pertence (ativo) ao mesmo hotel de quem chama?
create or replace function public.is_colleague(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.active
      and p.hotel_id is not null
      and p.hotel_id = public.current_hotel_id()
  )
$$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), '—') from public.profiles p where p.id = auth.uid()
$$;

-- ---------- Criação automática do perfil ------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_locale text := new.raw_user_meta_data ->> 'locale';
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  if v_locale is null or v_locale not in ('pt-BR', 'en', 'es') then
    v_locale := 'pt-BR';
  end if;
  insert into public.profiles (id, full_name, locale)
  values (new.id, left(coalesce(v_name, split_part(coalesce(new.email, ''), '@', 1)), 120), v_locale)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfis para usuários criados antes desta migração
insert into public.profiles (id, full_name)
select u.id, left(split_part(coalesce(u.email, ''), '@', 1), 120)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------- Notificações ----------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (char_length(type) <= 60),
  data jsonb not null default '{}'::jsonb,
  link text check (link is null or (char_length(link) <= 300 and left(link, 1) = '/')),
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_push_idx on public.notifications (actor_id, created_at) where pushed_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Segredos do servidor (ex.: chaves VAPID). Sem políticas: só service_role acessa.
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

-- Tentativas de entrada com código (proteção contra força bruta)
create table if not exists public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists join_attempts_user_idx on public.join_attempts (user_id, attempted_at);

-- Notificar um usuário (nunca a si mesmo)
create or replace function public.notify_user(p_user uuid, p_type text, p_data jsonb, p_link text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (hotel_id, user_id, actor_id, type, data, link)
  select p.hotel_id, p.id, auth.uid(), p_type, coalesce(p_data, '{}'::jsonb), p_link
  from public.profiles p
  where p.id = p_user and p.active and p.hotel_id is not null;
end $$;

-- Notificar gestores (admin/supervisor) e, opcionalmente, um setor
create or replace function public.notify_managers(
  p_hotel uuid, p_type text, p_data jsonb, p_link text, p_department text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (hotel_id, user_id, actor_id, type, data, link)
  select p.hotel_id, p.id, auth.uid(), p_type, coalesce(p_data, '{}'::jsonb), p_link
  from public.profiles p
  where p.hotel_id = p_hotel and p.active
    and (p.role in ('admin', 'supervisor') or (p_department is not null and p.department = p_department))
    and p.id is distinct from auth.uid();
end $$;

-- ---------- RPCs de equipe --------------------------------------------
create or replace function public.create_hotel(p_name text, p_city text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hotel uuid;
  v_locale text;
begin
  if v_uid is null then raise exception 'HF:not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid and hotel_id is not null and active) then
    raise exception 'HF:already_member';
  end if;
  if p_name is null or char_length(btrim(p_name)) < 2 then raise exception 'HF:invalid_name'; end if;

  insert into public.hotels (name, city, created_by)
  values (left(btrim(p_name), 120), nullif(left(btrim(coalesce(p_city, '')), 120), ''), v_uid)
  returning id into v_hotel;

  update public.profiles
     set hotel_id = v_hotel, role = 'admin', department = 'management', active = true
   where id = v_uid
  returning locale into v_locale;

  perform public.seed_hotel_defaults(v_hotel, coalesce(v_locale, 'pt-BR'));
  return v_hotel;
end $$;

create or replace function public.join_hotel(p_code text, p_department text default 'general')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hotel uuid;
  v_dept text := coalesce(p_department, 'general');
begin
  if v_uid is null then return 'not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid and hotel_id is not null and active) then
    return 'already_member';
  end if;
  if (select count(*) from public.join_attempts
       where user_id = v_uid and attempted_at > now() - interval '15 minutes') >= 8 then
    return 'too_many_attempts';
  end if;
  if v_dept not in ('reception', 'housekeeping', 'maintenance', 'food_beverage', 'management', 'general') then
    v_dept := 'general';
  end if;

  select id into v_hotel from public.hotels
   where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_hotel is null then
    insert into public.join_attempts (user_id) values (v_uid);
    return 'invalid_code';
  end if;

  update public.profiles
     set hotel_id = v_hotel, role = 'staff', department = v_dept, active = true
   where id = v_uid;

  insert into public.notifications (hotel_id, user_id, actor_id, type, data, link)
  select p.hotel_id, p.id, v_uid, 'member_joined', jsonb_build_object('actor', public.actor_name()), '/admin'
    from public.profiles p
   where p.hotel_id = v_hotel and p.role = 'admin' and p.active and p.id <> v_uid;
  return 'ok';
end $$;

create or replace function public.get_invite_code()
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'HF:forbidden'; end if;
  return (select invite_code from public.hotels where id = public.current_hotel_id());
end $$;

create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.is_admin() then raise exception 'HF:forbidden'; end if;
  update public.hotels set invite_code = public.generate_invite_code()
   where id = public.current_hotel_id()
  returning invite_code into v_code;
  return v_code;
end $$;

create or replace function public.update_member(
  p_user uuid, p_role text, p_department text, p_active boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hotel uuid := public.current_hotel_id();
  v_old_role text;
begin
  if not public.is_admin() then raise exception 'HF:forbidden'; end if;
  if p_role not in ('admin', 'supervisor', 'staff') then raise exception 'HF:invalid_role'; end if;
  if p_department not in ('reception', 'housekeeping', 'maintenance', 'food_beverage', 'management', 'general') then
    raise exception 'HF:invalid_department';
  end if;
  select role into v_old_role from public.profiles where id = p_user and hotel_id = v_hotel;
  if v_old_role is null then raise exception 'HF:not_found'; end if;

  -- Nunca deixar o hotel sem administrador ativo
  if (v_old_role = 'admin' and (p_role <> 'admin' or not p_active))
     and (select count(*) from public.profiles
           where hotel_id = v_hotel and role = 'admin' and active and id <> p_user) = 0 then
    raise exception 'HF:last_admin';
  end if;

  update public.profiles
     set role = p_role, department = p_department, active = coalesce(p_active, true)
   where id = p_user and hotel_id = v_hotel;
end $$;

create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid := public.current_hotel_id();
begin
  if not public.is_admin() then raise exception 'HF:forbidden'; end if;
  if not exists (select 1 from public.profiles where id = p_user and hotel_id = v_hotel) then
    raise exception 'HF:not_found';
  end if;
  if (select role from public.profiles where id = p_user) = 'admin'
     and (select count(*) from public.profiles
           where hotel_id = v_hotel and role = 'admin' and active and id <> p_user) = 0 then
    raise exception 'HF:last_admin';
  end if;
  update public.profiles set hotel_id = null, role = 'staff', department = 'general'
   where id = p_user and hotel_id = v_hotel;
end $$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any (p_ids));
$$;

-- ---------- RLS: hotéis, perfis, notificações ------------------------
alter table public.hotels enable row level security;
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.app_secrets enable row level security;
alter table public.join_attempts enable row level security;

drop policy if exists hotels_select on public.hotels;
create policy hotels_select on public.hotels for select to authenticated
  using (id = (select public.current_hotel_id()));
drop policy if exists hotels_update on public.hotels;
create policy hotels_update on public.hotels for update to authenticated
  using (id = (select public.current_hotel_id()) and (select public.is_admin()))
  with check (id = (select public.current_hotel_id()) and (select public.is_admin()));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (hotel_id is not null and hotel_id = (select public.current_hotel_id()))
  );
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Privilégios por coluna: o usuário só altera o que é seu e seguro.
revoke all on public.hotels, public.profiles, public.notifications,
  public.push_subscriptions, public.app_secrets, public.join_attempts from anon, authenticated;
grant select (id, name, city, created_at) on public.hotels to authenticated;
grant update (name, city) on public.hotels to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, locale, theme) on public.profiles to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant all on public.app_secrets, public.join_attempts to service_role;
