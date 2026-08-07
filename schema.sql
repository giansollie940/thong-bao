-- ==========================================================
-- BẢNG THÔNG BÁO THEO TUẦN - SUPABASE SCHEMA V1
-- Chạy toàn bộ file này trong Supabase -> SQL Editor.
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  week_number text not null,
  title text,
  start_date date not null,
  end_date date not null,
  summary text,
  status text not null default 'archived'
    check (status in ('current', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weeks_date_order check (end_date >= start_date)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  content text not null,
  category text,
  event_date date not null,
  priority text not null default 'normal'
    check (priority in ('normal', 'important')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weeks_status_idx
  on public.weeks(status);

create index if not exists weeks_start_date_idx
  on public.weeks(start_date desc);

create index if not exists announcements_week_id_idx
  on public.announcements(week_id);

create index if not exists announcements_event_date_idx
  on public.announcements(event_date desc);

-- Chỉ cho phép tối đa 1 tuần có trạng thái current.
create unique index if not exists one_current_week_idx
  on public.weeks ((status))
  where status = 'current';

-- ----------------------------
-- Row Level Security
-- ----------------------------
alter table public.weeks enable row level security;
alter table public.announcements enable row level security;

-- Khách và người đã đăng nhập đều được đọc.
drop policy if exists "Public can read weeks" on public.weeks;
create policy "Public can read weeks"
on public.weeks
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read announcements" on public.announcements;
create policy "Public can read announcements"
on public.announcements
for select
to anon, authenticated
using (true);

-- Bản V1 giả định dự án chỉ có 1 tài khoản Auth duy nhất:
-- tài khoản quản trị của bạn. Hãy TẮT đăng ký công khai trong Supabase.
drop policy if exists "Authenticated can insert weeks" on public.weeks;
create policy "Authenticated can insert weeks"
on public.weeks
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated can update weeks" on public.weeks;
create policy "Authenticated can update weeks"
on public.weeks
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated can delete weeks" on public.weeks;
create policy "Authenticated can delete weeks"
on public.weeks
for delete
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Authenticated can insert announcements" on public.announcements;
create policy "Authenticated can insert announcements"
on public.announcements
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated can update announcements" on public.announcements;
create policy "Authenticated can update announcements"
on public.announcements
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated can delete announcements" on public.announcements;
create policy "Authenticated can delete announcements"
on public.announcements
for delete
to authenticated
using ((select auth.uid()) is not null);

-- Cấp quyền Data API tối thiểu sau khi đã bật RLS.
grant select on table public.weeks to anon;
grant select on table public.announcements to anon;

grant select, insert, update, delete on table public.weeks to authenticated;
grant select, insert, update, delete on table public.announcements to authenticated;

-- ----------------------------------------------------------
-- DỮ LIỆU MẪU (TÙY CHỌN)
-- Bỏ comment để tạo tuần đầu tiên sau khi chạy schema.
-- ----------------------------------------------------------
-- insert into public.weeks
--   (week_number, title, start_date, end_date, summary, status)
-- values
--   ('01', 'Tuần đầu tiên', current_date, current_date + 6,
--    'Tuần khởi động của bảng thông báo.', 'current');
