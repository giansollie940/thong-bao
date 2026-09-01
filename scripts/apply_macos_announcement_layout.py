from pathlib import Path

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

index = index.replace('?v=3.16.13', '?v=3.16.14')

old_header = '''      <div class="modal-heading">
        <div>
          <p class="eyebrow">THÔNG BÁO</p>
          <h2 id="announcement-dialog-title">Đăng thông báo mới</h2>
        </div>
        <button class="icon-button close-dialog" type="button" aria-label="Đóng cửa sổ">×</button>
      </div>

      <div class="form-grid">
'''
new_header = '''      <header class="mac-window-header">
        <div class="mac-traffic-lights" aria-label="Điều khiển cửa sổ">
          <button class="mac-traffic-light mac-close close-dialog" type="button" aria-label="Đóng cửa sổ"></button>
          <span class="mac-traffic-light mac-minimize" aria-hidden="true"></span>
          <span class="mac-traffic-light mac-maximize" aria-hidden="true"></span>
        </div>
        <div class="mac-window-title">
          <span class="mac-window-kicker">THÔNG BÁO</span>
          <h2 id="announcement-dialog-title">Đăng thông báo mới</h2>
        </div>
        <div class="mac-window-header-spacer" aria-hidden="true"></div>
      </header>

      <div class="form-grid mac-form-grid">
        <section class="mac-form-section mac-form-section-primary">
          <div class="mac-section-heading">
            <span class="mac-section-icon" aria-hidden="true">✦</span>
            <div><h3>Thông tin chính</h3><p>Nội dung nhận diện và tuần đăng.</p></div>
          </div>
          <div class="mac-section-grid">
'''
if old_header not in index:
    raise SystemExit('announcement header anchor not found')
index = index.replace(old_header, new_header, 1)

week_to_date = '''        <div class="field field-span-2">
          <label for="announcement-week">Đăng vào tuần</label>
          <select id="announcement-week" required></select>
          <p class="field-hint">Bạn có thể chọn tuần hiện tại, tuần sau hoặc bất kỳ tuần nào đã tạo.</p>
        </div>

        <div class="field">
          <label for="announcement-date">Ngày / mốc thông báo</label>
'''
week_to_date_new = '''        <div class="field field-span-2">
          <label for="announcement-week">Đăng vào tuần</label>
          <select id="announcement-week" required></select>
          <p class="field-hint">Bạn có thể chọn tuần hiện tại, tuần sau hoặc bất kỳ tuần nào đã tạo.</p>
        </div>
          </div>
        </section>

        <section class="mac-form-section mac-form-section-schedule">
          <div class="mac-section-heading">
            <span class="mac-section-icon" aria-hidden="true">◷</span>
            <div><h3>Phân loại &amp; thời gian</h3><p>Ngày thông báo, chuyên mục và thời gian hiệu lực.</p></div>
          </div>
          <div class="mac-section-grid mac-section-grid-two">
        <div class="field">
          <label for="announcement-date">Ngày / mốc thông báo</label>
'''
if week_to_date not in index:
    raise SystemExit('week/date anchor not found')
index = index.replace(week_to_date, week_to_date_new, 1)

valid_to_priority = '''        <div class="field">
          <label for="announcement-valid-until">Hiệu lực đến</label>
          <input id="announcement-valid-until" type="date" required>
        </div>

        <div class="field">
          <label for="announcement-priority">Mức độ</label>
'''
valid_to_priority_new = '''        <div class="field">
          <label for="announcement-valid-until">Hiệu lực đến</label>
          <input id="announcement-valid-until" type="date" required>
        </div>
          </div>
        </section>

        <section class="mac-form-section mac-form-section-options">
          <div class="mac-section-heading">
            <span class="mac-section-icon" aria-hidden="true">⌘</span>
            <div><h3>Tùy chọn</h3><p>Ưu tiên hiển thị và ghim thông báo.</p></div>
          </div>
          <div class="mac-section-grid mac-section-grid-two mac-options-grid">
        <div class="field">
          <label for="announcement-priority">Mức độ</label>
'''
if valid_to_priority not in index:
    raise SystemExit('valid/priority anchor not found')
index = index.replace(valid_to_priority, valid_to_priority_new, 1)

pinned_to_editor = '''        <div class="field checkbox-field">
          <input id="announcement-pinned" type="checkbox">
          <label for="announcement-pinned">Ghim lên đầu tuần</label>
        </div>

        <div class="field field-span-2">
          <div class="editor-label-row">
'''
pinned_to_editor_new = '''        <div class="field checkbox-field">
          <input id="announcement-pinned" type="checkbox">
          <label for="announcement-pinned">Ghim lên đầu tuần</label>
        </div>
          </div>
        </section>

        <section class="mac-editor-workspace">
        <div class="field field-span-2">
          <div class="editor-label-row">
'''
if pinned_to_editor not in index:
    raise SystemExit('pinned/editor anchor not found')
index = index.replace(pinned_to_editor, pinned_to_editor_new, 1)

