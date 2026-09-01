# macOS Glossy App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire notification app into a polished macOS-inspired glossy application while preserving all existing functionality and editor behavior.

**Architecture:** Add one final `macos-glossy.css` visual layer loaded after all current feature CSS so the redesign is centralized and reversible instead of adding more overrides to the already long `styles.css`. Make only the minimum HTML change needed to remove announcement traffic-light controls and replace them with the normal close button. Preserve all JS-facing IDs and run permanent source regressions plus the existing editor regressions.

**Tech Stack:** Static HTML/CSS/JavaScript, GitHub Pages, Supabase browser client configuration, Python source regression tests, existing browser regression HTML tests.

**Spec:** `docs/superpowers/specs/2026-09-01-macos-glossy-app-design.md`

## Global Constraints
- No database, RLS, Auth, Edge Function, or schema changes.
- Preserve existing JS-referenced IDs and data flow.
- Remove traffic-light controls everywhere.
- Keep the existing two-row rich-editor toolbar and stable dropdown/selection behavior.
- No hover translation/movement for primary navigation, cards, or controls.
- Desktop uses a Finder/System Settings-inspired translucent sidebar.
- Reading surfaces remain calm and high contrast.
- Dark mode uses graphite/deep-blue translucent materials.
- Mobile keeps all actions accessible without desktop-sidebar overflow.

---

### Task 1: Add whole-app visual regression

**Files:**
- Create: `tests/test_macos_glossy_app.py`

**Interfaces:**
- Consumes: `index.html`, `macos-glossy.css`
- Produces: source-level guarantees for shell, traffic-light removal, stylesheet ordering, responsive/dark-mode presence, and cache version.

- [ ] **Step 1: Write the failing test**

Create a Python test that asserts:
- `index.html` loads `macos-glossy.css?v=3.17.0` after `announcement-form.css`.
- `mac-traffic-lights`, `mac-traffic-light`, `mac-close`, `mac-minimize`, `mac-maximize` are absent from HTML.
- announcement header includes a `.mac-dialog-close.close-dialog` button with `×`.
- existing shell/sidebar/topbar and required IDs remain.
- `macos-glossy.css` contains `.app-sidebar`, `.app-topbar`, `.announcement-card`, `.modal-card`, dark-mode selectors, `@media (max-width: 820px)`, backdrop filters, and no `translateX`/`translateY` hover movement for sidebar links/announcement cards.

- [ ] **Step 2: Run test to verify it fails**

Run the test in GitHub Actions or equivalent repository test workflow.
Expected: FAIL because `macos-glossy.css` does not exist and traffic-light markup remains.

- [ ] **Step 3: Commit the failing regression**

Commit only the test so RED is recorded before production code.

---

### Task 2: Add centralized macOS glossy visual layer

**Files:**
- Create: `macos-glossy.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing app classes/IDs.
- Produces: final visual system layered after all current CSS.

- [ ] **Step 1: Add stylesheet link and cache version**

Add `macos-glossy.css?v=3.17.0` after `announcement-form.css` and bump all existing `?v=3.16.14` references in `index.html` to `?v=3.17.0`.

- [ ] **Step 2: Remove traffic lights from announcement composer**

Replace the traffic-light block with a normal top-right close button:

```html
<button class="icon-button mac-dialog-close close-dialog" type="button" aria-label="Đóng cửa sổ">×</button>
```

Keep `announcement-dialog-title` unchanged.

- [ ] **Step 3: Implement app material tokens**

In `macos-glossy.css`, define final light/dark tokens for graphite text, blue/indigo/cyan/mint/orange/pink accents, translucent surfaces, border highlights, and layered shadows.

- [ ] **Step 4: Implement desktop shell/sidebar/topbar**

Override `.app-shell`, `.app-sidebar`, `.sidebar-*`, `.app-topbar`, `.topbar-search` and controls to match the approved Finder/System Settings-inspired glossy design. Disable hover translations.

- [ ] **Step 5: Implement reading surfaces**

Override current-week hero, categories, announcement cards, year cards, archive cards, badges/chips, loading/empty states, search results, and footer. Preserve category custom properties and readable neutral card bases.

- [ ] **Step 6: Implement all dialog/form chrome**

Unify `.modal`, `.modal-card`, `.modal-heading`, `.mac-window-header`, `.mac-form-section`, inputs, selects, buttons, sticky footers, and editor shell. Ensure `mac-dialog-close` is positioned consistently.

- [ ] **Step 7: Implement dark mode and responsive states**

Add desktop, <=1040px, <=820px, <=620px rules. Ensure mobile keeps all nav/admin commands accessible and editor toolbar remains two rows with horizontal scrolling.

---

### Task 3: Verify regressions and deployment

**Files:**
- Test: `tests/test_macos_glossy_app.py`
- Test: `tests/test_toolbar_two_rows.py`
- Test: `tests/test_macos_announcement_layout.py` (update only if its old traffic-light expectation conflicts with the newly approved design)
- Existing editor regression HTML files.

**Interfaces:**
- Consumes: final production files.
- Produces: verified commit and deployed GitHub Pages build.

- [ ] **Step 1: Update obsolete announcement regression**

Modify `tests/test_macos_announcement_layout.py` so it verifies the new common close button instead of traffic lights while retaining section/editor/footer checks.

- [ ] **Step 2: Run source tests**

Run all Python tests under `tests/` that are runnable source regressions.
Expected: PASS.

- [ ] **Step 3: Run editor browser regressions**

Run the existing editor regressions used by the repository workflow and confirm all pass.

- [ ] **Step 4: Commit production changes**

Commit the design layer, HTML change, and updated regressions to `main`.

- [ ] **Step 5: Verify final branch and Pages deployment**

Fetch the exact `main` SHA and GitHub Actions runs for that SHA. Report live only when the Pages workflow for the exact final SHA is `completed` + `success`.
