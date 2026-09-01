from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "macos-glossy.css").read_text(encoding="utf-8")


def require(text: str, needle: str, message: str) -> None:
    if needle not in text:
        raise AssertionError(message)


# The old horizontal topbar must be gone from production markup.
if '<header class="app-topbar">' in INDEX:
    raise AssertionError("horizontal topbar must be removed")

# Search keeps the existing functional IDs but is hosted in a floating island.
require(INDEX, 'class="search-island-wrap"', "floating search island wrapper must exist")
require(INDEX, 'class="topbar-search" id="search-form"', "existing search form hook must be preserved")
require(INDEX, 'id="search-input"', "existing search input hook must be preserved")

# The toggle must be outside the scrollable sidebar so overflow cannot clip it.
shell_start = INDEX.index('<div class="app-shell">')
aside_start = INDEX.index('<aside class="app-sidebar"', shell_start)
aside_end = INDEX.index('</aside>', aside_start)
toggle_pos = INDEX.index('id="sidebar-toggle"', shell_start)
if aside_start < toggle_pos < aside_end:
    raise AssertionError("sidebar toggle must not live inside the scrollable sidebar")
if not toggle_pos < aside_start:
    raise AssertionError("sidebar toggle should sit immediately before the sidebar in app-shell")

# V3.17.2 styling contract.
require(INDEX, 'macos-glossy.css?v=3.17.2', "macOS stylesheet cache version must be V3.17.2")
require(CSS, 'V3.17.2 — Floating Search Island + Unclipped Sidebar Toggle', "V3.17.2 visual layer must exist")
require(CSS, '.search-island-wrap', "search island wrapper must be styled")
require(CSS, 'border-radius: 999px;', "search control must use pill/island geometry")
require(CSS, 'backdrop-filter: blur(24px)', "search island must use floating glass material")
require(CSS, '.app-shell.sidebar-collapsed .sidebar-toggle', "toggle position must adapt to collapsed rail")

# A fixed/viewport-level toggle proves it is not clipped by sidebar overflow.
match = re.search(r'\.sidebar-toggle\s*\{([^}]*)\}', CSS, re.S)
if not match or 'position: fixed;' not in match.group(1):
    raise AssertionError("sidebar toggle must be viewport-level fixed, outside clipping context")

print("PASS: floating search island replaces topbar and sidebar toggle cannot be clipped")
