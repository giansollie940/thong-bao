// admin.js — Thao tác Admin: trình soạn thảo, form thông báo/tuần/nhập nhanh/năm học, lưu và xóa.

import {
  categorySelectionToPayload,
  fillCategorySelect
} from "./categories.js";
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
  cleanupImageIfUnused,
  clearImagePreview,
  getImagePublicUrl,
  removeStorageImage,
  showImagePreview,
  uploadAnnouncementImage
} from "./images.js";
import {
  addDays,
  dateObj,
  escapeHtml,
  extractDate,
  formatDate,
  formatShortDate,
  setMessage,
  showToast,
  todayIso
} from "./utils.js";
import {
  applyWeekDefaults,
  defaultEventDate,
  fillWeekSelect,
  getSchoolYearGroups,
  getSelectedWeek,
  sortedWeeks
} from "./weeks.js";

let announcementEditor = null;

let announcementFormatting = null;

let announcementFindReplace = null;

// Rich editor, formatting toolbar and find & replace for the announcement form.
export function initEditors() {
  announcementEditor =
    window.WeeklyRichEditor?.create({
      root: $("#announcement-rich-editor"),
      renderer: contentRenderer,
      onToast: showToast
    });

  if (!announcementEditor) {
    throw new Error("Không khởi tạo được rich editor.");
  }

  announcementFormatting =
    window.WeeklyEditorFormatting?.create({
      root: $("#announcement-rich-editor"),
      editor: announcementEditor,
      onToast: showToast
    });

  if (!announcementFormatting) {
    throw new Error(
      "Không khởi tạo được Formatting Toolbar."
    );
  }

  announcementFindReplace =
    window.WeeklyFindReplace?.create({
      root: $("#announcement-rich-editor"),
      onToast: showToast
    });

  if (!announcementFindReplace) {
    throw new Error("Không khởi tạo được Find & Replace.");
  }
}

