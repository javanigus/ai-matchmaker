-- Photo upload was never assigned to any earlier phase (0-8) -- the
-- photos table has existed as an empty RLS-shell since Phase 0, but
-- no Storage bucket, no upload route, and no upload UI exist anywhere
-- yet. This is Phase 9's first real use of Supabase Storage in this
-- codebase.

-- Private bucket (not public) -- every read of another user's photo
-- goes through a server-side signed URL after an application-level
-- approved+published check (src/lib/photos.ts), never direct client
-- access. 8MB cap, well under the project-wide 50MiB default in
-- supabase/config.toml -- a profile photo doesn't need to be huge.
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 8388608)
on conflict (id) do nothing;

-- Path convention: {user_id}/{photo_id}.{ext} -- lets storage RLS
-- parse ownership straight from the path via storage.foldername,
-- same idea as every other owner-scoped table in this schema.
-- Deliberately no policy grants any OTHER user read access to
-- storage.objects here: encoding "photo is approved AND its owner is
-- published" into a storage RLS policy is fragile and hard to verify
-- by inspection. Keeping storage RLS to pure ownership and pushing
-- the approval/publish check into one server helper (getPrimaryPhotoUrls)
-- is safer and easier to audit than a cross-table storage policy.
create policy "owner can read their own photo objects"
  on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner can upload their own photo objects"
  on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner can delete their own photo objects"
  on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- photos table RLS -- owner-only read/insert/delete. Deliberately NO
-- update policy for `authenticated` at all: moderation_status
-- transitions only ever happen server-side (service-role, inside the
-- upload route, after the moderation LLM call resolves), making "a
-- client can't fake its way to approved" a DB-level guarantee rather
-- than just an API-route convention.
create policy "owner can read their own photos"
  on public.photos for select
  using (auth.uid() = user_id);

create policy "owner can insert their own photos"
  on public.photos for insert
  with check (auth.uid() = user_id);

create policy "owner can delete their own photos"
  on public.photos for delete
  using (auth.uid() = user_id);

-- Phase 10's notification enum comment already anticipates a "photo
-- moderation result" notification type -- cheap to add the reason
-- column now rather than in a follow-up migration when that's built.
alter table public.photos add column moderation_reason text;
