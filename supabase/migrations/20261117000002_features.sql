-- =====================================================================
-- HotelFlow — 002: módulos (escala, trocas, folgas, banco de horas,
-- governança, manutenção, achados e perdidos, guia, frases,
-- treinamento, roteiros)
-- =====================================================================

-- =========================== ESCALA ==================================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_date date not null,
  start_time time,
  end_time time,
  kind text not null default 'work' check (kind in ('work', 'off', 'vacation')),
  notes text check (notes is null or char_length(notes) <= 300),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shifts_work_has_times check (kind <> 'work' or (start_time is not null and end_time is not null))
);
create index if not exists shifts_hotel_date_idx on public.shifts (hotel_id, shift_date);
create index if not exists shifts_user_date_idx on public.shifts (user_id, shift_date);

-- ======================= TROCA DE TURNOS =============================
create table if not exists public.shift_swaps (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_shift_id uuid not null references public.shifts(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  target_shift_id uuid references public.shifts(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'pending_peer'
    check (status in ('pending_peer', 'pending_approval', 'approved', 'rejected', 'declined', 'cancelled')),
  peer_responded_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 300),
  created_at timestamptz not null default now(),
  constraint swap_not_self check (requester_id <> target_id)
);
create index if not exists shift_swaps_hotel_idx on public.shift_swaps (hotel_id, status);

-- ============================ FOLGAS =================================
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  kind text not null default 'day_off' check (kind in ('day_off', 'vacation', 'hour_bank')),
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint leave_dates check (end_date >= start_date and end_date - start_date <= 60)
);
create index if not exists leave_requests_hotel_idx on public.leave_requests (hotel_id, status);

-- ========================= BANCO DE HORAS ============================
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  minutes int not null check (minutes <> 0 and minutes between -1440 and 1440),
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_user_idx on public.time_entries (user_id, entry_date desc);
create index if not exists time_entries_hotel_idx on public.time_entries (hotel_id, status);

-- ========================== GOVERNANÇA ===============================
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists checklist_templates_hotel_idx on public.checklist_templates (hotel_id);

create table if not exists public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  template_id uuid references public.checklist_templates(id) on delete set null,
  template_name text not null check (char_length(template_name) <= 80),
  room text not null check (char_length(btrim(room)) between 1 and 20),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'inspected')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz,
  inspected_by uuid references public.profiles(id) on delete set null,
  inspected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checklist_runs_hotel_idx on public.checklist_runs (hotel_id, created_at desc);

-- ========================== MANUTENÇÃO ===============================
create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  code bigint generated always as identity,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 2000),
  location text not null check (char_length(btrim(location)) between 1 and 80),
  category text not null default 'other'
    check (category in ('electrical', 'plumbing', 'hvac', 'furniture', 'electronics', 'cleaning', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'cancelled')),
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists maintenance_tickets_hotel_idx on public.maintenance_tickets (hotel_id, status, created_at desc);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);

