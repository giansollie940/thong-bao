// weeks.js — Tuần và năm học: tuần đang hiển thị, thông báo của tuần, ô chọn tuần/năm học.

import {
  $,
  state
} from "./core.js";
import {
  addDays,
  dateObj,
  escapeHtml,
  formatDate,
  todayIso
} from "./utils.js";

export function weekState(week, today = todayIso()) {
  if (!week) return "none";
  if (today >= week.start_date && today <= week.end_date) return "current";
  return today < week.start_date ? "upcoming" : "past";
}

export function chooseFeaturedWeek(schoolYear = "all") {
  const weeks = [...state.weeks]
    .filter(week => !schoolYear || schoolYear === "all" || schoolYearKey(week) === schoolYear)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const today = todayIso();

  const current = weeks.find(w => weekState(w, today) === "current");

  //     // Từ Thứ Bảy, nếu đã có tuần kế tiếp thì trang chính bắt đầu
  // hiển thị nội dung của tuần kế tiếp để chuẩn bị sớm.
  if (current) {
    const todayDate = dateObj(today);
    const dayOfWeek = todayDate.getDay(); // 0 CN ... 6 Thứ Bảy

    if (dayOfWeek === 6) {
      const next = weeks.find(w => w.start_date > current.end_date);
      if (next) return [next, "upcoming"];
    }

    return [current, "current"];
  }

  const upcoming = weeks.find(w => w.start_date > today);
  if (upcoming) return [upcoming, "upcoming"];

  const past = [...weeks].reverse().find(w => w.end_date < today);
  return past ? [past, "past"] : [null, "none"];
}

export function getItems(weekId) {
  const week = state.weeks.find(w => w.id === weekId);
  if (!week) return [];

  return state.announcements
    .filter(item => {
      // nếu có thời gian hiệu lực, thông báo xuất hiện ở mọi tuần
      // mà khoảng hiệu lực giao với khoảng thời gian của tuần đó.
      if (item.valid_from || item.valid_until) {
        const originWeek = state.weeks.find(w => w.id === item.week_id);
        if (originWeek && schoolYearKey(originWeek) !== schoolYearKey(week)) return false;

        const from = item.valid_from || item.event_date || week.start_date;
        const until = item.valid_until || item.valid_from || item.event_date || week.end_date;
        return from <= week.end_date && until >= week.start_date;
      }

      // Dữ liệu cũ chưa có cột hiệu lực: vẫn hiển thị theo week_id.
      return item.week_id === weekId;
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.priority !== b.priority) return a.priority === "important" ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
}

// The sidebar selection if it still belongs to the active school year, else the featured week.
export function displayedWeek() {
  const picked = state.weeks.find(week => week.id === state.selectedWeekId);
  if (picked && schoolYearKey(picked) === state.activeSchoolYear) {
    return [picked, weekState(picked)];
  }
  state.selectedWeekId = null;
  return chooseFeaturedWeek(state.activeSchoolYear);
}

export function sortedWeeks() {
  return [...state.weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function schoolYearKey(week) {
  const value = String(week?.school_year || "").trim();
  return value || "__legacy__";
}

export function schoolYearLabel(key) {
  return key === "__legacy__" ? "Chưa phân loại" : key;
}

export function getSchoolYearGroups() {
  const groups = new Map();

  sortedWeeks().forEach(week => {
    const key = schoolYearKey(week);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: schoolYearLabel(key),
        weeks: [],
        start_date: week.start_date,
        end_date: week.end_date
      });
    }

    const group = groups.get(key);
    group.weeks.push(week);

    if (week.start_date < group.start_date) group.start_date = week.start_date;
    if (week.end_date > group.end_date) group.end_date = week.end_date;
  });

  return [...groups.values()].sort((a, b) =>
    b.start_date.localeCompare(a.start_date)
  );
}

export function defaultSchoolYearKey(groups = getSchoolYearGroups()) {
  if (!groups.length) return "all";

  const today = todayIso();

  // Ưu tiên năm học thật sự chứa ngày hôm nay.
  const active = groups.find(group =>
    group.start_date <= today && group.end_date >= today
  );
  if (active) return active.key;

  // Nếu trang đang giới thiệu một tuần sắp tới/gần nhất thì ưu tiên năm của tuần đó.
  if (state.currentWeek) {
    const featuredKey = schoolYearKey(state.currentWeek);
    if (groups.some(group => group.key === featuredKey)) return featuredKey;
  }

  // Chưa tới năm học nào: lấy năm gần nhất sắp bắt đầu.
  const upcoming = [...groups]
    .filter(group => group.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (upcoming) return upcoming.key;

  // Đã qua tất cả: lấy năm học mới nhất.
  return groups[0].key;
}

export function defaultArchiveYearKey(groups = getSchoolYearGroups()) {
  if (!groups.length) return "all";

  const today = todayIso();
  const currentDefault = defaultSchoolYearKey(groups);
  const currentGroup = groups.find(group => group.key === currentDefault);

  if (currentGroup?.weeks.some(week => week.end_date < today)) {
    return currentDefault;
  }

  const latestWithPastWeeks = groups.find(group =>
    group.weeks.some(week => week.end_date < today)
  );

  return latestWithPastWeeks?.key || currentDefault;
}

export function normalizeYearFilter(value, groups, fallback) {
  if (value === "all") return "all";
  if (groups.some(group => group.key === value)) return value;
  return fallback;
}

export function weeksForYearFilter(filterValue) {
  if (!filterValue || filterValue === "all") return [...state.weeks];
  return state.weeks.filter(week => schoolYearKey(week) === filterValue);
}

export function fillWeekSelect(select, selectedId = "") {
  if (!select) return;

  const groups = [...getSchoolYearGroups()].reverse();

  select.innerHTML = groups.map(group => `
    <optgroup label="${escapeHtml(group.label)}">
      ${group.weeks.map(week =>
        `<option value="${escapeHtml(week.id)}">${escapeHtml(
          `Tuần ${week.week_number} · ${formatDate(week.start_date)} – ${formatDate(week.end_date)}`
        )}</option>`
      ).join("")}
    </optgroup>
  `).join("");

  const weeks = sortedWeeks();

  if (selectedId && weeks.some(w => w.id === selectedId)) {
    select.value = selectedId;
  } else if (state.currentWeek) {
    select.value = state.currentWeek.id;
  }
}

export function getSelectedWeek(selectId) {
  const id = $(selectId)?.value;
  return state.weeks.find(w => w.id === id) || null;
}

// Today when it falls inside the week, otherwise the week's first day.
export function defaultEventDate(week) {
  const today = todayIso();
  return week.start_date <= today && today <= week.end_date ? today : week.start_date;
}

export function applyWeekDefaults(prefix) {
  const week = getSelectedWeek(`#${prefix}-week`);
  if (!week) return;

  const dateInput = $(`#${prefix}-date`);
  const fromInput = $(`#${prefix}-valid-from`);
  const untilInput = $(`#${prefix}-valid-until`);

  if (dateInput) dateInput.value = defaultEventDate(week);
  if (fromInput) fromInput.value = week.start_date;
  if (untilInput) untilInput.value = week.end_date;
}

export function weekDays(week) {
  const days = [];
  for (let day = week.start_date; day <= week.end_date && days.length < 7; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
