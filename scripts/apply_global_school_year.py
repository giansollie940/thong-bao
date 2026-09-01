from pathlib import Path

INDEX = Path("index.html")
APP = Path("app.js")
CSS = Path("macos-glossy.css")

index = INDEX.read_text(encoding="utf-8")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# ---------- index.html ----------
index = index.replace('macos-glossy.css?v=3.17.1', 'macos-glossy.css?v=3.18.0')
index = index.replace('app.js?v=3.17.1', 'app.js?v=3.18.0')

nav_anchor = '''      </nav>\n\n      <section class="sidebar-admin hidden" id="admin-toolbar" aria-label="Công cụ quản trị">'''
nav_insert = '''      </nav>\n\n      <div class="sidebar-school-year" aria-label="Năm học đang xem">\n        <span class="sidebar-school-year-icon" aria-hidden="true">🎓</span>\n        <label class="sidebar-school-year-control" for="global-school-year-filter">\n          <span>Năm học</span>\n          <select id="global-school-year-filter" aria-label="Chọn năm học để xem toàn bộ ứng dụng"></select>\n        </label>\n      </div>\n\n      <section class="sidebar-admin hidden" id="admin-toolbar" aria-label="Công cụ quản trị">'''
if 'id="global-school-year-filter"' not in index:
    if nav_anchor not in index:
        raise SystemExit("index sidebar nav anchor not found")
    index = index.replace(nav_anchor, nav_insert, 1)

# ---------- app.js ----------
state_anchor = '''    categoryFilter: "all",\n    schoolYearPreview: [],\n    yearFilter: "",'''
state_insert = '''    categoryFilter: "all",\n    schoolYearPreview: [],\n    activeSchoolYear: "",\n    yearFilter: "",'''
if 'activeSchoolYear:' not in app:
    if state_anchor not in app:
        raise SystemExit("state anchor not found")
    app = app.replace(state_anchor, state_insert, 1)

el_anchor = '''    categoryDashboard: $("#category-dashboard"),\n    categoryDialog: $("#categories-dialog"),'''
el_insert = '''    categoryDashboard: $("#category-dashboard"),\n    globalSchoolYearFilter: $("#global-school-year-filter"),\n    categoryDialog: $("#categories-dialog"),'''
if 'globalSchoolYearFilter:' not in app:
    if el_anchor not in app:
        raise SystemExit("element anchor not found")
    app = app.replace(el_anchor, el_insert, 1)

old_choose = '''  function chooseFeaturedWeek() {\n    const weeks = [...state.weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));\n    const today = todayIso();'''
new_choose = '''  function chooseFeaturedWeek(schoolYear = "all") {\n    const weeks = [...state.weeks]\n      .filter(week => !schoolYear || schoolYear === "all" || schoolYearKey(week) === schoolYear)\n      .sort((a, b) => a.start_date.localeCompare(b.start_date));\n    const today = todayIso();'''
if old_choose in app:
    app = app.replace(old_choose, new_choose, 1)
elif 'function chooseFeaturedWeek(schoolYear = "all")' not in app:
    raise SystemExit("chooseFeaturedWeek anchor not found")

old_validity = '''        if (item.valid_from || item.valid_until) {\n          const from = item.valid_from || item.event_date || week.start_date;\n          const until = item.valid_until || item.valid_from || item.event_date || week.end_date;\n          return from <= week.end_date && until >= week.start_date;\n        }'''
new_validity = '''        if (item.valid_from || item.valid_until) {\n          const originWeek = state.weeks.find(w => w.id === item.week_id);\n          if (originWeek && schoolYearKey(originWeek) !== schoolYearKey(week)) return false;\n\n          const from = item.valid_from || item.event_date || week.start_date;\n          const until = item.valid_until || item.valid_from || item.event_date || week.end_date;\n          return from <= week.end_date && until >= week.start_date;\n        }'''
if old_validity in app:
    app = app.replace(old_validity, new_validity, 1)
elif 'schoolYearKey(originWeek) !== schoolYearKey(week)' not in app:
    raise SystemExit("getItems validity anchor not found")

