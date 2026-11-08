// attachments.js — Tệp đính kèm của thông báo (PDF, Word, Excel, PowerPoint, ảnh, TXT/CSV).
// Tệp nằm ở bucket `announcement-files`; danh sách {path, name, size, type} lưu trong cột
// announcements.attachments (jsonb). Khi database chưa có cột này, tính năng tự ẩn.

import {
  client,
  state
} from "./core.js";
import {
  escapeHtml,
  todayIso
} from "./utils.js";

export const ATTACHMENT_BUCKET = "announcement-files";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

// Đuôi tệp → loại MIME lưu lên Storage (trùng danh sách cho phép của bucket) và biểu tượng.
const FILE_TYPES = {
  pdf: { type: "application/pdf", icon: "📕", label: "PDF" },
  doc: { type: "application/msword", icon: "📘", label: "Word" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", icon: "📘", label: "Word" },
  odt: { type: "application/vnd.oasis.opendocument.text", icon: "📘", label: "Văn bản" },
  xls: { type: "application/vnd.ms-excel", icon: "📗", label: "Excel" },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", icon: "📗", label: "Excel" },
  ods: { type: "application/vnd.oasis.opendocument.spreadsheet", icon: "📗", label: "Bảng tính" },
  csv: { type: "text/csv", icon: "📗", label: "CSV" },
  ppt: { type: "application/vnd.ms-powerpoint", icon: "📙", label: "PowerPoint" },
  pptx: { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", icon: "📙", label: "PowerPoint" },
  odp: { type: "application/vnd.oasis.opendocument.presentation", icon: "📙", label: "Trình chiếu" },
  txt: { type: "text/plain", icon: "📄", label: "Văn bản" },
  jpg: { type: "image/jpeg", icon: "🖼️", label: "Ảnh" },
  jpeg: { type: "image/jpeg", icon: "🖼️", label: "Ảnh" },
  png: { type: "image/png", icon: "🖼️", label: "Ảnh" },
  webp: { type: "image/webp", icon: "🖼️", label: "Ảnh" },
  gif: { type: "image/gif", icon: "🖼️", label: "Ảnh" }
};

export const ATTACHMENT_ACCEPT = Object.keys(FILE_TYPES).map(ext => `.${ext}`).join(",");

function extensionOf(name = "") {
  const match = /\.([a-z0-9]+)$/i.exec(String(name).trim());
  return match ? match[1].toLowerCase() : "";
}

function fileTypeOf(name) {
  return FILE_TYPES[extensionOf(name)] || null;
}

/** Trả về câu báo lỗi (tiếng Việt) hoặc "" nếu tệp hợp lệ. */
export function validateAttachment(file) {
  if (!file) return "Không đọc được tệp.";
  if (!fileTypeOf(file.name)) return `${file.name}: loại tệp này không được hỗ trợ.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name}: vượt quá 10 MB.`;
  if (file.size === 0) return `${file.name}: tệp trống.`;
  return "";
}

/** Danh sách tệp của một thông báo, bỏ qua dữ liệu không hợp lệ. */
export function attachmentsOf(item) {
  const list = Array.isArray(item?.attachments) ? item.attachments : [];
  return list.filter(entry => entry && typeof entry.path === "string" && entry.path && typeof entry.name === "string");
}

export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** Khóa Storage chỉ dùng ký tự ASCII; tên gốc (có dấu) được giữ trong danh sách tệp. */
export function storageSafeName(name = "") {
  const ext = extensionOf(name);
  const base = String(name).replace(/\.[^.]*$/, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "tep";
  return ext ? `${base}.${ext}` : base;
}

function publicUrl(path, download = "") {
  if (!client || !path) return "";
  const options = download ? { download } : undefined;
  const { data } = client.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path, options);
  return data?.publicUrl || "";
}

export function attachmentListHtml(item) {
  const files = attachmentsOf(item);
  if (!files.length) return "";

  return `
    <section class="attachment-list" aria-label="Tệp đính kèm">
      <h4>📎 Tệp đính kèm (${files.length})</h4>
      <ul>
        ${files.map(entry => {
          const kind = fileTypeOf(entry.name);
          const url = publicUrl(entry.path);
          const download = publicUrl(entry.path, entry.name);
          return `
            <li class="attachment-item">
              <span class="attachment-icon" aria-hidden="true">${kind?.icon || "📄"}</span>
              <a class="attachment-open" href="${escapeHtml(url)}" target="_blank" rel="noopener">
                <span class="attachment-name">${escapeHtml(entry.name)}</span>
                <small>${escapeHtml(kind?.label || "Tệp")} · ${escapeHtml(formatFileSize(entry.size))}</small>
              </a>
              <a class="attachment-download" href="${escapeHtml(download)}" aria-label="Tải về ${escapeHtml(entry.name)}">⬇ Tải về</a>
            </li>`;
        }).join("")}
      </ul>
    </section>`;
}

export function attachmentCountHtml(item) {
  const count = attachmentsOf(item).length;
  return count ? `<span class="vm-row-files" title="${count} tệp đính kèm">📎 ${count}</span>` : "";
}

export async function uploadAttachment(file) {
  const message = validateAttachment(file);
  if (message) throw new Error(message);

  const randomId = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${state.user?.id || "admin"}/${todayIso()}/${randomId}-${storageSafeName(file.name)}`;
  const type = fileTypeOf(file.name).type;

  const { error } = await client.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: type });
  if (error) throw new Error(`${file.name}: không tải lên được (${error.message || "lỗi Storage"}).`);

  return { path, name: file.name, size: file.size, type };
}

export async function removeAttachmentFiles(paths = []) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!client || !list.length) return;
  const { error } = await client.storage.from(ATTACHMENT_BUCKET).remove(list);
  if (error) console.error("Không xóa được tệp đính kèm:", error);
}

/** Có cột announcements.attachments chưa? Chưa có thì ẩn tính năng để việc đăng bài vẫn chạy. */
export async function detectAttachmentSupport(rows) {
  if (!client) return false;
  if (rows?.length) return rows.some(row => Object.prototype.hasOwnProperty.call(row, "attachments"));
  const { error } = await client.from("announcements").select("attachments").limit(1);
  return !error;
}
