alter table public.posts
  add column if not exists aspect_ratio text not null default '1:1',
  add column if not exists media_position text;