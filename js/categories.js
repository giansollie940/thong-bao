// categories.js — Chuyên mục: phân loại tự động, màu, quản lý chuyên mục (Admin).

import {
  $,
  client,
  contentRenderer,
  el,
  isAdmin,
  state
} from "./core.js";
import {
  loadData
} from "./data.js";
import {
  escapeHtml,
  normalizeText,
  setMessage,
  showToast,
  slugify
} from "./utils.js";

export const DEFAULT_CATEGORIES = [
  {
    slug: "study",
    name: "Học tập",
    icon: "📘",
    color: "#4f8fe8",
    keywords: ["học tập", "bài tập", "kiểm tra", "ôn tập", "thi", "môn học", "nộp bài"],
    sort_order: 10,
    active: true
  },
  {
    slug: "rules",
    name: "Nội quy",
    icon: "🛡️",
    color: "#7e72d8",
    keywords: ["nội quy", "quy định", "cam kết", "kỷ luật", "đồng phục", "nề nếp"],
    sort_order: 20,
    active: true
  },
  {
    slug: "activity",
    name: "Hoạt động",
    icon: "🎉",
    color: "#2fae9a",
    keywords: ["hoạt động", "ngoại khóa", "sự kiện", "văn nghệ", "thể thao", "trải nghiệm"],
    sort_order: 30,
    active: true
  },
  {
    slug: "youth",
    name: "Đoàn–Đội",
    icon: "🌟",
    color: "#e3a83b",
    keywords: ["đoàn", "đội", "liên đội", "chi đoàn", "đoàn trường"],
    sort_order: 40,
    active: true
  },
  {
    slug: "canteen",
    name: "Căn tin",
    icon: "🍱",
    color: "#58b985",
    keywords: ["căn tin", "ăn uống", "thực phẩm", "mua bán"],
    sort_order: 50,
    active: true
  },
  {
    slug: "urgent",
    name: "Cần lưu ý",
    icon: "🚨",
    color: "#e56b73",
    keywords: ["khẩn cấp", "gấp", "đặc biệt", "cần lưu ý", "lưu ý"],
    sort_order: 60,
    active: true
  },
  {
    slug: "general",
    name: "Thông báo chung",
    icon: "📌",
    color: "#6f8795",
    keywords: [],
    sort_order: 999,
    active: true
  }
];

export function activeCategories() {
  const source = state.categories.length ? state.categories : DEFAULT_CATEGORIES;

  return [...source]
    .filter(category => category.active !== false)
    .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
}

function categoryById(id) {
  return state.categories.find(category => category.id === id) || null;
}

export function categoryInfo(item) {
  if (item.category_id) {
    const saved = categoryById(item.category_id);
    if (saved) {
      return { key: saved.slug, ...saved };
    }
  }

  const source = normalizeText(
    `${item.category || ""} ${item.title || ""} ${contentRenderer.toPlainText(item.content || "")}`
  );

  const categories = activeCategories();
  const general =
    categories.find(category => category.slug === "general") ||
    DEFAULT_CATEGORIES.find(category => category.slug === "general");

  for (const category of categories) {
    if (category.slug === "general") continue;

    const keywords = Array.isArray(category.keywords)
      ? category.keywords
      : String(category.keywords || "")
          .split(",")
          .map(value => value.trim())
          .filter(Boolean);

    if (
      keywords.some(keyword =>
        source.includes(normalizeText(keyword))
      )
    ) {
      return { key: category.slug, ...category };
    }
  }

  return { key: general.slug, ...general };
}

export function categoryDisplayColor(category) {
  const color = String(category?.color || "").toLowerCase();

  const coolRemap = {
    "#2f80ed": "#4f8fe8",
    "#8b5cf6": "#7e72d8",
    "#f07a3e": "#2fae9a",
    "#e8a312": "#e3a83b",
    "#20a779": "#58b985",
    "#df4d62": "#e56b73",
    "#59728d": "#6f8795",

    "#fb8500": "#4f8fe8",
    "#d99a00": "#7e72d8",
    "#ff6b6b": "#2fae9a",
    "#ffb703": "#e3a83b",
    "#2fbf8f": "#58b985",
    "#e74f4f": "#e56b73",
    "#8a6a55": "#6f8795",

    "#c2410c": "#4f8fe8",
    "#a16207": "#7e72d8",
    "#be123c": "#2fae9a",
    "#b45309": "#e3a83b",
    "#3f7d58": "#58b985",
    "#b91c1c": "#e56b73",
    "#7c5c46": "#6f8795"
  };

  return coolRemap[color] || color || "#6f8795";
}

export function categoryStyle(category) {
  const color = categoryDisplayColor(category);
  return `--category-color:${escapeHtml(color)};`;
}