selector_anchor = '''  function renderSchoolYearSelectors() {\n    const groups = getSchoolYearGroups();'''
selector_insert = '''  function renderGlobalSchoolYearSwitcher() {\n    if (!el.globalSchoolYearFilter) return;\n\n    const groups = getSchoolYearGroups();\n    if (!groups.length) {\n      el.globalSchoolYearFilter.innerHTML = '<option value="">Chưa có năm học</option>';\n      el.globalSchoolYearFilter.disabled = true;\n      state.activeSchoolYear = "";\n      return;\n    }\n\n    const fallback = defaultSchoolYearKey(groups);\n    if (!groups.some(group => group.key === state.activeSchoolYear)) {\n      state.activeSchoolYear = fallback;\n    }\n\n    el.globalSchoolYearFilter.innerHTML = groups.map(group =>\n      `<option value="${escapeHtml(group.key)}">${escapeHtml(group.label)}</option>`\n    ).join("");\n    el.globalSchoolYearFilter.disabled = false;\n    el.globalSchoolYearFilter.value = state.activeSchoolYear;\n  }\n\n  function applyGlobalSchoolYear(value) {\n    const groups = getSchoolYearGroups();\n    const fallback = defaultSchoolYearKey(groups);\n    const next = groups.some(group => group.key === value) ? value : fallback;\n\n    state.activeSchoolYear = next;\n    state.yearFilter = state.activeSchoolYear;\n    state.archiveYearFilter = state.activeSchoolYear;\n    state.categoryFilter = "all";\n    [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek(state.activeSchoolYear);\n\n    renderAll();\n\n    if (el.searchInput?.value.trim() && !el.searchResultsSection?.classList.contains("hidden")) {\n      runSearch(el.searchInput.value);\n    }\n  }\n\n  function renderSchoolYearSelectors() {\n    const groups = getSchoolYearGroups();'''
if 'function renderGlobalSchoolYearSwitcher()' not in app:
    if selector_anchor not in app:
        raise SystemExit("renderSchoolYearSelectors anchor not found")
    app = app.replace(selector_anchor, selector_insert, 1)

renderall_old = '''  function renderAll() {\n    renderAdmin();\n    renderConnection();\n    renderCurrent();\n    renderSchoolYearSelectors();'''
renderall_new = '''  function renderAll() {\n    renderAdmin();\n    renderConnection();\n    renderGlobalSchoolYearSwitcher();\n    renderCurrent();\n    renderSchoolYearSelectors();'''
if renderall_old in app:
    app = app.replace(renderall_old, renderall_new, 1)
elif 'renderGlobalSchoolYearSwitcher();' not in app:
    raise SystemExit("renderAll anchor not found")

search_old = '''    const results = state.announcements.filter(item => {\n      const week = state.weeks.find(w => w.id === item.week_id);\n      const haystack = normalizeText(['''
search_new = '''    const results = state.announcements.filter(item => {\n      const week = state.weeks.find(w => w.id === item.week_id);\n      if (state.activeSchoolYear && (!week || schoolYearKey(week) !== state.activeSchoolYear)) {\n        return false;\n      }\n      const haystack = normalizeText(['''
if search_old in app:
    app = app.replace(search_old, search_new, 1)
elif 'schoolYearKey(week) !== state.activeSchoolYear' not in app:
    raise SystemExit("runSearch anchor not found")

load_old = '''      [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek();\n      scheduleRenderAll();'''
load_new = '''      const groups = getSchoolYearGroups();\n      if (!groups.some(group => group.key === state.activeSchoolYear)) {\n        state.activeSchoolYear = defaultSchoolYearKey(groups);\n      }\n      state.yearFilter = state.activeSchoolYear;\n      state.archiveYearFilter = state.activeSchoolYear;\n      [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek(state.activeSchoolYear);\n      scheduleRenderAll();'''
if load_old in app:
    app = app.replace(load_old, load_new, 1)
elif 'chooseFeaturedWeek(state.activeSchoolYear)' not in app:
    raise SystemExit("loadData featured week anchor not found")

events_anchor = '''    el.archiveYearFilter?.addEventListener("change", () => {\n      state.archiveYearFilter = el.archiveYearFilter.value;\n      renderArchives();\n    });\n\n    el.announcementForm.addEventListener("submit", saveAnnouncement);'''
events_insert = '''    el.archiveYearFilter?.addEventListener("change", () => {\n      state.archiveYearFilter = el.archiveYearFilter.value;\n      renderArchives();\n    });\n\n    el.globalSchoolYearFilter?.addEventListener("change", () => {\n      applyGlobalSchoolYear(el.globalSchoolYearFilter.value);\n    });\n\n    el.announcementForm.addEventListener("submit", saveAnnouncement);'''
if 'applyGlobalSchoolYear(el.globalSchoolYearFilter.value)' not in app:
    if events_anchor not in app:
        raise SystemExit("initEvents global selector anchor not found")
    app = app.replace(events_anchor, events_insert, 1)

