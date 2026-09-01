from pathlib import Path

# One-shot migration helper for V3.17.1.
INDEX = Path("index.html")
CSS = Path("macos-glossy.css")

index = INDEX.read_text(encoding="utf-8")
index = index.replace("?v=3.17.0", "?v=3.17.1")

old_aside = '<aside class="app-sidebar" aria-label="Thanh điều hướng">'
new_aside = '''<aside class="app-sidebar" id="app-sidebar" aria-label="Thanh điều hướng">\n      <button\n        class="sidebar-toggle"\n        id="sidebar-toggle"\n        type="button"\n        aria-controls="app-sidebar"\n        aria-expanded="true"\n        aria-label="Thu gọn thanh điều hướng"\n        title="Thu gọn thanh điều hướng"\n      ><span aria-hidden="true">‹</span></button>'''
if old_aside in index:
    index = index.replace(old_aside, new_aside, 1)
elif 'id="sidebar-toggle"' not in index:
    raise SystemExit("sidebar aside anchor not found")

script_anchor = '  <script src="app.js?v=3.17.1"></script>'
script_insert = '  <script src="sidebar-collapse.js?v=3.17.1"></script>\n' + script_anchor
if 'sidebar-collapse.js?v=3.17.1' not in index:
    if script_anchor not in index:
        raise SystemExit("app.js script anchor not found")
    index = index.replace(script_anchor, script_insert, 1)

INDEX.write_text(index, encoding="utf-8")

