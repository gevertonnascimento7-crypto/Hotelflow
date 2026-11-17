-- =====================================================================
-- HotelFlow — 003: fotos (Storage), tempo real e privilégios de funções
-- =====================================================================

-- ---------- Storage: bucket privado, uma pasta por hotel --------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hotel-files', 'hotel-files', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hotelflow files select" on storage.objects;
create policy "hotelflow files select" on storage.objects for select to authenticated
  using (bucket_id = 'hotel-files'
         and (storage.foldername(name))[1] = (select public.current_hotel_id())::text);

drop policy if exists "hotelflow files insert" on storage.objects;
create policy "hotelflow files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'hotel-files'
              and (storage.foldername(name))[1] = (select public.current_hotel_id())::text);

drop policy if exists "hotelflow files delete" on storage.objects;
create policy "hotelflow files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'hotel-files'
         and (storage.foldername(name))[1] = (select public.current_hotel_id())::text
         and ((select public.is_manager()) or owner_id = (select auth.uid())::text));

-- ---------- Realtime -------------------------------------------------
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['maintenance_tickets', 'ticket_comments', 'notifications', 'checklist_runs']
  loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Privilégios de funções ------------------------------------
-- Nada é executável por visitantes anônimos. Usuários autenticados só
-- acessam as funções de contexto (usadas pelas políticas) e as RPCs.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.current_hotel_id(),
  public.current_member_role(),
  public.current_department(),
  public.is_manager(),
  public.is_admin(),
  public.is_colleague(uuid),
  public.create_hotel(text, text),
  public.join_hotel(text, text),
  public.get_invite_code(),
  public.regenerate_invite_code(),
  public.update_member(uuid, text, text, boolean),
  public.remove_member(uuid),
  public.mark_notifications_read(uuid[]),
  public.request_swap(uuid, uuid, uuid, text),
  public.respond_swap(uuid, boolean),
  public.decide_swap(uuid, boolean, text),
  public.cancel_swap(uuid),
  public.request_leave(date, date, text, text),
  public.decide_leave(uuid, boolean),
  public.cancel_leave(uuid),
  public.log_hours(uuid, date, int, text),
  public.decide_hours(uuid, boolean),
  public.delete_hours(uuid),
  public.save_push_subscription(text, text, text, text)
to authenticated;

grant execute on all functions in schema public to service_role;

-- Novas tabelas criadas no futuro não ficam abertas para anônimos
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;
