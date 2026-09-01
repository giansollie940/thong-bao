from pathlib import Path
import re

index = Path('index.html').read_text(encoding='utf-8')
js = Path('editor-formatting.js').read_text(encoding='utf-8')
css = Path('editor-formatting.css').read_text(encoding='utf-8')

start = index.index('id="announcement-format-toolbar"')
end = index.index('</div>\n\n            <section\n              class="editor-format-panel"', start)
toolbar = index[start:end]

failures = []

if toolbar.count('format-toolbar-row') != 4:
    failures.append('toolbar-must-have-exactly-two-row-class-attributes')

if 'format-toolbar-row-primary' not in toolbar:
    failures.append('missing-primary-row')
if 'format-toolbar-row-secondary' not in toolbar:
    failures.append('missing-secondary-row')

primary = re.search(r'<div[^>]*format-toolbar-row-primary[^>]*>(.*?)</div>', toolbar, re.S)
secondary = re.search(r'<div[^>]*format-toolbar-row-secondary[^>]*>(.*?)</div>', toolbar, re.S)
if not primary:
    failures.append('primary-row-not-static-html')
if not secondary:
    failures.append('secondary-row-not-static-html')

primary_text = primary.group(1) if primary else ''
secondary_text = secondary.group(1) if secondary else ''

for token in [
    'announcement-font-family',
    'announcement-font-size',
    'data-format="bold"',
    'data-format="italic"',
    'data-format="underline"',
    'data-format="strike"',
    'data-format="heading"',
    'data-editor-clear-format',
]:
    if token not in primary_text:
        failures.append(f'primary-missing:{token}')

for token in [
    'id="announcement-color-more"',
    'id="announcement-align-more"',
    'data-format="bullet"',
    'data-format="numbered"',
    'data-format="quote"',
    'data-format="link"',
    'id="announcement-find-toggle"',
]:
    if token not in secondary_text:
        failures.append(f'secondary-missing:{token}')

if 'id="announcement-format-more"' in toolbar:
    failures.append('legacy-combined-color-align-button-still-present')

for forbidden in [
    'colorToggle.id = "announcement-color-more"',
    'document.createElement("button")',
    'colorToggle.after(alignToggle)',
    'heading.before(colorToggle)',
]:
    if forbidden in js:
        failures.append(f'dynamic-toolbar-mutation:{forbidden}')

required_css = [
    '.format-toolbar-row',
    'flex-wrap: nowrap',
    'overflow-x: auto',
    'flex: 0 0 auto',
]
for token in required_css:
    if token not in css:
        failures.append(f'css-missing:{token}')

if failures:
    raise SystemExit('FAIL: ' + '; '.join(failures))

print('PASS: toolbar uses two fixed rows without dynamic button relocation')