css = CSS.read_text(encoding="utf-8")
marker = "V3.17.1 — Restored Mint Garden Hero + Collapsible Icon Rail"
if marker not in css:
    css += r'''

/* =========================================================
   V3.17.1 — Restored Mint Garden Hero + Collapsible Icon Rail
   Preserve the macOS shell while restoring the pre-redesign
   hero artwork/pattern and adding a persistent desktop icon rail.
   ========================================================= */

:root {
  --sidebar-collapsed-width: 74px;
}

body {
  background:
    url("mint-garden-pattern.svg") repeat,
    #f6fbf9;
  background-size: 180px 180px;
}

html[data-theme="dark"] body {
  background:
    linear-gradient(rgba(17, 21, 28, .91), rgba(17, 21, 28, .91)),
    url("mint-garden-pattern.svg") repeat,
    var(--mac-bg);
  background-size: auto, 180px 180px, auto;
}

/* Restore the original Mint Garden current-week hero. */
.week-hero {
  min-height: 238px;
  border: 0;
  border-radius: 24px;
  background:
    linear-gradient(90deg, rgba(39, 125, 97, .28), rgba(39,125,97,.06) 58%, rgba(255,255,255,0)),
    url("mint-garden-hero.svg") center right / cover no-repeat;
  color: #fff;
  box-shadow:
    0 18px 40px rgba(67, 122, 104, .18),
    0 0 0 1px rgba(255,255,255,.20) inset;
}

.week-hero::before {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0;
  width: auto;
  height: auto;
  border-radius: inherit;
  background:
    radial-gradient(circle at 16% 24%, rgba(255,255,255,.26) 0 2px, transparent 3px),
    radial-gradient(circle at 24% 68%, rgba(255,255,255,.20) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 69% 17%, rgba(255,255,255,.28) 0 2px, transparent 3px),
    linear-gradient(118deg, rgba(255,255,255,.12), transparent 34%);
  opacity: .9;
  filter: none;
  pointer-events: none;
}

.week-hero::after {
  content: "";
  position: absolute;
  z-index: 0;
  right: 10%;
  top: 18%;
  bottom: auto;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.18), transparent 68%);
  filter: blur(2px);
  pointer-events: none;
}

.week-hero-content {
  position: relative;
  z-index: 1;
  grid-template-columns: 130px minmax(0, 1fr);
  min-height: 238px;
  padding: 30px 34px;
}

.week-number {
  min-width: 118px;
  min-height: 118px;
  border-radius: 26px;
  background: rgba(255,255,255,.18);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.34),
    0 12px 30px rgba(42,103,84,.14),
    0 0 28px rgba(255,255,255,.07);
}

.week-number strong {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
}

.week-details {
  max-width: 650px;
  text-shadow: 0 1px 1px rgba(32,76,63,.13);
}

.week-date,
.week-school-year {
  background: rgba(255,255,255,.16);
}

/* Finder-like sidebar collapse control. */
.app-shell {
  transition: grid-template-columns 180ms ease;
}

.sidebar-toggle {
  position: absolute;
  top: 21px;
  right: -14px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--mac-line-strong);
  border-radius: 9px;
  background: var(--mac-glass-strong);
  color: var(--mac-muted);
  box-shadow: 0 5px 14px rgba(35,52,79,.12), var(--mac-highlight);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
  font-size: 1.15rem;
  line-height: 1;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}

.sidebar-toggle:hover {
  background: color-mix(in srgb, var(--mac-card-solid) 90%, var(--mac-blue) 6%);
  color: var(--mac-text);
  transform: none !important;
}

@media (min-width: 821px) {
  .app-shell.sidebar-collapsed {
    grid-template-columns: var(--sidebar-collapsed-width) minmax(0, 1fr);
  }

  .app-shell.sidebar-collapsed .app-sidebar {
    width: var(--sidebar-collapsed-width);
    padding-inline: 9px;
    overflow-x: visible;
  }

  .app-shell.sidebar-collapsed .sidebar-brand {
    justify-content: center;
    min-height: 52px;
    margin-inline: 0;
    padding: 5px 0;
  }

  .app-shell.sidebar-collapsed .sidebar-logo,
  .app-shell.sidebar-collapsed .sidebar-logo img {
    width: 40px;
    height: 40px;
  }

  .app-shell.sidebar-collapsed .sidebar-brand > span:last-child,
  .app-shell.sidebar-collapsed .sidebar-section-heading,
  .app-shell.sidebar-collapsed .sidebar-status > div,
  .app-shell.sidebar-collapsed .sidebar-link > span:last-child,
  .app-shell.sidebar-collapsed .sidebar-command > span:last-child,
  .app-shell.sidebar-collapsed .sidebar-mini-command > span:last-child,
  .app-shell.sidebar-collapsed .sidebar-action > span:last-child {
    display: none !important;
  }

  .app-shell.sidebar-collapsed .sidebar-nav,
  .app-shell.sidebar-collapsed .sidebar-admin-actions,
  .app-shell.sidebar-collapsed .sidebar-admin-mini,
  .app-shell.sidebar-collapsed .sidebar-bottom {
    justify-items: center;
  }

  .app-shell.sidebar-collapsed .sidebar-link,
  .app-shell.sidebar-collapsed .sidebar-action,
  .app-shell.sidebar-collapsed .sidebar-mini-command,
  .app-shell.sidebar-collapsed .sidebar-command {
    position: relative;
    display: grid;
    place-items: center;
    width: 48px;
    min-width: 48px;
    padding: 6px;
    gap: 0;
  }

  .app-shell.sidebar-collapsed .sidebar-command {
    grid-template-columns: 1fr;
  }

  .app-shell.sidebar-collapsed .sidebar-status {
    justify-content: center;
    width: 48px;
    margin-inline: auto;
    padding: 9px;
  }

  .app-shell.sidebar-collapsed .sidebar-status-icon {
    font-size: 1rem;
  }

  .app-shell.sidebar-collapsed .sidebar-admin {
    margin-top: 14px;
    padding-top: 10px;
  }

  .app-shell.sidebar-collapsed [data-sidebar-label]::after {
    content: attr(data-sidebar-label);
    position: absolute;
    top: 50%;
    left: calc(100% + 12px);
    z-index: 90;
    max-width: 220px;
    padding: 7px 10px;
    border: 1px solid var(--mac-line);
    border-radius: 9px;
    background: var(--mac-glass-strong);
    color: var(--mac-text);
    box-shadow: var(--mac-shadow-soft);
    -webkit-backdrop-filter: blur(18px) saturate(145%);
    backdrop-filter: blur(18px) saturate(145%);
    font-size: .74rem;
    font-weight: 650;
    line-height: 1.25;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(3px, -50%);
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .app-shell.sidebar-collapsed [data-sidebar-label]:hover::after,
  .app-shell.sidebar-collapsed [data-sidebar-label]:focus-visible::after {
    opacity: 1;
    transform: translate(0, -50%);
  }
}

@media (max-width: 820px) {
  .sidebar-toggle {
    display: none !important;
  }

  .app-shell.sidebar-collapsed {
    display: block;
  }
}

@media (max-width: 620px) {
  .week-hero {
    min-height: 260px;
    background-position: 63% center;
  }

  .week-hero-content {
    min-height: 260px;
    padding: 24px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell,
  .sidebar-toggle,
  .app-shell.sidebar-collapsed [data-sidebar-label]::after {
    transition: none !important;
  }
}
'''
    CSS.write_text(css, encoding="utf-8")

print("Applied V3.17.1 Mint Garden hero and collapsible icon rail")
