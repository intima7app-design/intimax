insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Media is publicly viewable"
on storage.objects for select
using (bucket_id = 'media');

create policy "Users upload to own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own files"
on storage.objects for update to authenticated
using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own files"
on storage.objects for delete to authenticated
using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);