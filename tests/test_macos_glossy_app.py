from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CSS_PATH = ROOT / "macos-glossy.css"


def test_macos_glossy_whole_app_contract():
    assert CSS_PATH.exists(), "macos-glossy.css must exist as the final visual layer"
    css = CSS_PATH.read_text(encoding="utf-8")

    # Final visual layer and cache version.
    assert 'announcement-form.css?v=3.17.0' in INDEX
    assert 'macos-glossy.css?v=3.17.0' in INDEX
    assert INDEX.index('macos-glossy.css?v=3.17.0') > INDEX.index('announcement-form.css?v=3.17.0')
    assert '?v=3.16.14' not in INDEX

    # The newly approved direction removes macOS traffic-light controls.
    for obsolete in (
        'mac-traffic-lights',
        'mac-traffic-light',
        'mac-close',
        'mac-minimize',
        'mac-maximize',
    ):
        assert obsolete not in INDEX, f"obsolete traffic-light markup remains: {obsolete}"

    assert re.search(
        r'class="[^"]*mac-dialog-close[^"]*close-dialog[^"]*"[^>]*>×</button>',
        INDEX,
    ), "announcement composer must use a normal top-right close button"

    # Existing functional shell and hooks must remain intact.
    for required in (
        'class="app-shell"',
        'class="app-sidebar"',
        'class="app-topbar"',
        'id="admin-toolbar"',
        'id="new-announcement-button"',
        'id="quick-input-button"',
        'id="categories-button"',
        'id="new-week-button"',
        'id="school-year-button"',
        'id="theme-toggle"',
        'id="login-button"',
        'id="logout-button"',
        'id="search-form"',
        'id="search-input"',
        'id="current-week-card"',
        'id="category-dashboard"',
        'id="current-announcements"',
        'id="year-strip"',
        'id="archive-grid"',
        'id="announcement-dialog"',
        'id="announcement-form"',
    ):
        assert required in INDEX, f"required functional hook missing: {required}"

    # Visual-system essentials.
    for required_css in (
        '.app-sidebar',
        '.app-topbar',
        '.announcement-card',
        '.modal-card',
        '.mac-dialog-close',
        'backdrop-filter:',
        'html[data-theme="dark"]',
        '@media (max-width: 820px)',
        '@media (max-width: 620px)',
    ):
        assert required_css in css, f"macOS glossy layer missing: {required_css}"

    # Primary interactive targets must not move away from the pointer.
    forbidden_hover_motion = (
        r'\.sidebar-link:hover\s*\{[^}]*transform\s*:\s*translate',
        r'\.sidebar-action:hover\s*\{[^}]*transform\s*:\s*translate',
        r'\.announcement-card:hover\s*\{[^}]*transform\s*:\s*translate',
        r'\.category-filter:hover\s*\{[^}]*transform\s*:\s*translate',
    )
    for pattern in forbidden_hover_motion:
        assert not re.search(pattern, css, re.S), f"moving hover target found: {pattern}"

    # Announcement reading surface should stay neutral rather than become a saturated gradient panel.
    announcement_rule = re.search(r'\.announcement-card\s*\{([^}]*)\}', css, re.S)
    assert announcement_rule, "announcement-card override missing"
    rule = announcement_rule.group(1)
    assert 'var(--mac-card)' in rule or 'var(--surface-solid)' in rule


if __name__ == "__main__":
    test_macos_glossy_whole_app_contract()
    print("PASS: whole app follows the approved macOS glossy contract")