export function fillCategorySelect(select, selected = "auto") {
  if (!select) return;

  const options = activeCategories()
    .map(category => `
      <option value="${escapeHtml(category.id || category.slug)}">
        ${escapeHtml(category.icon || "📌")} ${escapeHtml(category.name)}
      </option>
    `)
    .join("");

  select.innerHTML = `
    <option value="auto">✨ Tự động phân loại</option>
    ${options}
  `;

  select.value = selected || "auto";
  if (select.value !== (selected || "auto")) {
    select.value = "auto";
  }
}

export function categorySelectionToPayload(value, itemForAuto = null) {
  if (!value || value === "auto") {
    if (!itemForAuto) {
      return { category_id: null, category: null };
    }

    const guessed = categoryInfo(itemForAuto);
    const dbCategory = state.categories.find(
      category => category.slug === guessed.slug
    );

    return {
      category_id: dbCategory?.id || null,
      category: guessed.name || null
    };
  }

  const category = state.categories.find(
    item => item.id === value || item.slug === value
  );

  return {
    category_id: category?.id || null,
    category: category?.name || null
  };
}

export function resetCategoryForm(category = null) {
  if (!el.categoryForm) return;

  el.categoryForm.reset();
  $("#category-id").value = category?.id || "";
  $("#category-name").value = category?.name || "";
  $("#category-icon").value = category?.icon || "📌";
  $("#category-color").value = category?.color || "#4f8fe8";
  $("#category-order").value = category?.sort_order ?? 100;
  $("#category-keywords").value = Array.isArray(category?.keywords)
    ? category.keywords.join(", ")
    : (category?.keywords || "");
  $("#category-active").checked = category ? category.active !== false : true;
  setMessage(el.categoryMessage, "");
}

function renderCategoryManager() {
  if (!el.categoryManagerList) return;

  const categories = [...state.categories]
    .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));

  el.categoryManagerList.innerHTML = categories.length
    ? categories.map(category => `
        <article
          class="category-manager-item ${category.active === false ? "inactive" : ""}"
          style="${categoryStyle(category)}"
        >
          <div class="category-manager-icon" aria-hidden="true">
            ${escapeHtml(category.icon || "📌")}
          </div>

          <div class="category-manager-info">
            <strong>${escapeHtml(category.name)}</strong>
            <small>
              ${escapeHtml((category.keywords || []).join(", ") || "Chưa có từ khóa")}
            </small>
          </div>

          <div class="category-manager-actions">
            <button
              class="mini-action"
              type="button"
              data-action="edit-category"
              data-id="${escapeHtml(category.id)}"
              aria-label="Sửa ${escapeHtml(category.name)}"
            >✏️</button>

            <button
              class="mini-action mini-danger"
              type="button"
              data-action="delete-category"
              data-id="${escapeHtml(category.id)}"
              aria-label="Xóa ${escapeHtml(category.name)}"
            >🗑️</button>
          </div>
        </article>
      `).join("")
    : '<div class="empty-state">Chưa có chuyên mục. Hãy kiểm tra schema.sql.</div>';
}

export function openCategoriesDialog() {
  if (!isAdmin()) return;

  renderCategoryManager();
  resetCategoryForm();
  el.categoryDialog.showModal();
}

export async function saveCategory(event) {
  event.preventDefault();

  if (!client || !isAdmin()) return;

  const id = $("#category-id").value;
  const name = $("#category-name").value.trim();

  if (!name) {
    setMessage(el.categoryMessage, "Hãy nhập tên chuyên mục.");
    return;
  }

  const keywords = $("#category-keywords").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const payload = {
    name,
    slug: slugify(name),
    icon: $("#category-icon").value.trim() || "📌",
    color: $("#category-color").value || "#4f8fe8",
    keywords,
    sort_order: Number($("#category-order").value) || 100,
    active: $("#category-active").checked,
    updated_at: new Date().toISOString()
  };

  setMessage(el.categoryMessage, "Đang lưu...");

  const request = id
    ? client.from("categories").update(payload).eq("id", id)
    : client.from("categories").insert(payload);

  const { error } = await request;

  if (error) {
    console.error(error);
    setMessage(
      el.categoryMessage,
      "Không lưu được chuyên mục. Có thể tên/slug đã tồn tại."
    );
    return;
  }

  await loadData();
  renderCategoryManager();
  resetCategoryForm();
  showToast(id ? "Đã cập nhật chuyên mục." : "Đã thêm chuyên mục.");
}

export async function deleteCategory(id) {
  if (!client || !isAdmin()) return;

  const category = state.categories.find(item => item.id === id);
  if (!category) return;

  const ok = confirm(
    `Xóa chuyên mục "${category.name}"? Các thông báo cũ sẽ chuyển về phân loại tự động/chung.`
  );

  if (!ok) return;

  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("Không xóa được chuyên mục.");
    return;
  }

  await loadData();
  renderCategoryManager();
  resetCategoryForm();
  showToast("Đã xóa chuyên mục.");
}
