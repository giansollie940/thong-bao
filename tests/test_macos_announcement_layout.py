from pathlib import Path
import re

index = Path('index.html').read_text(encoding='utf-8')
form_css = Path('announcement-form.css').read_text(encoding='utf-8')
editor_css = Path('rich-editor.css').read_text(encoding='utf-8')

start = index.index('<dialog id="announcement-dialog"')
end = index.index('</dialog>', start)
dialog = index[start:end]

failures = []

required_html = [
    'class="mac-window-header"',
    'class="mac-traffic-lights"',
    'class="mac-traffic-light mac-close close-dialog"',
    'class="mac-traffic-light mac-minimize"',
    'class="mac-traffic-light mac-maximize"',
    'class="mac-form-section mac-form-section-primary"',
    'class="mac-form-section mac-form-section-schedule"',
    'class="mac-form-section mac-form-section-options"',
    'class="mac-editor-workspace"',
    'class="editor-view-tabs mac-segmented-control"',
    'class="modal-actions mac-modal-footer"',
]
for token in required_html:
    if token not in dialog:
        failures.append(f'html-missing:{token}')

heading_variants = [
    ('Thông tin chính', ['Thông tin chính']),
    ('Phân loại & thời gian', ['Phân loại & thời gian', 'Phân loại &amp; thời gian']),
    ('Tùy chọn', ['Tùy chọn']),
]
for label, variants in heading_variants:
    if not any(variant in dialog for variant in variants):
        failures.append(f'section-heading-missing:{label}')

for preserved_id in [
    'announcement-title', 'announcement-week', 'announcement-date',
    'announcement-category-select', 'announcement-valid-from',
    'announcement-valid-until', 'announcement-priority',
    'announcement-pinned', 'announcement-rich-editor',
    'announcement-message', 'announcement-submit-button'
]:
    if f'id="{preserved_id}"' not in dialog:
        failures.append(f'preserved-id-missing:{preserved_id}')

css_checks = {
    'traffic-red': r'\.mac-close\s*\{[^}]*#ff5f57',
    'traffic-yellow': r'\.mac-minimize\s*\{[^}]*#febc2e',
    'traffic-green': r'\.mac-maximize\s*\{[^}]*#28c840',
    'sticky-footer': r'\.mac-modal-footer\s*\{[^}]*position\s*:\s*sticky[^}]*bottom\s*:\s*0',
    'glass-header': r'\.mac-window-header\s*\{[^}]*backdrop-filter',
    'section-card': r'\.mac-form-section\s*\{[^}]*border-radius',
}
for name, pattern in css_checks.items():
    if not re.search(pattern, form_css, re.S | re.I):
        failures.append(f'css-missing:{name}')

editor_checks = {
    'segmented-control': r'\.mac-segmented-control\s*\{[^}]*border-radius',
    'editor-document': r'#announcement-dialog\s+\.canvas-rich-editor\s*\{[^}]*border-radius',
}
for name, pattern in editor_checks.items():
    if not re.search(pattern, editor_css, re.S | re.I):
        failures.append(f'editor-css-missing:{name}')

if '?v=3.16.14' not in index:
    failures.append('cache-version-not-bumped-to-3.16.14')

if failures:
    raise SystemExit('FAIL: ' + '; '.join(failures))

print('PASS: announcement dialog uses a stable macOS-style layout')
