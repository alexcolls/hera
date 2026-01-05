-- 1. Create the 'jobs' table
create table public.jobs (
  id uuid primary key,
  created_at timestamptz not null default now(),
  status text not null,
  input jsonb not null,
  result jsonb,
  error text,
  logs jsonb default '[]'::jsonb
);

-- 2. Enable Row Level Security (RLS)
alter table public.jobs enable row level security;

-- 3. Create a policy that allows anyone to read/write jobs (For MVP only!)
-- In production, you would restrict this to the authenticated user.
create policy "Enable access for all users" on public.jobs
  for all using (true) with check (true);

-- 4. Create the 'assets' storage bucket for images/videos
insert into storage.buckets (id, name, public) 
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 5. Create storage policy to allow public uploads/downloads
create policy "Public Access" on storage.objects
  for all
  using ( bucket_id = 'assets' )
  with check ( bucket_id = 'assets' );