function parseQuickInput(raw = "") {
  const source = String(raw).replace(/\r\n/g, "\n").trim();
  const matches = [...source.matchAll(/^#{3,4}\s*(.+)$/gm)];
  if (!matches.length) return [];

  return matches.map((match, i) => {
    const next = matches[i + 1];
    const title = match[1].replace(/^\d+\.\s*/, "").trim();
    const start = match.index + match[0].length;
    const end = next ? next.index : source.length;
    const content = source.slice(start, end)
      .replace(/^\s*---+\s*$/gm, "")
      .trim();
    return { title, content };
  }).filter(x => x.title && x.content);
}

export function openAnnouncementForm(item = null) {
  if (!isAdmin()) return;

  if (!state.weeks.length) {
    showToast("Hãy tạo lịch tuần trước.");
    return;
  }

  el.announcementForm.reset();
  setMessage(el.announcementMessage, "");

  const targetWeekId = item?.week_id || state.currentWeek?.id || sortedWeeks()[0]?.id || "";
  fillWeekSelect($("#announcement-week"), targetWeekId);

  const targetWeek = state.weeks.find(w => w.id === targetWeekId) || state.currentWeek;

  $("#announcement-id").value = item?.id || "";
  $("#announcement-title").value = item?.title || "";
  $("#announcement-date").value =
    item?.event_date || (targetWeek ? defaultEventDate(targetWeek) : todayIso());
  $("#announcement-valid-from").value =
    item?.valid_from || targetWeek?.start_date || todayIso();
  $("#announcement-valid-until").value =
    item?.valid_until || targetWeek?.end_date || todayIso();
  fillCategorySelect(
    $("#announcement-category-select"),
    item?.category_id || "auto"
  );
  $("#announcement-category").value = item?.category || "";
  $("#announcement-priority").value = item?.priority || "normal";
  $("#announcement-pinned").checked = Boolean(item?.is_pinned);
  const storedContent = item?.content || "";
  const storedMode =
    contentRenderer.getStoredMode(storedContent);
  const editorSource =
    contentRenderer.getEditorContent(storedContent);

  const editorHtml = storedMode === "html"
    ? contentRenderer.sanitizeHtml(editorSource)
    : contentRenderer.renderMarkdown(editorSource);

  announcementEditor.setHtml(
    editorHtml,
    {
      view: "visual",
      focus: false
    }
  );

  announcementFormatting?.reset();
  announcementFindReplace?.reset();
  $("#announcement-image-alt").value = item?.image_alt || item?.title || "";
  $("#announcement-remove-image").checked = false;

  const preview = $("#announcement-image-preview");
  const removeRow = $("#announcement-remove-image-row");

  if (item?.image_path) {
    showImagePreview(
      preview,
      getImagePublicUrl(item.image_path),
      item.image_alt || item.title,
      "Ảnh hiện tại"
    );
    removeRow.classList.remove("hidden");
  } else {
    clearImagePreview(preview);
    removeRow.classList.add("hidden");
  }

  el.announcementDialogTitle.textContent = item ? "Sửa thông báo" : "Đăng thông báo mới";
  el.announcementDialog.showModal();
}

export async function saveAnnouncement(event) {
  event.preventDefault();

  if (!client || !isAdmin()) {
    setMessage(el.announcementMessage, "Bạn chưa đăng nhập quản trị.");
    return;
  }

  const targetWeek = getSelectedWeek("#announcement-week");
  if (!targetWeek) {
    setMessage(el.announcementMessage, "Hãy chọn đúng tuần cần đăng.");
    return;
  }

  const validFrom = $("#announcement-valid-from").value;
  const validUntil = $("#announcement-valid-until").value;

  if (!validFrom || !validUntil || validUntil < validFrom) {
    setMessage(el.announcementMessage, "Thời gian hiệu lực chưa hợp lệ.");
    return;
  }

  const id = $("#announcement-id").value;
  const existing = state.announcements.find(item => item.id === id) || null;
  const title = $("#announcement-title").value.trim();
  const rawEditorContent =
    announcementEditor.getHtml().trim();

  const cleanedEditorContent =
    contentRenderer.sanitizeHtml(rawEditorContent);

  if (!cleanedEditorContent) {
    setMessage(
      el.announcementMessage,
      "Nội dung trống hoặc chỉ chứa HTML không được phép."
    );
    return;
  }

  const storedContent =
    contentRenderer.serializeEditorContent(
      cleanedEditorContent,
      "html"
    );

  const categoryContent =
    contentRenderer.toPlainText(
      cleanedEditorContent,
      "html"
    );

  const newFile = $("#announcement-image").files?.[0] || null;
  const removeCurrent = $("#announcement-remove-image").checked;

  let imagePath = existing?.image_path || null;
  let uploadedPath = null;

  try {
    if (newFile) {
      setMessage(el.announcementMessage, "Đang tải ảnh lên...");
      uploadedPath = await uploadAnnouncementImage(newFile);
      imagePath = uploadedPath;
    } else if (removeCurrent) {
      imagePath = null;
    }
  } catch (error) {
    console.error(error);
    setMessage(
      el.announcementMessage,
      error?.message || "Không tải được ảnh. Hãy kiểm tra Storage."
    );
    return;
  }

  const imageAlt = imagePath
    ? ($("#announcement-image-alt").value.trim() || title)
    : null;

  const payload = {
    week_id: targetWeek.id,
    title,
    content: storedContent,
    ...categorySelectionToPayload(
      $("#announcement-category-select").value,
      {
        title,
        content: categoryContent,
        category: $("#announcement-category").value.trim()
      }
    ),
    event_date: $("#announcement-date").value,
    valid_from: validFrom,
    valid_until: validUntil,
    image_path: imagePath,
    image_alt: imageAlt,
    priority: $("#announcement-priority").value,
    is_pinned: $("#announcement-pinned").checked,
    updated_at: new Date().toISOString()
  };

  setMessage(el.announcementMessage, "Đang lưu...");

  const request = id
    ? client.from("announcements").update(payload).eq("id", id)
    : client.from("announcements").insert(payload);

  const { error } = await request;

  if (error) {
    console.error(error);
    if (uploadedPath) await removeStorageImage(uploadedPath);
    setMessage(
      el.announcementMessage,
      "Không lưu được. Hãy kiểm tra kết nối Supabase, Storage và quyền RLS."
    );
    return;
  }

  if (existing?.image_path && existing.image_path !== imagePath) {
    await cleanupImageIfUnused(existing.image_path, [existing.id]);
  }

  clearImagePreview($("#announcement-image-preview"));
  el.announcementDialog.close();
  await loadData();
  showToast(`${id ? "Đã cập nhật" : "Đã đăng"} vào Tuần ${targetWeek.week_number}.`);
}

export async function deleteAnnouncement(id) {
  if (!client || !isAdmin()) return;

  const item = state.announcements.find(x => x.id === id);
  if (!item) return;

  if (!confirm("Bạn chắc chắn muốn xóa thông báo này?")) return;

  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) {
    console.error(error);
    showToast("Không xóa được thông báo.");
    return;
  }

  if (item.image_path) {
    await cleanupImageIfUnused(item.image_path, [id]);
  }

  await loadData();
  showToast("Đã xóa thông báo.");
}

export function openWeekForm(week = null) {
  if (!isAdmin()) return;

  el.weekForm.reset();
  setMessage(el.weekMessage, "");

  $("#week-id").value = week?.id || "";
  $("#week-number").value = week?.week_number || "";
  $("#week-title").value = week?.title || "";
  $("#week-school-year").value = week?.school_year || "";
  $("#week-start").value = week?.start_date || "";
  $("#week-end").value = week?.end_date || "";
  $("#week-summary").value = week?.summary || "";
  $("#week-current").checked = week ? week.status === "current" : true;

  el.weekDialogTitle.textContent = week ? `Sửa Tuần ${week.week_number}` : "Tạo một tuần";
  el.weekDialog.showModal();
}

export async function saveWeek(event) {
  event.preventDefault();

  if (!client || !isAdmin()) {
    setMessage(el.weekMessage, "Bạn chưa đăng nhập quản trị.");
    return;
  }

  const id = $("#week-id").value;
  const start = $("#week-start").value;
  const end = $("#week-end").value;
  const makeCurrent = $("#week-current").checked;

  if (dateObj(end) < dateObj(start)) {
    setMessage(el.weekMessage, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
    return;
  }

  if (makeCurrent) {
    let query = client.from("weeks")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("status", "current");
    if (id) query = query.neq("id", id);

    const { error } = await query;
    if (error) {
      setMessage(el.weekMessage, "Không thể cập nhật tuần hiện tại.");
      return;
    }
  }

  const payload = {
    week_number: $("#week-number").value.trim(),
    title: $("#week-title").value.trim() || null,
    school_year: $("#week-school-year").value.trim() || null,
    start_date: start,
    end_date: end,
    summary: $("#week-summary").value.trim() || null,
    status: makeCurrent ? "current" : "archived",
    updated_at: new Date().toISOString()
  };

  const request = id
    ? client.from("weeks").update(payload).eq("id", id)
    : client.from("weeks").insert(payload);

  const { error } = await request;

  if (error) {
    console.error(error);
    setMessage(el.weekMessage, "Không lưu được tuần. Hãy chạy migration V2 nếu chưa chạy.");
    return;
  }

  el.weekDialog.close();
  await loadData();
  showToast(id ? "Đã cập nhật tuần." : "Đã tạo tuần.");
}

export function openBulkDialog() {
  if (!isAdmin()) return;

  if (!state.weeks.length) {
    showToast("Hãy tạo lịch tuần trước.");
    return;
  }

  el.bulkForm.reset();
  setMessage(el.bulkMessage, "");
  el.bulkPreviewCount.textContent = "Chưa có mục nào";
  clearImagePreview($("#bulk-image-preview"));

  const targetWeekId = state.currentWeek?.id || sortedWeeks()[0]?.id || "";
  fillWeekSelect($("#bulk-week"), targetWeekId);
  fillCategorySelect($("#bulk-category-select"), "auto");
  applyWeekDefaults("bulk");

  el.bulkDialog.showModal();
}

export function previewBulk() {
  const items = parseQuickInput($("#bulk-raw").value);
  el.bulkPreviewCount.textContent = items.length
    ? `Đã nhận diện ${items.length} thông báo`
    : "Chưa nhận diện được mục nào";
}

export async function saveBulk(event) {
  event.preventDefault();

  if (!client || !isAdmin()) return;

  const targetWeek = getSelectedWeek("#bulk-week");
  if (!targetWeek) {
    setMessage(el.bulkMessage, "Hãy chọn tuần cần đăng.");
    return;
  }

  const items = parseQuickInput($("#bulk-raw").value);
  if (!items.length) {
    setMessage(el.bulkMessage, "Mỗi mục cần bắt đầu bằng ### hoặc ####.");
    return;
  }

  const validFrom = $("#bulk-valid-from").value;
  const validUntil = $("#bulk-valid-until").value;

  if (!validFrom || !validUntil || validUntil < validFrom) {
    setMessage(el.bulkMessage, "Thời gian hiệu lực chưa hợp lệ.");
    return;
  }

  const fallbackDate = $("#bulk-date").value;
  const categorySelection = $("#bulk-category-select").value;
  const priority = $("#bulk-priority").value;
  const pinFirst = $("#bulk-pin-first").checked;
  const imageFile = $("#bulk-image").files?.[0] || null;
  const imageAlt = $("#bulk-image-alt").value.trim() || null;

  let uploadedPath = null;

  if (imageFile) {
    try {
      setMessage(el.bulkMessage, "Đang tải ảnh chung lên...");
      uploadedPath = await uploadAnnouncementImage(imageFile);
    } catch (error) {
      console.error(error);
      setMessage(el.bulkMessage, error?.message || "Không tải được ảnh.");
      return;
    }
  }

  const payload = items.map((item, index) => ({
    week_id: targetWeek.id,
    title: item.title,
    content: item.content,
    ...categorySelectionToPayload(
      categorySelection,
      {
        title: item.title,
        content: item.content,
        category: ""
      }
    ),
    event_date: extractDate(item.content, fallbackDate),
    valid_from: validFrom,
    valid_until: validUntil,
    image_path: uploadedPath,
    image_alt: uploadedPath ? (imageAlt || item.title) : null,
    priority,
    is_pinned: pinFirst && index === 0,
    updated_at: new Date().toISOString()
  }));

  setMessage(el.bulkMessage, `Đang tạo ${payload.length} thông báo cho Tuần ${targetWeek.week_number}...`);

  const { error } = await client.from("announcements").insert(payload);

  if (error) {
    console.error(error);
    if (uploadedPath) await removeStorageImage(uploadedPath);
    setMessage(el.bulkMessage, "Không tạo được danh sách. Hãy chạy migration-v2-4.sql.");
    return;
  }

  clearImagePreview($("#bulk-image-preview"));
  el.bulkDialog.close();
  await loadData();
  showToast(`Đã tạo ${payload.length} thông báo tại Tuần ${targetWeek.week_number}.`);
}

export function openSchoolYear() {
  if (!isAdmin()) return;

  el.schoolYearForm.reset();
  state.schoolYearPreview = [];
  el.schoolYearPreview.innerHTML = "";
  el.schoolYearPreviewSummary.textContent = "Chưa tạo bản xem trước.";
  setMessage(el.schoolYearMessage, "");

  $("#school-year-start-number").value = "01";
  $("#school-year-count-input").value = "35";
  el.schoolYearDialog.showModal();
}

export function generateSchoolYearPreview() {
  setMessage(el.schoolYearMessage, "");

  const schoolYear = $("#school-year-name").value.trim();
  const startRaw = $("#school-year-start-number").value.trim();
  const firstStart = $("#school-year-first-start").value;
  const firstEnd = $("#school-year-first-end").value;
  const count = Number($("#school-year-count-input").value);
  const titlePrefix = $("#school-year-title-prefix").value.trim();

  if (!schoolYear || !startRaw || !firstStart || !firstEnd || !count) {
    setMessage(el.schoolYearMessage, "Hãy nhập đủ thông tin.");
    return [];
  }

  if (dateObj(firstEnd) < dateObj(firstStart)) {
    setMessage(el.schoolYearMessage, "Ngày kết thúc tuần đầu không hợp lệ.");
    return [];
  }

  if (count < 1 || count > 60) {
    setMessage(el.schoolYearMessage, "Số tuần phải từ 1 đến 60.");
    return [];
  }

  const numeric = /^\d+$/.test(startRaw);
  const startNumber = Number(startRaw);
  const width = Math.max(2, startRaw.length);

  const preview = Array.from({ length: count }, (_, index) => {
    const weekNumber = numeric
      ? String(startNumber + index).padStart(width, "0")
      : index === 0 ? startRaw : `${startRaw}-${index + 1}`;

    return {
      week_number: weekNumber,
      title: titlePrefix ? `${titlePrefix} ${weekNumber}` : `Tuần ${weekNumber}`,
      school_year: schoolYear,
      sequence_number: numeric ? startNumber + index : index + 1,
      start_date: addDays(firstStart, index * 7),
      end_date: addDays(firstEnd, index * 7),
      summary: null,
      status: "archived"
    };
  });

  state.schoolYearPreview = preview;

  el.schoolYearPreviewSummary.textContent =
    `${preview.length} tuần · ${formatDate(preview[0].start_date)} → ${formatDate(preview.at(-1).end_date)}`;

  el.schoolYearPreview.innerHTML = preview.map(week => `
    <div class="week-preview-item">
      <strong>Tuần ${escapeHtml(week.week_number)}</strong>
      <small>${formatShortDate(week.start_date)} → ${formatShortDate(week.end_date)}</small>
    </div>`).join("");

  return preview;
}

function overlappingSchoolYearGroups(preview) {
  if (!preview?.length) return [];

  const start = preview[0].start_date;
  const end = preview.at(-1).end_date;
  const candidateYear = preview[0].school_year;

  return getSchoolYearGroups().filter(group =>
    group.key !== candidateYear &&
    start <= group.end_date &&
    end >= group.start_date
  );
}

export async function saveSchoolYear(event) {
  event.preventDefault();

  if (!client || !isAdmin()) return;

  const preview = generateSchoolYearPreview();
  if (!preview.length) return;

  const overlappingGroups = overlappingSchoolYearGroups(preview);
  if (overlappingGroups.length) {
    setMessage(
      el.schoolYearMessage,
      `Năm học mới bị chồng ngày với ${overlappingGroups.map(group => group.label).join(", ")}. Hãy điều chỉnh ngày bắt đầu/kết thúc.`
    );
    return;
  }

  const duplicates = preview.filter(candidate =>
    state.weeks.some(existing =>
      existing.school_year === candidate.school_year &&
      (
        existing.week_number === candidate.week_number ||
        existing.sequence_number === candidate.sequence_number ||
        existing.start_date === candidate.start_date
      )
    )
  );

  if (duplicates.length) {
    setMessage(
      el.schoolYearMessage,
      `Có ${duplicates.length} tuần bị trùng với lịch đã có. Hãy kiểm tra lịch cũ trước.`
    );
    return;
  }

  const today = todayIso();
  const currentIndex = preview.findIndex(w => today >= w.start_date && today <= w.end_date);

  if (currentIndex >= 0) {
    preview[currentIndex].status = "current";
    const { error } = await client.from("weeks")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("status", "current");

    if (error) {
      setMessage(el.schoolYearMessage, "Không thể chuẩn bị trạng thái tuần hiện tại.");
      return;
    }
  }

  setMessage(el.schoolYearMessage, `Đang tạo ${preview.length} tuần...`);

  const payload = preview.map(w => ({
    ...w,
    updated_at: new Date().toISOString()
  }));

  const { error } = await client.from("weeks").insert(payload);

  if (error) {
    console.error(error);
    setMessage(el.schoolYearMessage, "Không tạo được lịch. Hãy chạy migration-v2.sql rồi thử lại.");
    return;
  }

  const schoolYear = preview[0].school_year;
  state.activeSchoolYear = schoolYear;
  state.yearFilter = state.activeSchoolYear;
  state.archiveYearFilter = state.activeSchoolYear;
  el.schoolYearDialog.close();
  await loadData();
  showToast(`Đã tạo ${preview.length} tuần cho năm học ${schoolYear}.`);
}

export async function deleteWeek(id) {
  if (!client || !isAdmin()) return;

  const week = state.weeks.find(w => w.id === id);
  if (!week) return;

  const weekItems = state.announcements.filter(item => item.week_id === id);
  const itemCount = weekItems.length;
  const detail = itemCount
    ? `\n\nTuần này đang có ${itemCount} thông báo. Khi xóa tuần, các thông báo thuộc tuần cũng sẽ bị xóa.`
    : "";

  const ok = window.confirm(
    `Bạn chắc chắn muốn xóa Tuần ${week.week_number} (${formatDate(week.start_date)} — ${formatDate(week.end_date)})?${detail}\n\nThao tác này không thể hoàn tác.`
  );

  if (!ok) return;

  const removedIds = weekItems.map(item => item.id);
  const imagePaths = [...new Set(
    weekItems.map(item => item.image_path).filter(Boolean)
  )];

  const { error } = await client.from("weeks").delete().eq("id", id);

  if (error) {
    console.error(error);
    showToast("Không xóa được tuần. Hãy kiểm tra quyền RLS.");
    return;
  }

  for (const path of imagePaths) {
    await cleanupImageIfUnused(path, removedIds);
  }

  await loadData();
  showToast(`Đã xóa Tuần ${week.week_number}.`);
}

export async function copyAnnouncement(id) {
  const item = state.announcements.find(x => x.id === id);
  if (!item) return;

  const week = state.weeks.find(w => w.id === item.week_id);
  const text = [
    item.title,
    `Ngày: ${formatDate(item.event_date)}`,
    week ? `Tuần: ${week.week_number}` : "",
    item.category ? `Chuyên mục: ${item.category}` : "",
    item.image_path ? `Ảnh: ${getImagePublicUrl(item.image_path)}` : "",
    "",
    contentRenderer.toPlainText(item.content)
  ].filter(Boolean).join("\n");

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }

  showToast("Đã sao chép thông báo.");
}
