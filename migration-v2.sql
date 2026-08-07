-- ==========================================================
-- MIGRATION V2 - BẢNG THÔNG BÁO THEO TUẦN
-- Chạy 1 lần trong Supabase -> SQL Editor.
-- Không xóa dữ liệu V1.
-- ==========================================================

alter table public.weeks
  add column if not exists school_year text;

alter table public.weeks
  add column if not exists sequence_number integer;

create index if not exists weeks_school_year_idx
  on public.weeks(school_year);

create index if not exists weeks_sequence_number_idx
  on public.weeks(sequence_number);

grant select on table public.weeks to anon;
grant select, insert, update, delete on table public.weeks to authenticated;

-- V2 sẽ tự xác định tuần hiện tại dựa trên start_date / end_date.
-- Cột status cũ vẫn được giữ để tương thích với V1.