overlap_anchor = '''  async function saveSchoolYear(event) {\n    event.preventDefault();'''
overlap_helpers = '''  function overlappingSchoolYearGroups(preview) {\n    if (!preview?.length) return [];\n\n    const start = preview[0].start_date;\n    const end = preview.at(-1).end_date;\n    const candidateYear = preview[0].school_year;\n\n    return getSchoolYearGroups().filter(group =>\n      group.key !== candidateYear &&\n      start <= group.end_date &&\n      end >= group.start_date\n    );\n  }\n\n  async function saveSchoolYear(event) {\n    event.preventDefault();'''
if 'function overlappingSchoolYearGroups(' not in app:
    if overlap_anchor not in app:
        raise SystemExit("saveSchoolYear helper anchor not found")
    app = app.replace(overlap_anchor, overlap_helpers, 1)

duplicates_anchor = '''    const duplicates = preview.filter(candidate =>\n      state.weeks.some(existing =>\n        existing.school_year === candidate.school_year &&\n        (\n          existing.week_number === candidate.week_number ||\n          existing.sequence_number === candidate.sequence_number ||\n          existing.start_date === candidate.start_date\n        )\n      )\n    );\n\n    if (duplicates.length) {'''
duplicates_insert = '''    const overlappingGroups = overlappingSchoolYearGroups(preview);\n    if (overlappingGroups.length) {\n      setMessage(\n        el.schoolYearMessage,\n        `Năm học mới bị chồng ngày với ${overlappingGroups.map(group => group.label).join(", ")}. Hãy điều chỉnh ngày bắt đầu/kết thúc.`\n      );\n      return;\n    }\n\n    const duplicates = preview.filter(candidate =>\n      state.weeks.some(existing =>\n        existing.school_year === candidate.school_year &&\n        (\n          existing.week_number === candidate.week_number ||\n          existing.sequence_number === candidate.sequence_number ||\n          existing.start_date === candidate.start_date\n        )\n      )\n    );\n\n    if (duplicates.length) {'''
if 'Năm học mới bị chồng ngày với' not in app:
    if duplicates_anchor not in app:
        raise SystemExit("school-year duplicate anchor not found")
    app = app.replace(duplicates_anchor, duplicates_insert, 1)

save_done_old = '''    const schoolYear = preview[0].school_year;\n    state.yearFilter = schoolYear;\n    state.archiveYearFilter = schoolYear;'''
save_done_new = '''    const schoolYear = preview[0].school_year;\n    state.activeSchoolYear = schoolYear;\n    state.yearFilter = state.activeSchoolYear;\n    state.archiveYearFilter = state.activeSchoolYear;'''
if save_done_old in app:
    app = app.replace(save_done_old, save_done_new, 1)
elif 'state.activeSchoolYear = schoolYear;' not in app:
    raise SystemExit("school-year completion anchor not found")

# ---------- macos-glossy.css ----------
marker = "V3.18.0 — Global School Year Switcher"
if marker not in css:
    css += r'''

/* =========================================================
   V3.18.0 — Global School Year Switcher
   One school-year context drives the whole application.
   ========================================================= */

.sidebar-school-year {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  margin: 12px 0 2px;
  padding: 8px 9px;
  border: 1px solid var(--mac-line);
  border-radius: 12px;
  background: rgba(255,255,255,.26);
  box-shadow: var(--mac-highlight);
}

.sidebar-school-year-icon {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  border-radius: 8px;
  background: linear-gradient(145deg, #7d7aff, #5e5ce6 55%, #4aa3ff);
  color: #fff;
  box-shadow: 0 4px 10px rgba(36,51,74,.14), inset 0 1px 0 rgba(255,255,255,.32);
}

.sidebar-school-year-control {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.sidebar-school-year-control > span {
  color: var(--mac-muted);
  font-size: .62rem;
  font-weight: 760;
  letter-spacing: .07em;
  text-transform: uppercase;
}

#global-school-year-filter {
  width: 100%;
  min-width: 0;
  min-height: 30px;
  padding: 4px 25px 4px 7px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--mac-card-solid) 72%, transparent);
  color: var(--mac-text);
  font: inherit;
  font-size: .76rem;
  font-weight: 680;
  box-shadow: inset 0 0 0 1px var(--mac-line);
}

#global-school-year-filter:focus-visible {
  outline: 3px solid rgba(10,132,255,.16);
  outline-offset: 1px;
}

@media (min-width: 821px) {
  .app-shell.sidebar-collapsed .sidebar-school-year {
    display: grid;
    place-items: center;
    grid-template-columns: 1fr;
    width: 48px;
    margin-inline: auto;
    padding: 8px;
  }

  .app-shell.sidebar-collapsed .sidebar-school-year-control {
    display: none;
  }
}

html[data-theme="dark"] .sidebar-school-year {
  background: rgba(255,255,255,.045);
}
'''

INDEX.write_text(index, encoding="utf-8")
APP.write_text(app, encoding="utf-8")
CSS.write_text(css, encoding="utf-8")
print("Applied V3.18.0 global school-year isolation")
