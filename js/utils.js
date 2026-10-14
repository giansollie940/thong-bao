// utils.js — Hàm tiện ích thuần: chuỗi, ngày tháng, lưu trữ trình duyệt, thông báo nhanh.

import {
  el
} from "./core.js";

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function dateObj(iso) {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(iso, days) {
  const d = dateObj(iso);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

export function formatDate(iso) {
  if (!iso) return "Chưa đặt ngày";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(dateObj(iso));
}

export function formatShortDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  }).format(dateObj(iso));
}

export function tone(seed = "") {
  let total = 0;
  for (const ch of String(seed)) total += ch.charCodeAt(0);
  return (total % 5) + 1;
}

export function extractDate(text, fallback) {
  const match = String(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return fallback;
  const [, d, m, y] = match;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function setMessage(node, message = "") {
  if (node) node.textContent = message;
}

export function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2300);
}

export function slugify(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `category-${Date.now()}`;
}

// "Hôm nay" / "Ngày mai" / "Còn N ngày" for events in the coming week.
export function relativeDayLabel(dateIso) {
  if (!dateIso) return null;
  const days = Math.round((Date.parse(dateIso) - Date.parse(todayIso())) / 86400000);
  if (Number.isNaN(days) || days < 0 || days > 7) return null;
  if (days === 0) return { text: "Hôm nay", tone: "today" };
  if (days === 1) return { text: "Ngày mai", tone: "soon" };
  return { text: `Còn ${days} ngày`, tone: days <= 3 ? "soon" : "later" };
}

export function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep in memory only */ }
}

export function daysFromToday(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(iso) - Date.parse(todayIso())) / 86400000);
}

export function dayMonth(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
