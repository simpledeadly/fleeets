-- Create the 'assets' bucket
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Set up security policies for the 'assets' bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'assets' );

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'assets' and auth.role() = 'authenticated' );