-- ====================== ACHADOS E PERDIDOS ===========================
create table if not exists public.lost_items (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category text not null default 'other'
    check (category in ('documents', 'electronics', 'clothing', 'accessories', 'money', 'other')),
  location text check (location is null or char_length(location) <= 120),
  found_at timestamptz not null default now(),
  photo_path text check (photo_path is null or char_length(photo_path) <= 300),
  status text not null default 'stored' check (status in ('stored', 'returned', 'discarded')),
  owner_name text check (owner_name is null or char_length(owner_name) <= 120),
  owner_contact text check (owner_contact is null or char_length(owner_contact) <= 120),
  created_by uuid not null references public.profiles(id) on delete cascade,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lost_items_hotel_idx on public.lost_items (hotel_id, status, found_at desc);

-- ======================= GUIA LOCAL ==================================
create table if not exists public.guide_items (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  kind text not null default 'tour' check (kind in ('tour', 'event', 'food', 'service')),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text check (description is null or char_length(description) <= 2000),
  address text check (address is null or char_length(address) <= 200),
  starts_at timestamptz,
  price text check (price is null or char_length(price) <= 60),
  contact text check (contact is null or char_length(contact) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists guide_items_hotel_idx on public.guide_items (hotel_id, kind);

-- ===================== FRASES PERSONALIZADAS =========================
create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  category text not null default 'custom' check (char_length(category) <= 40),
  text_pt text not null check (char_length(btrim(text_pt)) between 1 and 400),
  text_en text not null check (char_length(btrim(text_en)) between 1 and 400),
  text_es text not null check (char_length(btrim(text_es)) between 1 and 400),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists phrases_hotel_idx on public.phrases (hotel_id);

-- ========================= TREINAMENTO ===============================
create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  summary text check (summary is null or char_length(summary) <= 300),
  content text not null check (char_length(content) between 1 and 8000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists training_modules_hotel_idx on public.training_modules (hotel_id);

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_key text not null check (char_length(module_key) <= 80),
  score int check (score is null or score between 0 and 100),
  completed_at timestamptz not null default now(),
  unique (user_id, module_key)
);
create index if not exists training_progress_hotel_idx on public.training_progress (hotel_id);

-- ===================== ROTEIROS DA RECEPÇÃO ==========================
create table if not exists public.service_scripts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 30),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists service_scripts_hotel_idx on public.service_scripts (hotel_id);

-- =====================================================================
-- Gatilhos de integridade e notificação
-- =====================================================================

-- Garante que hotel_id é sempre o do usuário (impede gravar em outro hotel)
create or replace function public.enforce_hotel_id()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid := public.current_hotel_id();
begin
  if auth.uid() is null then
    return new; -- migrações / service_role
  end if;
  if v_hotel is null then raise exception 'HF:no_hotel'; end if;
  if tg_op = 'INSERT' then
    new.hotel_id := v_hotel;
  elsif new.hotel_id is distinct from old.hotel_id then
    raise exception 'HF:forbidden';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['shifts', 'checklist_templates', 'checklist_runs', 'maintenance_tickets',
                           'ticket_comments', 'lost_items', 'guide_items', 'phrases',
                           'training_modules', 'training_progress', 'service_scripts']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_hotel', t);
    execute format('create trigger %I before insert or update on public.%I
                    for each row execute function public.enforce_hotel_id()', t || '_hotel', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['checklist_runs', 'maintenance_tickets', 'lost_items']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- Governança: só gestores aprovam a inspeção; notifica quando concluído
create or replace function public.checklist_run_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.status := 'in_progress';
    new.completed_at := null; new.inspected_by := null; new.inspected_at := null;
    return new;
  end if;

  if new.created_by is distinct from old.created_by then raise exception 'HF:forbidden'; end if;

  if new.status is distinct from old.status then
    if new.status = 'inspected' then
      if auth.uid() is not null and not public.is_manager() then raise exception 'HF:forbidden'; end if;
      new.inspected_by := auth.uid();
      new.inspected_at := now();
    elsif new.status = 'completed' then
      new.completed_at := now();
      new.inspected_by := null; new.inspected_at := null;
    else
      new.completed_at := null; new.inspected_by := null; new.inspected_at := null;
    end if;
  end if;
  return new;
end $$;

create or replace function public.checklist_run_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      perform public.notify_managers(new.hotel_id, 'checklist_completed',
        jsonb_build_object('actor', public.actor_name(), 'room', new.room), '/housekeeping/' || new.id);
    elsif new.status = 'inspected' then
      perform public.notify_user(new.created_by, 'checklist_inspected',
        jsonb_build_object('actor', public.actor_name(), 'room', new.room), '/housekeeping/' || new.id);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists checklist_runs_rules on public.checklist_runs;
create trigger checklist_runs_rules before insert or update on public.checklist_runs
  for each row execute function public.checklist_run_rules();
drop trigger if exists checklist_runs_notify on public.checklist_runs;
create trigger checklist_runs_notify after update on public.checklist_runs
  for each row execute function public.checklist_run_notify();

-- Manutenção: regras e notificações em tempo real
create or replace function public.ticket_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.status := 'open';
    new.resolved_at := null;
  else
    if new.created_by is distinct from old.created_by or new.code is distinct from old.code then
      raise exception 'HF:forbidden';
    end if;
    if new.status is distinct from old.status then
      new.resolved_at := case when new.status = 'resolved' then now() else null end;
    end if;
  end if;
  if new.assigned_to is not null and auth.uid() is not null and not public.is_colleague(new.assigned_to) then
    raise exception 'HF:invalid_member';
  end if;
  return new;
end $$;

create or replace function public.ticket_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_data jsonb := jsonb_build_object('actor', public.actor_name(), 'title', new.title,
                                     'code', new.code, 'location', new.location,
                                     'priority', new.priority, 'status', new.status);
  v_link text := '/maintenance/' || new.id;
begin
  if tg_op = 'INSERT' then
    perform public.notify_managers(new.hotel_id, 'ticket_created', v_data, v_link, 'maintenance');
    if new.assigned_to is not null then
      perform public.notify_user(new.assigned_to, 'ticket_assigned', v_data, v_link);
    end if;
    return null;
  end if;

  if new.status is distinct from old.status then
    perform public.notify_user(new.created_by, 'ticket_status', v_data, v_link);
    if new.assigned_to is distinct from new.created_by then
      perform public.notify_user(new.assigned_to, 'ticket_status', v_data, v_link);
    end if;
  end if;
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    perform public.notify_user(new.assigned_to, 'ticket_assigned', v_data, v_link);
  end if;
  return null;
end $$;

drop trigger if exists maintenance_tickets_rules on public.maintenance_tickets;
create trigger maintenance_tickets_rules before insert or update on public.maintenance_tickets
  for each row execute function public.ticket_rules();
drop trigger if exists maintenance_tickets_notify on public.maintenance_tickets;
create trigger maintenance_tickets_notify after insert or update on public.maintenance_tickets
  for each row execute function public.ticket_notify();

create or replace function public.ticket_comment_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ticket public.maintenance_tickets;
begin
  new.author_id := coalesce(auth.uid(), new.author_id);
  select * into v_ticket from public.maintenance_tickets where id = new.ticket_id;
  if v_ticket.id is null or v_ticket.hotel_id is distinct from new.hotel_id then
    raise exception 'HF:not_found';
  end if;
  return new;
end $$;

create or replace function public.ticket_comment_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.maintenance_tickets;
  v_data jsonb;
begin
  select * into v_ticket from public.maintenance_tickets where id = new.ticket_id;
  v_data := jsonb_build_object('actor', public.actor_name(), 'title', v_ticket.title, 'code', v_ticket.code);
  perform public.notify_user(v_ticket.created_by, 'ticket_comment', v_data, '/maintenance/' || v_ticket.id);
  if v_ticket.assigned_to is distinct from v_ticket.created_by then
    perform public.notify_user(v_ticket.assigned_to, 'ticket_comment', v_data, '/maintenance/' || v_ticket.id);
  end if;
  return null;
end $$;

drop trigger if exists ticket_comments_rules on public.ticket_comments;
create trigger ticket_comments_rules before insert on public.ticket_comments
  for each row execute function public.ticket_comment_rules();
drop trigger if exists ticket_comments_notify on public.ticket_comments;
create trigger ticket_comments_notify after insert on public.ticket_comments
  for each row execute function public.ticket_comment_notify();

-- Achados e perdidos: autor fixo e registro de quem encerrou
create or replace function public.lost_item_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.status := 'stored';
    new.closed_by := null; new.closed_at := null;
  else
    if new.created_by is distinct from old.created_by then raise exception 'HF:forbidden'; end if;
    if new.status is distinct from old.status then
      if new.status = 'stored' then
        new.closed_by := null; new.closed_at := null;
      else
        new.closed_by := auth.uid(); new.closed_at := now();
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists lost_items_rules on public.lost_items;
create trigger lost_items_rules before insert or update on public.lost_items
  for each row execute function public.lost_item_rules();

-- Autor automático para conteúdos gerenciados
create or replace function public.set_created_by()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif new.created_by is distinct from old.created_by then
    new.created_by := old.created_by;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['shifts', 'guide_items', 'phrases', 'training_modules', 'service_scripts']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_author', t);
    execute format('create trigger %I before insert or update on public.%I
                    for each row execute function public.set_created_by()', t || '_author', t);
  end loop;
end $$;

-- Progresso de treinamento sempre do próprio usuário
create or replace function public.training_progress_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.completed_at := now();
  return new;
end $$;

drop trigger if exists training_progress_rules on public.training_progress;
create trigger training_progress_rules before insert or update on public.training_progress
  for each row execute function public.training_progress_rules();

-- =====================================================================
-- RPCs: trocas, folgas e banco de horas (fluxos com aprovação)
-- =====================================================================
create or replace function public.request_swap(
  p_my_shift uuid, p_target uuid, p_target_shift uuid default null, p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hotel uuid := public.current_hotel_id();
  v_shift public.shifts;
  v_tshift public.shifts;
  v_id uuid;
begin
  if v_hotel is null then raise exception 'HF:no_hotel'; end if;
  select * into v_shift from public.shifts where id = p_my_shift and hotel_id = v_hotel;
  if v_shift.id is null or v_shift.user_id <> v_uid then raise exception 'HF:not_your_shift'; end if;
  if v_shift.kind <> 'work' then raise exception 'HF:invalid_shift'; end if;
  if v_shift.shift_date < current_date then raise exception 'HF:past_shift'; end if;
  if p_target = v_uid or not public.is_colleague(p_target) then raise exception 'HF:invalid_member'; end if;

  if p_target_shift is not null then
    select * into v_tshift from public.shifts where id = p_target_shift and hotel_id = v_hotel;
    if v_tshift.id is null or v_tshift.user_id <> p_target or v_tshift.kind <> 'work' then
      raise exception 'HF:invalid_shift';
    end if;
  end if;

  if exists (select 1 from public.shift_swaps
              where requester_shift_id = p_my_shift and status in ('pending_peer', 'pending_approval')) then
    raise exception 'HF:duplicate_request';
  end if;

  insert into public.shift_swaps (hotel_id, requester_id, requester_shift_id, target_id, target_shift_id, reason)
  values (v_hotel, v_uid, p_my_shift, p_target, p_target_shift, nullif(left(btrim(coalesce(p_reason, '')), 300), ''))
  returning id into v_id;

  perform public.notify_user(p_target, 'swap_requested',
    jsonb_build_object('actor', public.actor_name(), 'date', v_shift.shift_date), '/swaps');
  return v_id;
end $$;

create or replace function public.respond_swap(p_swap uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_swap public.shift_swaps;
  v_date date;
begin
  select * into v_swap from public.shift_swaps where id = p_swap and hotel_id = public.current_hotel_id();
  if v_swap.id is null then raise exception 'HF:not_found'; end if;
  if v_swap.target_id <> auth.uid() then raise exception 'HF:forbidden'; end if;
  if v_swap.status <> 'pending_peer' then raise exception 'HF:invalid_state'; end if;

  update public.shift_swaps
     set status = case when p_accept then 'pending_approval' else 'declined' end,
         peer_responded_at = now()
   where id = p_swap;

  select shift_date into v_date from public.shifts where id = v_swap.requester_shift_id;
  perform public.notify_user(v_swap.requester_id,
    case when p_accept then 'swap_accepted' else 'swap_declined' end,
    jsonb_build_object('actor', public.actor_name(), 'date', v_date), '/swaps');
  if p_accept then
    perform public.notify_managers(v_swap.hotel_id, 'swap_pending_approval',
      jsonb_build_object('actor', public.actor_name(), 'date', v_date), '/swaps');
  end if;
end $$;

create or replace function public.decide_swap(p_swap uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_swap public.shift_swaps;
  v_req public.shifts;
  v_tgt public.shifts;
  v_data jsonb;
begin
  if not public.is_manager() then raise exception 'HF:forbidden'; end if;
  select * into v_swap from public.shift_swaps
   where id = p_swap and hotel_id = public.current_hotel_id() for update;
  if v_swap.id is null then raise exception 'HF:not_found'; end if;
  if v_swap.status <> 'pending_approval' then raise exception 'HF:invalid_state'; end if;

  select * into v_req from public.shifts where id = v_swap.requester_shift_id for update;
  if p_approve then
    if v_req.user_id <> v_swap.requester_id then raise exception 'HF:shift_changed'; end if;
    if v_swap.target_shift_id is not null then
      select * into v_tgt from public.shifts where id = v_swap.target_shift_id for update;
      if v_tgt.user_id <> v_swap.target_id then raise exception 'HF:shift_changed'; end if;
      update public.shifts set user_id = v_swap.requester_id where id = v_tgt.id;
    end if;
    update public.shifts set user_id = v_swap.target_id where id = v_req.id;
  end if;

  update public.shift_swaps
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(left(btrim(coalesce(p_note, '')), 300), '')
   where id = p_swap;

  v_data := jsonb_build_object('actor', public.actor_name(), 'date', v_req.shift_date);
  perform public.notify_user(v_swap.requester_id, case when p_approve then 'swap_approved' else 'swap_rejected' end, v_data, '/swaps');
  perform public.notify_user(v_swap.target_id, case when p_approve then 'swap_approved' else 'swap_rejected' end, v_data, '/swaps');
end $$;

create or replace function public.cancel_swap(p_swap uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.shift_swaps set status = 'cancelled'
   where id = p_swap and requester_id = auth.uid()
     and status in ('pending_peer', 'pending_approval');
  if not found then raise exception 'HF:invalid_state'; end if;
end $$;

create or replace function public.request_leave(
  p_start date, p_end date, p_kind text default 'day_off', p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_hotel uuid := public.current_hotel_id();
  v_id uuid;
begin
  if v_hotel is null then raise exception 'HF:no_hotel'; end if;
  if p_kind not in ('day_off', 'vacation', 'hour_bank') then raise exception 'HF:invalid_kind'; end if;
  if p_end < p_start or p_end - p_start > 60 then raise exception 'HF:invalid_dates'; end if;
  insert into public.leave_requests (hotel_id, user_id, start_date, end_date, kind, reason)
  values (v_hotel, auth.uid(), p_start, p_end, p_kind, nullif(left(btrim(coalesce(p_reason, '')), 300), ''))
  returning id into v_id;
  perform public.notify_managers(v_hotel, 'leave_requested',
    jsonb_build_object('actor', public.actor_name(), 'date', p_start, 'end', p_end, 'kind', p_kind), '/schedule?tab=leave');
  return v_id;
end $$;

create or replace function public.decide_leave(p_leave uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_req public.leave_requests;
  d date;
begin
  if not public.is_manager() then raise exception 'HF:forbidden'; end if;
  select * into v_req from public.leave_requests
   where id = p_leave and hotel_id = public.current_hotel_id() for update;
  if v_req.id is null then raise exception 'HF:not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'HF:invalid_state'; end if;

  update public.leave_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_leave;

  if p_approve then
    -- Lança a folga na escala, substituindo turnos de trabalho do período
    delete from public.shifts
     where user_id = v_req.user_id and hotel_id = v_req.hotel_id
       and shift_date between v_req.start_date and v_req.end_date
       and not exists (select 1 from public.shift_swaps s
                        where (s.requester_shift_id = shifts.id or s.target_shift_id = shifts.id)
                          and s.status in ('pending_peer', 'pending_approval'));
    d := v_req.start_date;
    while d <= v_req.end_date loop
      insert into public.shifts (hotel_id, user_id, shift_date, kind, notes, created_by)
      values (v_req.hotel_id, v_req.user_id, d,
              case when v_req.kind = 'vacation' then 'vacation' else 'off' end,
              v_req.reason, auth.uid());
      d := d + 1;
    end loop;
  end if;

  perform public.notify_user(v_req.user_id, case when p_approve then 'leave_approved' else 'leave_rejected' end,
    jsonb_build_object('actor', public.actor_name(), 'date', v_req.start_date, 'end', v_req.end_date), '/schedule?tab=leave');
end $$;

create or replace function public.cancel_leave(p_leave uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.leave_requests set status = 'cancelled'
   where id = p_leave and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'HF:invalid_state'; end if;
end $$;

create or replace function public.log_hours(
  p_user uuid, p_date date, p_minutes int, p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hotel uuid := public.current_hotel_id();
  v_target uuid := coalesce(p_user, v_uid);
  v_manager boolean := public.is_manager();
  v_id uuid;
begin
  if v_hotel is null then raise exception 'HF:no_hotel'; end if;
  if v_target <> v_uid and not v_manager then raise exception 'HF:forbidden'; end if;
  if v_target <> v_uid and not public.is_colleague(v_target) then raise exception 'HF:invalid_member'; end if;
  if p_minutes is null or p_minutes = 0 or abs(p_minutes) > 1440 then raise exception 'HF:invalid_minutes'; end if;

  insert into public.time_entries (hotel_id, user_id, entry_date, minutes, reason, status, created_by, decided_by, decided_at)
  values (v_hotel, v_target, p_date, p_minutes, nullif(left(btrim(coalesce(p_reason, '')), 300), ''),
          case when v_manager then 'approved' else 'pending' end, v_uid,
          case when v_manager then v_uid end, case when v_manager then now() end)
  returning id into v_id;

  if not v_manager then
    perform public.notify_managers(v_hotel, 'hours_logged',
      jsonb_build_object('actor', public.actor_name(), 'date', p_date, 'minutes', p_minutes), '/schedule?tab=hours');
  else
    perform public.notify_user(v_target, 'hours_approved',
      jsonb_build_object('actor', public.actor_name(), 'date', p_date, 'minutes', p_minutes), '/schedule?tab=hours');
  end if;
  return v_id;
end $$;

create or replace function public.decide_hours(p_entry uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_e public.time_entries;
begin
  if not public.is_manager() then raise exception 'HF:forbidden'; end if;
  select * into v_e from public.time_entries
   where id = p_entry and hotel_id = public.current_hotel_id() for update;
  if v_e.id is null then raise exception 'HF:not_found'; end if;
  if v_e.status <> 'pending' then raise exception 'HF:invalid_state'; end if;
  update public.time_entries
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_entry;
  perform public.notify_user(v_e.user_id, case when p_approve then 'hours_approved' else 'hours_rejected' end,
    jsonb_build_object('actor', public.actor_name(), 'date', v_e.entry_date, 'minutes', v_e.minutes), '/schedule?tab=hours');
end $$;

create or replace function public.delete_hours(p_entry uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.time_entries
   where id = p_entry and hotel_id = public.current_hotel_id()
     and ((user_id = auth.uid() and status = 'pending') or public.is_manager());
  if not found then raise exception 'HF:forbidden'; end if;
end $$;

-- Assinatura de push: o mesmo navegador pode trocar de usuário
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'HF:not_authenticated'; end if;
  if p_endpoint is null or p_endpoint not like 'https://%' then raise exception 'HF:invalid_subscription'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end $$;

-- =====================================================================
-- Conteúdo inicial de cada hotel (modelo de checklist no idioma do admin)
-- =====================================================================
create or replace function public.seed_hotel_defaults(p_hotel uuid, p_locale text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_items text[];
begin
  if exists (select 1 from public.checklist_templates where hotel_id = p_hotel) then return; end if;
  if p_locale = 'en' then
    v_name := 'Standard room cleaning';
    v_items := array['Open curtains and ventilate', 'Remove trash and used linen', 'Make the bed with fresh linen',
      'Dust furniture and surfaces', 'Clean and disinfect bathroom', 'Replace towels and amenities',
      'Check minibar and restock', 'Vacuum and mop the floor', 'Test lights, TV and A/C',
      'Check for guest belongings left behind', 'Report damages to maintenance', 'Final look and close the door'];
  elsif p_locale = 'es' then
    v_name := 'Limpieza estándar de habitación';
    v_items := array['Abrir cortinas y ventilar', 'Retirar basura y ropa de cama usada', 'Tender la cama con ropa limpia',
      'Quitar el polvo de muebles y superficies', 'Limpiar y desinfectar el baño', 'Reponer toallas y amenities',
      'Revisar y reponer el minibar', 'Aspirar y fregar el piso', 'Probar luces, TV y aire acondicionado',
      'Verificar objetos olvidados por el huésped', 'Informar daños a mantenimiento', 'Revisión final y cerrar la puerta'];
  else
    v_name := 'Arrumação padrão do quarto';
    v_items := array['Abrir cortinas e ventilar', 'Retirar lixo e enxoval usado', 'Arrumar a cama com enxoval limpo',
      'Tirar o pó de móveis e superfícies', 'Limpar e higienizar o banheiro', 'Repor toalhas e amenities',
      'Conferir e repor o frigobar', 'Aspirar e passar pano no piso', 'Testar luzes, TV e ar-condicionado',
      'Verificar objetos esquecidos pelo hóspede', 'Comunicar avarias à manutenção', 'Conferência final e fechar a porta'];
  end if;
  insert into public.checklist_templates (hotel_id, name, items)
  values (p_hotel, v_name, (select jsonb_agg(x) from unnest(v_items) as x));
end $$;

-- =====================================================================
-- Políticas RLS
-- =====================================================================
alter table public.shifts enable row level security;
alter table public.shift_swaps enable row level security;
alter table public.leave_requests enable row level security;
alter table public.time_entries enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_runs enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.lost_items enable row level security;
alter table public.guide_items enable row level security;
alter table public.phrases enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;
alter table public.service_scripts enable row level security;

-- Leitura: qualquer membro ativo do mesmo hotel
do $$
declare t text;
begin
  foreach t in array array['shifts', 'checklist_templates', 'checklist_runs', 'maintenance_tickets',
                           'ticket_comments', 'lost_items', 'guide_items', 'phrases',
                           'training_modules', 'service_scripts']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated
                    using (hotel_id = (select public.current_hotel_id()))', t || '_select', t);
  end loop;
end $$;

-- Escrita somente por gestores (conteúdo administrado)
do $$
declare t text;
begin
  foreach t in array array['checklist_templates', 'guide_items', 'phrases', 'training_modules', 'service_scripts']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (hotel_id = (select public.current_hotel_id()) and (select public.is_manager()))
                    with check (hotel_id = (select public.current_hotel_id()) and (select public.is_manager()))',
                   t || '_write', t);
  end loop;
end $$;

-- Escala: gestores criam/alteram; o colaborador precisa ser do mesmo hotel
drop policy if exists shifts_write on public.shifts;
create policy shifts_write on public.shifts for all to authenticated
  using (hotel_id = (select public.current_hotel_id()) and (select public.is_manager()))
  with check (hotel_id = (select public.current_hotel_id()) and (select public.is_manager())
              and public.is_colleague(user_id));

-- Trocas: envolvidos e gestores (escrita apenas via RPC)
drop policy if exists shift_swaps_select on public.shift_swaps;
create policy shift_swaps_select on public.shift_swaps for select to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (requester_id = (select auth.uid()) or target_id = (select auth.uid()) or (select public.is_manager())));

-- Folgas e banco de horas: o próprio colaborador e gestores (escrita via RPC)
drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests for select to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (user_id = (select auth.uid()) or (select public.is_manager())));
drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries for select to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (user_id = (select auth.uid()) or (select public.is_manager())));

-- Governança
drop policy if exists checklist_runs_insert on public.checklist_runs;
create policy checklist_runs_insert on public.checklist_runs for insert to authenticated
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists checklist_runs_update on public.checklist_runs;
create policy checklist_runs_update on public.checklist_runs for update to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (created_by = (select auth.uid()) or (select public.is_manager())))
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists checklist_runs_delete on public.checklist_runs;
create policy checklist_runs_delete on public.checklist_runs for delete to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and ((select public.is_manager()) or (created_by = (select auth.uid()) and status = 'in_progress')));

-- Manutenção: todos abrem chamados; atualizam o autor, o responsável,
-- a equipe de manutenção e os gestores
drop policy if exists maintenance_tickets_insert on public.maintenance_tickets;
create policy maintenance_tickets_insert on public.maintenance_tickets for insert to authenticated
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists maintenance_tickets_update on public.maintenance_tickets;
create policy maintenance_tickets_update on public.maintenance_tickets for update to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (created_by = (select auth.uid()) or assigned_to = (select auth.uid())
              or (select public.current_department()) = 'maintenance' or (select public.is_manager())))
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists maintenance_tickets_delete on public.maintenance_tickets;
create policy maintenance_tickets_delete on public.maintenance_tickets for delete to authenticated
  using (hotel_id = (select public.current_hotel_id()) and (select public.is_manager()));

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments for insert to authenticated
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete on public.ticket_comments for delete to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (author_id = (select auth.uid()) or (select public.is_manager())));

-- Achados e perdidos
drop policy if exists lost_items_insert on public.lost_items;
create policy lost_items_insert on public.lost_items for insert to authenticated
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists lost_items_update on public.lost_items;
create policy lost_items_update on public.lost_items for update to authenticated
  using (hotel_id = (select public.current_hotel_id()))
  with check (hotel_id = (select public.current_hotel_id()));
drop policy if exists lost_items_delete on public.lost_items;
create policy lost_items_delete on public.lost_items for delete to authenticated
  using (hotel_id = (select public.current_hotel_id()) and (select public.is_manager()));

-- Treinamento: cada um registra o próprio progresso; gestores veem a equipe
drop policy if exists training_progress_select on public.training_progress;
create policy training_progress_select on public.training_progress for select to authenticated
  using (hotel_id = (select public.current_hotel_id())
         and (user_id = (select auth.uid()) or (select public.is_manager())));
drop policy if exists training_progress_insert on public.training_progress;
create policy training_progress_insert on public.training_progress for insert to authenticated
  with check (hotel_id = (select public.current_hotel_id()) and user_id = (select auth.uid()));
drop policy if exists training_progress_update on public.training_progress;
create policy training_progress_update on public.training_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- =====================================================================
-- Privilégios
-- =====================================================================
revoke all on public.shifts, public.shift_swaps, public.leave_requests, public.time_entries,
  public.checklist_templates, public.checklist_runs, public.maintenance_tickets, public.ticket_comments,
  public.lost_items, public.guide_items, public.phrases, public.training_modules,
  public.training_progress, public.service_scripts from anon;

revoke insert, update, delete on public.shift_swaps, public.leave_requests, public.time_entries from authenticated;
grant select on public.shift_swaps, public.leave_requests, public.time_entries to authenticated;
grant select, insert, update, delete on public.shifts, public.checklist_templates, public.checklist_runs,
  public.maintenance_tickets, public.ticket_comments, public.lost_items, public.guide_items, public.phrases,
  public.training_modules, public.training_progress, public.service_scripts to authenticated;
