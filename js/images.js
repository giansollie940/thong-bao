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
