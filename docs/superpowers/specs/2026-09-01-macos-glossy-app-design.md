# macOS Glossy App Redesign — Design Spec

## Goal
Redesign the entire `thong-bao` application so it feels like a polished native macOS application while preserving all existing data flow, Supabase configuration, IDs, actions, editor behavior, and GitHub Pages deployment model.

## Approved Direction
The approved visual direction is **macOS glossy + colorful sidebar + clean content**.

Key decisions:
- Do not simulate a macOS desktop, Dock, wallpaper, or fake operating-system chrome.
- Remove the red/yellow/green traffic-light controls everywhere, including the announcement composer.
- Use a Finder/System Settings-inspired sidebar with translucent material, compact grouped navigation, colorful icon tiles, and a rounded active row.
- Use glossy highlights, layered shadows, subtle gradients, and blur on navigation/control surfaces.
- Keep reading surfaces calm and high-contrast: colorful navigation, quiet data.
- Use macOS-like modal titlebars with a normal close button (`×`) on the right.
- Preserve the existing two-row rich-editor toolbar and its stable dropdown/selection behavior.

## Scope
The redesign applies to all visible UI:
1. App background and shell.
2. Sidebar brand, navigation, admin commands, status, theme/login/logout controls.
3. Sticky top toolbar and Spotlight-like search.
4. Current-week section and hero.
5. Category filters.
6. Announcement cards and metadata chips.
7. School-year timeline/cards and filters.
8. Archive cards.
9. Search results.
10. Empty/loading/status/toast UI.
11. All dialogs and forms.
12. Announcement composer and rich editor.
13. Light and dark themes.
14. Tablet/mobile navigation and responsive behavior.

## Non-goals
- No schema changes.
- No Supabase Auth/RLS/Edge Function changes.
- No changes to announcement rendering/data semantics.
- No replacement of current editor JS.
- No fake macOS menu bar, Dock, desktop window frame, or traffic-light controls.

## Backend Constraint
The repository uses `config.js` with Supabase project ref `bimpvjwcsccbogosodwm`. The currently connected Supabase plugin account exposes a different project (`tu-hoc`), so no backend mutation will be attempted from this task. Frontend IDs and data hooks must remain unchanged.

## Architecture
Create one final visual override layer, `macos-glossy.css`, loaded after existing feature CSS. This layer owns only app-wide visual language and responsive shell behavior. Existing feature-specific CSS remains the source of functional geometry for editor internals and component behavior unless explicitly overridden.

The existing HTML app shell is reused. Only small semantic markup changes are allowed when necessary to remove obsolete traffic-light markup or add non-functional grouping labels/classes. Existing JS-referenced IDs must not change.

## Visual System
### Materials
- Main content: near-white / dark neutral readable surfaces.
- Sidebar/topbar/modal chrome: translucent material using `backdrop-filter` where supported.
- Borders: 1px low-contrast keylines plus an inner highlight.
- Shadows: layered, soft, low-opacity.

### Color
- Accent palette: macOS-like blue, indigo, cyan, mint, orange, pink.
- Sidebar/admin icons may use different accent gradients.
- Announcement/category colors remain data-driven.
- Body text retains WCAG-oriented contrast; decorative gradients never sit behind long body copy without an opaque/near-opaque reading surface.

### Shape
- Sidebar active row: 10–12px radius.
- Controls/buttons: 10–12px radius.
- Cards: 16–20px radius.
- Large hero/modal: 20–24px radius.

### Motion
- No hover translation that moves the target under the pointer.
- Hover may change background, shadow, highlight, or border only.
- Respect `prefers-reduced-motion`.

## Sidebar
Desktop width target: 244–260px.

Structure:
- brand
- primary navigation
- admin group when authenticated
- status
- theme/auth controls

Behavior:
- sticky full-height desktop sidebar
- glass/translucent material
- compact Finder-style section labels
- active row uses subtle accent fill and inset highlight
- icon tiles use controlled glossy gradients
- no animated lateral shifting on hover

On small screens, preserve access to all navigation/admin actions while switching to a compact horizontal/bottom-style navigation treatment instead of squeezing desktop sidebar content.

## Top Toolbar
- Sticky translucent toolbar.
- Greeting/title area remains compact.
- Search looks like Spotlight: rounded inset field, subtle search icon, clear focus ring.
- Avoid oversized hero-dashboard chrome.

## Main Reading Surfaces
### Current week
- Keep visual prominence.
- Use a polished blue/cyan/indigo/mint gradient with a glossy highlight.
- Week number sits in a translucent inset tile.
- Information must remain readable without relying on background artwork.

### Category filters
- Compact glossy pills/tiles.
- Color communicates category while count/title remain easy to scan.
- No hover movement.

### Announcements
- Near-white/dark-neutral card base.
- Thin category accent strip/glow.
- Small glossy highlight at top edge.
- Minimal shadow.
- Metadata chips compact and lower-contrast than title/content.
- No hover translation.

### Year/archive cards
- Calm neutral base with light accent wash.
- Current/upcoming state remains distinct.
- Controls remain visibly clickable without making every card colorful.

## Dialogs
All dialogs use a common macOS-like chrome:
- no traffic lights
- centered/left-aligned title depending on dialog content
- close `×` button at top-right
- translucent header where useful
- readable content cards
- sticky action bar for long forms when already appropriate

Announcement composer keeps its section-card organization and two-row editor toolbar but replaces traffic-light header controls with the common dialog titlebar.

## Dark Mode
- Deep blue/graphite base, not brown/green.
- Sidebar/topbar use translucent dark material.
- White keylines become subtle light borders.
- Category accents remain saturated enough to identify state without glowing excessively.
- Editor and reading cards remain visually distinct from navigation chrome.

## Responsive Requirements
- >= 821px: fixed/sticky sidebar + workspace.
- 621–820px: compact navigation treatment; no horizontal overflow from sidebar/admin controls.
- <= 620px: single-column content, full-width dialogs, compact topbar/search, touch targets >= 40px.
- Editor toolbar remains two rows and horizontally scrollable rather than dynamically rearranged.

## Compatibility Requirements
The following IDs and functional hooks must remain present:
- `admin-toolbar`
- `new-announcement-button`
- `quick-input-button`
- `categories-button`
- `new-week-button`
- `school-year-button`
- `theme-toggle`
- `login-button`
- `logout-button`
- `search-form`
- `search-input`
- `current-week-card`
- `category-dashboard`
- `current-announcements`
- `year-strip`
- `archive-grid`
- `announcement-dialog`
- `announcement-form`
- rich-editor IDs already covered by editor regressions

## Testing
Add a permanent source regression test that verifies:
- `macos-glossy.css` is loaded after feature styles.
- traffic-light markup is absent.
- common dialog close control is present in the announcement composer.
- required app-shell/sidebar/topbar classes and IDs remain.
- macOS-glossy CSS contains translucent sidebar/topbar, no hover translation for primary UI cards/navigation, responsive breakpoints, dark mode, and calm announcement card surfaces.
- cache version is bumped.

Run the new regression plus all existing editor regressions.

## Deployment
Commit production changes to `main`, remove temporary test/deployment helper files if any, then verify the exact final `main` SHA has a successful GitHub Pages deployment before reporting the redesign live.
