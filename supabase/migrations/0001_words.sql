create table public.words (
  id             integer primary key,          -- 0..9999, used as daily index
  word           text    not null unique,
  part_of_speech text    not null,
  definition     text    not null,
  phonetic       text,
  examples       text[]  not null,
  origin         text    not null,
  created_at     timestamptz default now()
);

alter table public.words enable row level security;

create policy "public read" on public.words
  for select to anon using (true);
