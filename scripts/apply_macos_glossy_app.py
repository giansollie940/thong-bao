from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

text = text.replace('?v=3.16.14', '?v=3.17.0')

anchor = '  <link rel="stylesheet" href="announcement-form.css?v=3.17.0">\n'
insert = anchor + '  <link rel="stylesheet" href="macos-glossy.css?v=3.17.0">\n'
if 'macos-glossy.css?v=3.17.0' not in text:
    if anchor not in text:
        raise SystemExit('announcement-form stylesheet anchor not found')
    text = text.replace(anchor, insert, 1)

pattern = re.compile(
    r'''      <header class="mac-window-header">\s*'''
    r'''<div class="mac-traffic-lights" aria-label="Điều khiển cửa sổ">\s*'''
    r'''<button class="mac-traffic-light mac-close close-dialog" type="button" aria-label="Đóng cửa sổ"></button>\s*'''
    r'''<span class="mac-traffic-light mac-minimize" aria-hidden="true"></span>\s*'''
    r'''<span class="mac-traffic-light mac-maximize" aria-hidden="true"></span>\s*'''
    r'''</div>\s*'''
    r'''<div class="mac-window-title">\s*'''
    r'''<span class="mac-window-kicker">THÔNG BÁO</span>\s*'''
    r'''<h2 id="announcement-dialog-title">Đăng thông báo mới</h2>\s*'''
    r'''</div>\s*'''
    r'''<div class="mac-window-header-spacer" aria-hidden="true"></div>\s*'''
    r'''</header>''',
    re.S,
)

replacement = '''      <header class="mac-window-header">\n        <div class="mac-window-title">\n          <span class="mac-window-kicker">THÔNG BÁO</span>\n          <h2 id="announcement-dialog-title">Đăng thông báo mới</h2>\n        </div>\n        <button class="icon-button mac-dialog-close close-dialog" type="button" aria-label="Đóng cửa sổ">×</button>\n      </header>'''

text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    if 'mac-dialog-close close-dialog' not in text:
        raise SystemExit(f'announcement traffic-light header replacement count={count}')

for obsolete in ('mac-traffic-lights', 'mac-traffic-light mac-close', 'mac-traffic-light mac-minimize', 'mac-traffic-light mac-maximize'):
    if obsolete in text:
        raise SystemExit(f'obsolete traffic-light markup remains: {obsolete}')

path.write_text(text, encoding='utf-8')
print('Patched index.html for V3.17.0 macOS glossy app')