index = index.replace('class="editor-view-tabs" role="tablist" aria-label="Chế độ trình soạn thảo"', 'class="editor-view-tabs mac-segmented-control" role="tablist" aria-label="Chế độ trình soạn thảo"', 1)

remove_image_to_grid_close = '''        <div class="field field-span-2 checkbox-field image-remove-row hidden" id="announcement-remove-image-row">
          <input id="announcement-remove-image" type="checkbox">
          <label for="announcement-remove-image">Xóa ảnh hiện tại khi lưu</label>
        </div>
      </div>

      <p class="form-message" id="announcement-message" aria-live="polite"></p>

      <div class="modal-actions">
        <button class="button button-secondary close-dialog" type="button">Hủy</button>
        <button class="button button-primary" type="submit">Lưu thông báo</button>
      </div>
'''
remove_image_to_grid_close_new = '''        <div class="field field-span-2 checkbox-field image-remove-row hidden" id="announcement-remove-image-row">
          <input id="announcement-remove-image" type="checkbox">
          <label for="announcement-remove-image">Xóa ảnh hiện tại khi lưu</label>
        </div>
        </section>
      </div>

      <div class="modal-actions mac-modal-footer">
        <p class="form-message" id="announcement-message" aria-live="polite"></p>
        <div class="mac-footer-actions">
          <button class="button button-secondary close-dialog" type="button">Hủy</button>
          <button class="button button-primary" id="announcement-submit-button" type="submit">Lưu thông báo</button>
        </div>
      </div>
'''
if remove_image_to_grid_close not in index:
    raise SystemExit('footer anchor not found')
index = index.replace(remove_image_to_grid_close, remove_image_to_grid_close_new, 1)

index_path.write_text(index, encoding='utf-8')

form_css_path = Path('announcement-form.css')
form_css = form_css_path.read_text(encoding='utf-8')
form_css += r'''

/* =========================================================
   V3.16.14 — macOS-inspired announcement composer
   ========================================================= */
#announcement-dialog::backdrop {
  background: rgba(15, 20, 28, .48);
  -webkit-backdrop-filter: blur(10px) saturate(115%);
  backdrop-filter: blur(10px) saturate(115%);
}

#announcement-dialog .modal-card {
  padding: 0;
  border: 1px solid rgba(119, 130, 146, .24);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface-solid) 96%, #f4f5f7);
  box-shadow: 0 28px 80px rgba(14, 22, 34, .28), 0 2px 10px rgba(14, 22, 34, .12);
}

.mac-window-header {
  position: sticky;
  z-index: 25;
  top: 0;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) 112px;
  align-items: center;
  min-height: 66px;
  padding: 10px 18px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
  background: color-mix(in srgb, var(--surface-solid) 78%, transparent);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
}

.mac-traffic-lights {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mac-traffic-light {
  display: inline-block;
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .09);
}
.mac-close { background: #ff5f57; cursor: pointer; }
.mac-minimize { background: #febc2e; }
.mac-maximize { background: #28c840; }
.mac-close:hover, .mac-close:focus-visible, .mac-close:active { transform: none !important; filter: brightness(.95); }
.mac-close:focus-visible { outline: 3px solid color-mix(in srgb, #ff5f57 28%, transparent); outline-offset: 3px; }

.mac-window-title { min-width: 0; text-align: center; }
.mac-window-title h2 { margin: 1px 0 0; font-size: 1rem; font-weight: 760; letter-spacing: -.01em; }
.mac-window-kicker { display: block; color: var(--muted); font-size: .62rem; font-weight: 800; letter-spacing: .12em; }

#announcement-dialog .mac-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 18px 20px 10px;
}

.mac-form-section {
  min-width: 0;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
  border-radius: 15px;
  background: color-mix(in srgb, var(--surface-solid) 88%, var(--surface-soft));
  box-shadow: 0 1px 2px rgba(20, 31, 45, .04), inset 0 1px 0 rgba(255, 255, 255, .62);
}

.mac-section-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}
.mac-section-heading h3 { margin: 0; font-size: .9rem; font-weight: 800; }
.mac-section-heading p { margin: 2px 0 0; color: var(--muted); font-size: .72rem; }
.mac-section-icon {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  color: var(--brand-strong);
  background: color-mix(in srgb, var(--brand-soft) 62%, #fff);
  font-size: .8rem;
}

.mac-section-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.mac-section-grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.mac-section-grid .field-span-2 { grid-column: 1 / -1; }

.mac-form-section input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
.mac-form-section select {
  min-height: 38px;
  border-radius: 9px;
  border-color: color-mix(in srgb, var(--line) 84%, #aeb4bc);
  background: color-mix(in srgb, var(--surface-solid) 94%, #f4f5f7);
  box-shadow: inset 0 1px 1px rgba(16, 24, 36, .03);
}

.mac-form-section input:focus,
.mac-form-section select:focus {
  outline: 0;
  border-color: color-mix(in srgb, var(--brand) 52%, #7b8a9c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 16%, transparent);
}

.mac-options-grid .checkbox-field { padding-top: 24px; }

.mac-editor-workspace {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
.mac-editor-workspace > .field { margin-top: 12px; }
.mac-editor-workspace > .field:first-child { margin-top: 0; }

.mac-modal-footer {
  position: sticky;
  z-index: 30;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 66px;
  margin-top: 8px;
  padding: 10px 20px;
  border-top: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
  background: color-mix(in srgb, var(--surface-solid) 82%, transparent);
  -webkit-backdrop-filter: blur(24px) saturate(145%);
  backdrop-filter: blur(24px) saturate(145%);
}
.mac-modal-footer .form-message { flex: 1 1 auto; margin: 0; font-size: .75rem; }
.mac-footer-actions { display: flex; align-items: center; gap: 9px; margin-left: auto; }
.mac-footer-actions .button { min-height: 36px; border-radius: 9px; padding: 7px 15px; }

html[data-theme="dark"] #announcement-dialog .modal-card,
html[data-theme="dark"] .mac-window-header,
html[data-theme="dark"] .mac-modal-footer {
  background: color-mix(in srgb, #20242a 88%, transparent);
}
html[data-theme="dark"] .mac-form-section { background: #272c32; border-color: #3b424b; box-shadow: inset 0 1px 0 rgba(255,255,255,.035); }
html[data-theme="dark"] .mac-section-icon { background: #303b3a; }

@media (max-width: 720px) {
  .mac-window-header { grid-template-columns: 82px minmax(0, 1fr) 82px; min-height: 58px; padding-inline: 14px; }
  #announcement-dialog .mac-form-grid { padding: 12px; gap: 11px; }
  .mac-form-section { padding: 13px; border-radius: 13px; }
  .mac-section-grid-two { grid-template-columns: 1fr; }
  .mac-section-grid .field-span-2 { grid-column: auto; }
  .mac-options-grid .checkbox-field { padding-top: 2px; }
  .mac-modal-footer { padding: 9px 12px; }
}

@media (max-width: 480px) {
  .mac-window-header { grid-template-columns: 68px minmax(0, 1fr) 68px; }
  .mac-window-kicker { display: none; }
  .mac-traffic-lights { gap: 6px; }
  .mac-traffic-light { width: 11px; height: 11px; flex-basis: 11px; }
  .mac-modal-footer { align-items: stretch; flex-direction: column; gap: 7px; }
  .mac-footer-actions { width: 100%; }
  .mac-footer-actions .button { flex: 1 1 0; }
}
'''
form_css_path.write_text(form_css, encoding='utf-8')

