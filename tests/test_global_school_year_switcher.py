from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
APP = (ROOT / "app.js").read_text(encoding="utf-8")
CSS = (ROOT / "macos-glossy.css").read_text(encoding="utf-8")


def require(text: str, needle: str, message: str) -> None:
    if needle not in text:
        raise AssertionError(message)


# GREEN verification for V3.18.0 global school-year isolation.
# Global school-year switcher must live in the sidebar.
require(INDEX, 'id="global-school-year-filter"', "sidebar global school-year selector must exist")
require(INDEX, 'class="sidebar-school-year"', "sidebar school-year control must have dedicated layout")

# One app-wide state drives hero, year strip, archive, and search.
require(APP, 'activeSchoolYear:', "state must track the globally selected school year")
require(APP, 'function renderGlobalSchoolYearSwitcher()', "global school-year selector renderer must exist")
require(APP, 'function applyGlobalSchoolYear(', "global school-year change handler must exist")
require(APP, 'chooseFeaturedWeek(state.activeSchoolYear)', "featured week must respect global school-year selection")
require(APP, 'state.yearFilter = state.activeSchoolYear;', "year strip must follow the global school-year selection")
require(APP, 'state.archiveYearFilter = state.activeSchoolYear;', "archive must follow the global school-year selection")
require(APP, 'schoolYearKey(week) !== state.activeSchoolYear', "search/results must exclude other school years")

# Announcements with validity ranges must never leak across school-year boundaries.
require(APP, 'const originWeek = state.weeks.find(w => w.id === item.week_id);', "announcement origin week must be resolved")
require(APP, 'schoolYearKey(originWeek) !== schoolYearKey(week)', "validity ranges must be bounded to the origin school year")

# Creating a new school year must reject cross-year date overlap.
require(APP, 'function overlappingSchoolYearGroups(', "cross-year overlap detector must exist")
require(APP, 'Năm học mới bị chồng ngày với', "school-year creation must report a cross-year overlap")

# Collapsed rail still has a compact representation for the global switcher.
require(CSS, '.sidebar-school-year', "global school-year selector must be styled")
require(CSS, '.app-shell.sidebar-collapsed .sidebar-school-year', "collapsed sidebar must handle the school-year selector")

print("PASS: global school-year isolation and switcher contract is present")
