from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "macos-glossy.css").read_text(encoding="utf-8")
JS_PATH = ROOT / "sidebar-collapse.js"


def require(text: str, needle: str, message: str) -> None:
    if needle not in text:
        raise AssertionError(message)


# Production markup / asset version.
require(INDEX, 'id="sidebar-toggle"', "sidebar toggle button must exist")
require(INDEX, 'aria-controls="app-sidebar"', "toggle must identify the controlled sidebar")
require(INDEX, 'id="app-sidebar"', "sidebar needs a stable id for accessibility")
require(INDEX, 'sidebar-collapse.js?v=3.17.1', "sidebar behavior script must retain its current cache version")
require(INDEX, 'macos-glossy.css?v=3.18.0', "macOS layer cache version must be V3.18.0")

# Restore the exact pre-redesign visual assets rather than approximating them.
require(CSS, 'url("mint-garden-pattern.svg")', "old mint-garden page pattern must be restored")
require(CSS, 'url("mint-garden-hero.svg")', "old mint-garden hero artwork must be restored")
require(CSS, 'radial-gradient(circle at 16% 24%', "old static hero sparkle pattern must be restored")
require(CSS, 'radial-gradient(circle at 69% 17%', "old static hero sparkle pattern must include the right-side star")

# Desktop icon rail contract.
require(CSS, '--sidebar-collapsed-width: 74px;', "collapsed sidebar width must be 74px")
require(CSS, '.app-shell.sidebar-collapsed', "collapsed shell state must have dedicated styles")
require(CSS, 'grid-template-columns: var(--sidebar-collapsed-width) minmax(0, 1fr);', "workspace must expand when sidebar collapses")
require(CSS, '.sidebar-toggle', "sidebar toggle must be styled")
require(CSS, '@media (max-width: 820px)', "mobile/tablet breakpoint must remain explicit")

if not JS_PATH.exists():
    raise AssertionError("sidebar-collapse.js must exist")

JS = JS_PATH.read_text(encoding="utf-8")
require(JS, 'weekly-sidebar-collapsed', "collapsed preference must use a stable localStorage key")
require(JS, 'localStorage.getItem', "collapsed state must be restored from localStorage")
require(JS, 'localStorage.setItem', "collapsed state must be persisted to localStorage")
require(JS, 'matchMedia("(min-width: 821px)")', "icon rail must only apply on desktop")
require(JS, 'aria-expanded', "toggle accessibility state must be updated")

print("PASS: old hero/pattern restored and desktop icon rail contract is present")
