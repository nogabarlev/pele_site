-- ============================================================
-- הרצה חד-פעמית ב-Supabase: SQL Editor -> New query -> הדביקי -> Run
-- ============================================================


-- 1. טבלאות
create table if not exists public.graphics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  thumb_url text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null,
  title text not null,
  grp text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. פונקציה שבודקת אם המשתמש המחובר הוא מנהלת (לפי טבלת profiles שכבר קיימת)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. הרשאות: כולם קוראים, רק מנהלות כותבות
alter table public.graphics enable row level security;
alter table public.videos enable row level security;

drop policy if exists "graphics read" on public.graphics;
drop policy if exists "graphics admin write" on public.graphics;
drop policy if exists "videos read" on public.videos;
drop policy if exists "videos admin write" on public.videos;

create policy "graphics read" on public.graphics for select using (true);
create policy "graphics admin write" on public.graphics for all
  using (public.is_admin()) with check (public.is_admin());

create policy "videos read" on public.videos for select using (true);
create policy "videos admin write" on public.videos for all
  using (public.is_admin()) with check (public.is_admin());

-- 4. אחסון קבצים (PDF ותמונות)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media read" on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;

create policy "media read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- 5. התוכן הקיים באתר, כדי שאפשר יהיה לערוך ולמחוק אותו מהממשק
insert into public.videos (youtube_id, title, grp, sort) values
  ('ujhiMIdZ244', 'בוחן כשג', 'גדוד הבאח', 1),
  ('POpPhjAdYKs', 'הו״ב קני - הוראות בטיחות בתומת', 'גדוד הבאח', 2),
  ('037iTWzksPw', 'הכרת הקמפוס הדיגיטלי לחניך', 'גדוד הבאח', 3),
  ('NZzyb0ioeTg', 'נוהל משקפת', 'גדוד הפיקוד', 4),
  ('Ufex5zqdMD4', 'פתיחת זיג', 'גדוד הפיקוד', 5),
  ('d_YpTFLz4Pk', 'שיעור מרגמות', 'ענף הדרכה', 6);

insert into public.graphics (title, description, file_url, thumb_url, sort) values
  ('מדבקה', 'מדבקות ליום מפקדים', 'media/files/מדבקה.pdf', 'media/graphics_background.png', 1),
  ('עלון למפקד', 'ברכה ממחט האש שבטה לסגלים', 'media/files/עלון.pdf', 'media/graphics_background.png', 2),
  ('פולדר', 'עיצוב כריכה למחברות וספרים', 'media/files/פולדר.pdf', 'media/graphics-bg-clean.png', 3),
  ('פורמט תעודת הוקרה', 'עיצוב תעודת הוקרה לחניך מצטיין, באפשרותכם להוסיף את שם החניך בהתאם', 'media/files/פורמט תעודת הוקרה.pdf', 'media/graphics_background.png', 4),
  ('שבטאון אוקטובר 2026', 'סיכום חודש אוקטובר- אירועים, טקסים והכשרות', 'media/files/שבטאון אוקטובר 2026.pdf', 'media/graphics_background.png', 5),
  ('שבטאון יולי 2026', 'סיכומי חודש יולי- אירועים, טקסים והכשרות', 'media/files/שבטאון יולי 26.pdf', 'media/graphics_background.png', 6);