editor_css_path = Path('rich-editor.css')
editor_css = editor_css_path.read_text(encoding='utf-8')
editor_css += r'''

/* V3.16.14 — macOS editor surface */
.mac-segmented-control {
  width: min(320px, calc(100% - 24px));
  margin: 10px auto 8px;
  padding: 3px;
  gap: 3px;
  border: 1px solid color-mix(in srgb, var(--line) 78%, #c6c9ce);
  border-radius: 9px;
  background: color-mix(in srgb, var(--surface-soft) 82%, #e9eaec);
  box-shadow: inset 0 1px 2px rgba(20, 28, 38, .06);
}
.mac-segmented-control .editor-view-tab {
  min-height: 30px;
  padding: 4px 12px;
  border-radius: 7px;
  font-size: .76rem;
  font-weight: 760;
}
.mac-segmented-control .editor-view-tab::after { display: none; }
.mac-segmented-control .editor-view-tab.active {
  border-color: color-mix(in srgb, var(--line) 64%, #d5d8dc);
  background: var(--surface-solid);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(20, 29, 40, .12), inset 0 1px 0 rgba(255,255,255,.7);
}

#announcement-dialog .canvas-rich-editor {
  border: 1px solid color-mix(in srgb, var(--line) 86%, #b9bec5);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-solid) 97%, #f7f7f8);
  box-shadow: 0 8px 28px rgba(20, 29, 40, .08), inset 0 1px 0 rgba(255,255,255,.72);
}
#announcement-dialog .canvas-format-toolbar {
  background: color-mix(in srgb, var(--surface-soft) 76%, #f1f1f2);
  border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
}
#announcement-dialog .visual-rich-editor { background: color-mix(in srgb, var(--surface-solid) 98%, #fbfbfc); }
#announcement-dialog .editor-statusbar { min-height: 30px; background: color-mix(in srgb, var(--surface-soft) 72%, #f4f4f5); font-size: .68rem; }
#announcement-dialog .editor-view-tab:is(:hover,:active,:focus-visible),
#announcement-dialog .format-button:is(:hover,:active,:focus-visible) { transform: none !important; }

html[data-theme="dark"] .mac-segmented-control { background: #1d2025; border-color: #3a4149; }
html[data-theme="dark"] .mac-segmented-control .editor-view-tab.active { background: #343a42; border-color: #4a535d; color: #f2f4f6; }
html[data-theme="dark"] #announcement-dialog .canvas-rich-editor { background: #20242a; border-color: #3b434c; }
'''
editor_css_path.write_text(editor_css, encoding='utf-8')
