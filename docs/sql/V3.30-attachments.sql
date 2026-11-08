-- V3.30 — Tệp đính kèm cho thông báo.
-- Chạy MỘT LẦN trong Supabase → SQL Editor của dự án Bảng thông báo. Chạy lại cũng không sao.
-- Chỉ THÊM: 1 cột, 1 kho lưu tệp (bucket) và quyền tải lên/xóa. Không sửa hay xóa dữ liệu đang có.

begin;

-- 1) Danh sách tệp của mỗi thông báo: [{ "path", "name", "size", "type" }, ...], tối đa 10 tệp.
alter table public.announcements
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.announcements
  drop constraint if exists announcements_attachments_is_list;
alter table public.announcements
  add constraint announcements_attachments_is_list
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10);

-- 2) Kho lưu tệp: ai có đường dẫn cũng tải về được (giống ảnh thông báo), tối đa 10 MB mỗi tệp,
--    chỉ nhận PDF, Word, Excel, PowerPoint, OpenDocument, TXT/CSV và ảnh.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-files',
  'announcement-files',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) Chỉ người đã đăng nhập (Admin của bảng thông báo) được tải lên và xóa tệp.
--    Xóa tệp qua API cần thêm quyền đọc danh sách (select); người đọc tải tệp qua đường dẫn công khai.
drop policy if exists "announcement files: admin read" on storage.objects;
create policy "announcement files: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'announcement-files');

drop policy if exists "announcement files: admin upload" on storage.objects;
create policy "announcement files: admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'announcement-files');

drop policy if exists "announcement files: admin delete" on storage.objects;
create policy "announcement files: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'announcement-files');

commit;

-- Kiểm tra sau khi chạy (nên thấy 1 dòng 'announcement-files' và cột attachments):
-- select id, public, file_size_limit from storage.buckets where id = 'announcement-files';
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'announcements' and column_name = 'attachments';
