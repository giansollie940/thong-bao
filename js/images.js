// images.js — Ảnh thông báo: kiểm tra, tải lên Supabase Storage, xem trước, xem ảnh lớn.

import {
  $,
  client,
  IMAGE_BUCKET,
  state
} from "./core.js";
import {
  escapeHtml,
  showToast,
  todayIso
} from "./utils.js";

function validateImageFile(file) {
  if (!file) return "";

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.";
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return "Ảnh vượt quá 5 MB.";
  }

  return "";
}

function imageExtension(file) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  return map[file?.type] || "jpg";
}

export function getImagePublicUrl(path) {
  if (!client || !path) return "";
  const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export async function uploadAnnouncementImage(file) {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);

  const randomId = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const owner = state.user?.id || "admin";
  const day = todayIso();
  const path = `${owner}/${day}/${randomId}.${imageExtension(file)}`;

  const { error } = await client.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;
  return path;
}

// Ảnh dán vào nội dung (thường là ảnh chụp màn hình PNG rất nặng): thu về tối đa
// 1600px chiều ngang và đổi sang WebP/JPEG khi cần, để vừa giới hạn 5 MB và tải nhanh.
const INLINE_MAX_WIDTH = 1600;
const INLINE_KEEP_BYTES = 1.5 * 1024 * 1024;

async function prepareInlineImage(file) {
  const keepAsIs = ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= INLINE_KEEP_BYTES;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (keepAsIs) return file;
    throw new Error("Không đọc được ảnh vừa dán.");
  }

  const scale = Math.min(1, INLINE_MAX_WIDTH / bitmap.width);
  if (keepAsIs && scale === 1) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const type of ["image/webp", "image/jpeg"]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.85));
    if (blob?.type === type) return new File([blob], `pasted.${imageExtension({ type })}`, { type });
  }
  throw new Error("Không nén được ảnh vừa dán.");
}

// Tải ảnh dán vào nội dung lên cùng bucket ảnh thông báo; trả về địa chỉ công khai.
export async function uploadInlineImage(file) {
  if (!client) throw new Error("Chưa kết nối Supabase nên chưa dán ảnh được.");
  const path = await uploadAnnouncementImage(await prepareInlineImage(file));
  const url = getImagePublicUrl(path);
  if (!url) throw new Error("Không lấy được địa chỉ ảnh sau khi tải lên.");
  return url;
}

export async function removeStorageImage(path) {
  if (!client || !path) return;
  const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) console.error("Không xóa được ảnh Storage:", error);
}

export async function cleanupImageIfUnused(path, excludedIds = []) {
  if (!path) return;

  const excluded = new Set(excludedIds.filter(Boolean));
  const stillUsed = state.announcements.some(
    item => item.image_path === path && !excluded.has(item.id)
  );

  if (!stillUsed) {
    await removeStorageImage(path);
  }
}

export function clearImagePreview(container) {
  if (!container) return;

  if (container.dataset.objectUrl) {
    URL.revokeObjectURL(container.dataset.objectUrl);
    delete container.dataset.objectUrl;
  }

  container.innerHTML = "";
  container.classList.add("hidden");
}

export function showImagePreview(container, src, alt = "", label = "") {
  if (!container || !src) {
    clearImagePreview(container);
    return;
  }

  container.innerHTML = `
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
    ${label ? `<span>${escapeHtml(label)}</span>` : ""}
  `;
  container.classList.remove("hidden");
}

export function previewSelectedFile(input, container, altInput) {
  clearImagePreview(container);

  const file = input?.files?.[0];
  if (!file) return;

  const validation = validateImageFile(file);
  if (validation) {
    input.value = "";
    showToast(validation);
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  container.dataset.objectUrl = objectUrl;
  showImagePreview(container, objectUrl, altInput?.value || "Ảnh xem trước", "Ảnh mới");
}

export function openImageViewer(id) {
  const item = state.announcements.find(x => x.id === id);
  if (!item?.image_path) return;

  const url = getImagePublicUrl(item.image_path);
  if (!url) return;

  $("#image-dialog-title").textContent = item.title;
  $("#image-dialog-image").src = url;
  $("#image-dialog-image").alt = item.image_alt || item.title;
  $("#image-dialog-caption").textContent = item.image_alt || item.title;
  $("#image-dialog").showModal();
}
