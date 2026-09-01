from pathlib import Path

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
start = index.index('            <div\n              class="format-toolbar canvas-format-toolbar"\n              id="announcement-format-toolbar"')
end = index.index('            <section\n              class="editor-format-panel"', start)
replacement = '''            <div
              class="format-toolbar canvas-format-toolbar"
              id="announcement-format-toolbar"
              role="toolbar"
              aria-label="Định dạng nội dung thông báo"
            >
              <div class="format-toolbar-row format-toolbar-row-primary">
                <label class="format-control format-control-font"><span class="sr-only">Phông chữ</span><select id="announcement-font-family" class="format-select format-font-select" aria-label="Phông chữ" title="Phông chữ" data-editor-control="font-family"><option value="">Phông mặc định</option><option value="Arial, sans-serif">Arial</option><option value="Verdana, sans-serif">Verdana</option><option value="Trebuchet MS, sans-serif">Trebuchet MS</option><option value="Georgia, serif">Georgia</option><option value="Times New Roman, serif">Times New Roman</option><option value="Courier New, monospace">Courier New</option></select></label>
                <label class="format-control format-control-size"><span class="sr-only">Cỡ chữ</span><select id="announcement-font-size" class="format-select format-size-select" aria-label="Cỡ chữ" title="Cỡ chữ" data-editor-control="font-size"><option value="">Cỡ chữ</option><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option><option value="28px">28</option><option value="32px">32</option><option value="36px">36</option></select></label>
                <span class="format-separator" aria-hidden="true"></span>
                <button class="format-button" type="button" data-format="bold" title="In đậm (Ctrl/Cmd+B)" aria-label="In đậm"><strong>B</strong></button>
                <button class="format-button" type="button" data-format="italic" title="In nghiêng (Ctrl/Cmd+I)" aria-label="In nghiêng"><em>I</em></button>
                <button class="format-button" type="button" data-format="underline" title="Gạch chân (Ctrl/Cmd+U)" aria-label="Gạch chân"><u>U</u></button>
                <button class="format-button" type="button" data-format="strike" title="Gạch ngang" aria-label="Gạch ngang"><s>S</s></button>
                <button class="format-button format-button-wide" type="button" data-format="heading" title="Tiêu đề nhỏ" aria-label="Tiêu đề nhỏ">T</button>
                <button class="format-button format-button-wide" type="button" data-editor-clear-format title="Xóa định dạng đã chọn" aria-label="Xóa định dạng">Tx</button>
              </div>
              <div class="format-toolbar-row format-toolbar-row-secondary">
                <button class="format-button format-button-wide format-more-button" id="announcement-color-more" type="button" data-editor-format-toggle="color" aria-controls="announcement-format-panel" aria-expanded="false" title="Màu chữ và highlight" aria-label="Màu chữ và highlight">🎨 Màu</button>
                <button class="format-button format-button-wide format-more-button" id="announcement-align-more" type="button" data-editor-format-toggle="align" aria-controls="announcement-format-panel" aria-expanded="false" title="Căn lề đoạn văn" aria-label="Căn lề đoạn văn">☰ Căn</button>
                <span class="format-separator" aria-hidden="true"></span>
                <button class="format-button" type="button" data-format="bullet" title="Danh sách chấm" aria-label="Danh sách chấm">•</button>
                <button class="format-button" type="button" data-format="numbered" title="Danh sách số" aria-label="Danh sách số">1.</button>
                <button class="format-button" type="button" data-format="quote" title="Trích dẫn / ghi chú" aria-label="Trích dẫn">❝</button>
                <button class="format-button" type="button" data-format="link" title="Chèn liên kết" aria-label="Chèn liên kết">🔗</button>
                <span class="format-separator" aria-hidden="true"></span>
                <button class="format-button format-button-wide editor-find-toggle" id="announcement-find-toggle" type="button" data-editor-action="find-replace" title="Tìm và thay thế (Ctrl/Cmd+F)" aria-label="Tìm và thay thế" aria-controls="announcement-find-panel" aria-expanded="false">🔎</button>
              </div>
            </div>

'''
index = index[:start] + replacement + index[end:]
index = index.replace('?v=3.16.12', '?v=3.16.13')
index_path.write_text(index, encoding='utf-8')

js_path = Path('editor-formatting.js')
js = js_path.read_text(encoding='utf-8')
s = js.index('    function enhanceLegacyToolbar() {')
e = js.index('    enhanceLegacyToolbar();', s) + len('    enhanceLegacyToolbar();\n')
js = js[:s] + '''    function enhanceLegacyToolbar() {
      if (!toolbar || !panel) return;
      const groups = [...panel.querySelectorAll(".editor-format-panel-group")];
      if (groups.length >= 3) {
        groups[0].dataset.editorFormatSection = "align";
        groups[1].dataset.editorFormatSection = "color";
        groups[2].dataset.editorFormatSection = "color";
      }
      const hint = panel.querySelector(".editor-format-panel-hint");
      if (hint) {
        hint.textContent = "Bôi đen nội dung trước, sau đó chọn Màu hoặc Căn. Vùng chọn được giữ lại để áp dụng nhiều định dạng liên tiếp.";
      }
    }

    enhanceLegacyToolbar();
''' + js[e:]
js_path.write_text(js, encoding='utf-8')

css_path = Path('editor-formatting.css')
css = css_path.read_text(encoding='utf-8') + '''

/* V3.16.13 — fixed two-row formatting toolbar */
#announcement-format-toolbar.canvas-format-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  width: 100%;
  min-width: 0;
}
#announcement-format-toolbar .format-toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  overscroll-behavior-x: contain;
}
#announcement-format-toolbar .format-toolbar-row > * { flex: 0 0 auto; }
#announcement-format-toolbar .format-button,
#announcement-format-toolbar .format-select,
#announcement-format-toolbar .format-control { flex-shrink: 0 !important; }
#announcement-format-toolbar .format-toolbar-row::-webkit-scrollbar { height: 5px; }
#announcement-format-toolbar .format-toolbar-row-primary { padding-bottom: 1px; }
#announcement-format-toolbar .format-toolbar-row-secondary { padding-top: 1px; }
#announcement-format-toolbar .format-more-button { min-width: 92px; }
'''
css_path.write_text(css, encoding='utf-8')
