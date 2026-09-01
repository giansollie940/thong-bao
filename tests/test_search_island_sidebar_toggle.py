from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / "sidebar-collapse.js").read_text(encoding="utf-8")
CSS = (ROOT / "floating-search-island.css").read_text(encoding="utf-8")


def require(text: str, needle: str, message: str) -> None:
    if needle not in text:
        raise AssertionError(message)


# Runtime DOM migration: preserve search hooks, remove the old bar, and unclip toggle.
require(JS, 'shell.insertBefore(toggle, sidebar)', "toggle must move outside the scrollable sidebar")
require(JS, 'island.className = "search-island-wrap"', "floating search island must be created")
require(JS, 'island.append(searchForm)', "existing search form must move into the island")
require(JS, 'if (topbar) topbar.remove()', "old horizontal topbar must be removed at boot")
require(JS, 'floating-search-island.css?v=3.17.2', "V3.17.2 island stylesheet must be loaded")

# Floating material and unclipped control geometry.
require(CSS, 'V3.17.2 — Floating Search Island + Unclipped Sidebar Toggle', "V3.17.2 CSS marker missing")
require(CSS, '.search-island-wrap', "search island wrapper must be styled")
require(CSS, 'border-radius: 999px;', "search island must use pill geometry")
require(CSS, 'backdrop-filter: blur(24px)', "search island must use floating glass material")
require(CSS, '.app-shell.sidebar-collapsed .sidebar-toggle', "toggle must adapt to collapsed rail")

match = re.search(r'\.sidebar-toggle\s*\{([^}]*)\}', CSS, re.S)
if not match or 'position: fixed;' not in match.group(1):
    raise AssertionError("sidebar toggle must be viewport-level fixed")
if 'z-index: 80;' not in match.group(1):
    raise AssertionError("sidebar toggle must stay above app surfaces")

print("PASS: floating search island replaces topbar and sidebar toggle cannot be clipped")
