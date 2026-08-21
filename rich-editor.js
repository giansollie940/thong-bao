(() => {
  "use strict";

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value = "") {
    return escapeHtml(value);
  }

  function highlightHtmlSource(raw = "") {
    const source = String(raw);
    const tokenPattern = /<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>|<\/?[A-Za-z][^>]*>/gi;
    const out = [];
    let cursor = 0;

    for (const match of source.matchAll(tokenPattern)) {
      const index = match.index ?? 0;

      if (index > cursor) {
        out.push(
          `<span class="syntax-text">${escapeHtml(source.slice(cursor, index))}</span>`
        );
      }

      const token = match[0];

      if (/^<!--/.test(token)) {
        out.push(
          `<span class="syntax-comment">${escapeHtml(token)}</span>`
        );
      } else if (/^<!DOCTYPE/i.test(token)) {
        out.push(
          `<span class="syntax-doctype">${escapeHtml(token)}</span>`
        );
      } else {
        const tagMatch = token.match(
          /^(<\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?>)$/
        );

        if (!tagMatch) {
          out.push(
            `<span class="syntax-tag">${escapeHtml(token)}</span>`
          );
        } else {
          const [, open, tagName, rest, close] = tagMatch;

          out.push(
            `<span class="syntax-punc">${escapeHtml(open)}</span>` +
            `<span class="syntax-tag-name">${escapeHtml(tagName)}</span>` +
            `<span class="syntax-attributes">${escapeHtml(rest)}</span>` +
            `<span class="syntax-punc">${escapeHtml(close)}</span>`
          );
        }
      }

      cursor = index + token.length;
    }

    if (cursor < source.length) {
      out.push(
        `<span class="syntax-text">${escapeHtml(source.slice(cursor))}</span>`
      );
    }

    return out.join("") || " ";
  }

  function create({
    root,
    renderer,
    onToast = () => {}
  } = {}) {
    if (!root) {
      throw new Error("Rich editor cần phần tử root.");
    }

    if (!renderer) {
      throw new Error("Rich editor cần content renderer.");
    }

    const visual = root.querySelector("#announcement-visual-editor");
    const source = root.querySelector("#announcement-content");
    const preview = root.querySelector("#announcement-content-preview");
    const toolbar = root.querySelector("#announcement-format-toolbar");
    const status = root.querySelector("#announcement-editor-status");
    const counter = root.querySelector("#announcement-editor-count");
    const lineNumbers = root.querySelector("#announcement-html-lines");
    const highlight = root.querySelector("#announcement-html-highlight");
    const codeEditor = root.querySelector("#announcement-code-editor");
    const tabs = [...root.querySelectorAll("[data-editor-view]")];
    const panels = [...root.querySelectorAll("[data-editor-panel]")];

    if (
      !visual ||
      !source ||
      !preview ||
      !toolbar ||
      !status ||
      !counter ||
      !lineNumbers ||
      !highlight ||
      !codeEditor ||
      tabs.length !== 3 ||
      panels.length !== 3
    ) {
      throw new Error("Thiếu thành phần của rich editor.");
    }

    let currentView = "visual";
    let savedVisualRange = null;

    function sanitize(value = "") {
      return renderer.sanitizeHtml(value);
    }

    function getCleanSource() {
      const clean = sanitize(source.value);
      source.value = clean;
      return clean;
    }

    function syncVisualToSource() {
      source.value = sanitize(visual.innerHTML);
      updateCodeDecorations();
      updateCounter();
    }

    function syncSourceToVisual() {
      const clean = getCleanSource();
      visual.innerHTML = clean;
      updateCodeDecorations();
      updateCounter();
    }

    function updatePreview() {
      const clean = getCleanSource();

      preview.innerHTML = clean
        ? renderer.renderEditorContent(clean, "html")
        : '<p class="muted">Chưa có nội dung để xem trước.</p>';

      preview.classList.add("html-preview");
      updateCounter();
    }

    function updateCodeDecorations() {
      const value = source.value;
      const lineCount = Math.max(1, value.split("\n").length);

      lineNumbers.textContent = Array.from(
        { length: lineCount },
        (_, index) => String(index + 1)
      ).join("\n");

      highlight.innerHTML =
        highlightHtmlSource(value) +
        (value.endsWith("\n") ? "\n " : "");
    }

    function syncCodeScroll() {
      highlight.style.transform =
        `translate(${-source.scrollLeft}px, ${-source.scrollTop}px)`;

      lineNumbers.style.transform =
        `translateY(${-source.scrollTop}px)`;
    }

    function getPlainText() {
      return renderer.toPlainText(
        currentView === "visual"
          ? sanitize(visual.innerHTML)
          : sanitize(source.value),
        "html"
      );
    }

    function updateCounter() {
      const text = getPlainText();
      const chars = [...text].length;
      const words = text
        ? text.trim().split(/\s+/).filter(Boolean).length
        : 0;

      counter.textContent = `${chars} ký tự · ${words} từ`;
    }

    function updateToolbarState() {
      const previewMode = currentView === "preview";

      toolbar.classList.toggle(
        "toolbar-preview-mode",
        previewMode
      );

      for (const button of toolbar.querySelectorAll("button")) {
        button.disabled = previewMode;
      }
    }

    function setView(view, { focus = true } = {}) {
      if (!["visual", "html", "preview"].includes(view)) {
        return;
      }

      if (currentView === "visual" && view !== "visual") {
        syncVisualToSource();
      }

      if (view === "visual" && currentView !== "visual") {
        syncSourceToVisual();
      }

      if (view === "html") {
        if (currentView === "visual") {
          syncVisualToSource();
        } else {
          getCleanSource();
        }

        updateCodeDecorations();
      }

      if (view === "preview") {
        if (currentView === "visual") {
          syncVisualToSource();
        }

        updatePreview();
      }

      currentView = view;
      root.dataset.view = view;

      for (const tab of tabs) {
        const active = tab.dataset.editorView === view;

        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      }

      for (const panel of panels) {
        panel.hidden = panel.dataset.editorPanel !== view;
      }

      const labels = {
        visual: "Soạn thảo trực quan",
        html: "HTML an toàn",
        preview: "Xem trước"
      };

      status.textContent = labels[view];
      updateToolbarState();
      updateCounter();

      if (!focus) return;

      window.requestAnimationFrame(() => {
        if (view === "visual") {
          visual.focus();
        } else if (view === "html") {
          source.focus();
        } else {
          preview.focus?.();
        }
      });
    }

    function saveVisualSelection() {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;

      if (!element || !visual.contains(element)) return;

      savedVisualRange = range.cloneRange();
    }

    function restoreVisualSelection() {
      if (!savedVisualRange) return null;

      const selection = window.getSelection();
      if (!selection) return null;

      selection.removeAllRanges();
      selection.addRange(savedVisualRange);
      return savedVisualRange;
    }

    function currentVisualRange() {
      const selection = window.getSelection();

      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.ELEMENT_NODE
          ? container
          : container.parentElement;

        if (element && visual.contains(element)) {
          return range;
        }
      }

      return restoreVisualSelection();
    }

    function placeCaretAfter(node) {
      const range = document.createRange();
      const selection = window.getSelection();

      range.setStartAfter(node);
      range.collapse(true);

      selection?.removeAllRanges();
      selection?.addRange(range);

      savedVisualRange = range.cloneRange();
    }

    function selectNodeContents(node) {
      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(node);

      selection?.removeAllRanges();
      selection?.addRange(range);

      savedVisualRange = range.cloneRange();
    }

    function wrapVisualSelection(tagName, placeholder) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const wrapper = document.createElement(tagName);

      if (range.collapsed) {
        wrapper.textContent = placeholder;
        range.insertNode(wrapper);
        selectNodeContents(wrapper);
      } else {
        const fragment = range.extractContents();
        wrapper.append(fragment);
        range.insertNode(wrapper);
        selectNodeContents(wrapper);
      }

      syncVisualToSource();
    }

    function visualList(tagName) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const text = range.toString().trim();
      const lines = text
        ? text.split(/\n+/).map(line => line.trim()).filter(Boolean)
        : ["Mục thứ nhất", "Mục thứ hai"];

      const list = document.createElement(tagName);

      for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line;
        list.append(item);
      }

      range.deleteContents();
      range.insertNode(list);

      const firstItem = list.querySelector("li");
      if (firstItem) {
        selectNodeContents(firstItem);
      } else {
        placeCaretAfter(list);
      }

      syncVisualToSource();
    }

    function visualLink() {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const url = window.prompt(
        "Nhập địa chỉ liên kết (https://...):",
        "https://"
      );

      if (!url) return;

      const cleanUrl = renderer.safeLinkUrl(url);

      if (!cleanUrl) {
        onToast(
          "Liên kết chỉ hỗ trợ http://, https://, mailto:, tel: hoặc đường dẫn tương đối."
        );
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = cleanUrl;

      if (/^https?:\/\//i.test(cleanUrl)) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }

      if (range.collapsed) {
        anchor.textContent = "tên liên kết";
        range.insertNode(anchor);
        selectNodeContents(anchor);
      } else {
        anchor.append(range.extractContents());
        range.insertNode(anchor);
        selectNodeContents(anchor);
      }

      syncVisualToSource();
    }

    function replaceSourceSelection(before, after, placeholder) {
      const start = source.selectionStart;
      const end = source.selectionEnd;
      const selected = source.value.slice(start, end) || placeholder;
      const replacement = `${before}${selected}${after}`;

      source.setRangeText(
        replacement,
        start,
        end,
        "select"
      );

      if (start === end) {
        source.setSelectionRange(
          start + before.length,
          start + before.length + selected.length
        );
      }

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function sourceList(tagName) {
      const start = source.selectionStart;
      const end = source.selectionEnd;
      const selected = source.value.slice(start, end).trim();

      const items = selected
        ? selected.split("\n").map(line => line.trim()).filter(Boolean)
        : ["Mục thứ nhất", "Mục thứ hai"];

      const html = [
        `<${tagName}>`,
        ...items.map(item => `  <li>${item}</li>`),
        `</${tagName}>`
      ].join("\n");

      source.setRangeText(html, start, end, "end");
      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function sourceLink() {
      const start = source.selectionStart;
      const end = source.selectionEnd;
      const selected =
        source.value.slice(start, end) ||
        "tên liên kết";

      const url = window.prompt(
        "Nhập địa chỉ liên kết (https://...):",
        "https://"
      );

      if (!url) return;

      const cleanUrl = renderer.safeLinkUrl(url);

      if (!cleanUrl) {
        onToast(
          "Liên kết chỉ hỗ trợ http://, https://, mailto:, tel: hoặc đường dẫn tương đối."
        );
        return;
      }

      const html =
        `<a href="${escapeAttribute(cleanUrl)}">${selected}</a>`;

      source.setRangeText(
        html,
        start,
        end,
        "end"
      );

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function applyVisualFormat(format) {
      if (format === "bold") {
        wrapVisualSelection("strong", "nội dung đậm");
        return;
      }

      if (format === "italic") {
        wrapVisualSelection("em", "nội dung nghiêng");
        return;
      }

      if (format === "heading") {
        wrapVisualSelection("h3", "Tiêu đề");
        return;
      }

      if (format === "bullet") {
        visualList("ul");
        return;
      }

      if (format === "numbered") {
        visualList("ol");
        return;
      }

      if (format === "quote") {
        wrapVisualSelection(
          "blockquote",
          "Nội dung trích dẫn"
        );
        return;
      }

      if (format === "link") {
        visualLink();
      }
    }

    function applySourceFormat(format) {
      if (format === "bold") {
        replaceSourceSelection(
          "<strong>",
          "</strong>",
          "nội dung đậm"
        );
        return;
      }

      if (format === "italic") {
        replaceSourceSelection(
          "<em>",
          "</em>",
          "nội dung nghiêng"
        );
        return;
      }

      if (format === "heading") {
        replaceSourceSelection(
          "<h3>",
          "</h3>",
          "Tiêu đề"
        );
        return;
      }

      if (format === "bullet") {
        sourceList("ul");
        return;
      }

      if (format === "numbered") {
        sourceList("ol");
        return;
      }

      if (format === "quote") {
        replaceSourceSelection(
          "<blockquote>",
          "</blockquote>",
          "Nội dung trích dẫn"
        );
        return;
      }

      if (format === "link") {
        sourceLink();
      }
    }

    function applyFormat(format) {
      if (currentView === "preview") {
        setView("visual");
      }

      if (currentView === "html") {
        applySourceFormat(format);
      } else {
        applyVisualFormat(format);
      }
    }

    function insertSanitizedPaste(event) {
      event.preventDefault();

      const clipboard = event.clipboardData;
      const html = clipboard?.getData("text/html") || "";
      const text = clipboard?.getData("text/plain") || "";
      const range = currentVisualRange();

      if (!range) return;

      range.deleteContents();

      if (html) {
        const clean = sanitize(html);
        const fragment =
          range.createContextualFragment(clean);

        const marker = document.createTextNode("");
        fragment.append(marker);
        range.insertNode(fragment);
        placeCaretAfter(marker);
        marker.remove();
      } else {
        const node = document.createTextNode(text);
        range.insertNode(node);
        placeCaretAfter(node);
      }

      syncVisualToSource();
    }

    function handleVisualShortcut(event) {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      if (key === "b") {
        event.preventDefault();
        applyVisualFormat("bold");
      }

      if (key === "i") {
        event.preventDefault();
        applyVisualFormat("italic");
      }
    }

    function handleSourceShortcut(event) {
      if (event.key === "Tab" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();

        const start = source.selectionStart;
        const end = source.selectionEnd;

        source.setRangeText(
          "  ",
          start,
          end,
          "end"
        );

        source.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      if (key === "b") {
        event.preventDefault();
        applySourceFormat("bold");
      }

      if (key === "i") {
        event.preventDefault();
        applySourceFormat("italic");
      }
    }

    function handleTabKeyboard(event) {
      const activeIndex = tabs.indexOf(event.target);
      if (activeIndex < 0) return;

      let nextIndex = activeIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (activeIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (activeIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      setView(nextTab.dataset.editorView);
      nextTab.focus();
    }

    function bindEvents() {
      for (const tab of tabs) {
        tab.addEventListener("click", () => {
          setView(tab.dataset.editorView);
        });

        tab.addEventListener(
          "keydown",
          handleTabKeyboard
        );
      }

      toolbar.addEventListener(
        "pointerdown",
        event => {
          if (event.target.closest("[data-format]")) {
            event.preventDefault();
          }
        }
      );

      toolbar.addEventListener("click", event => {
        const button =
          event.target.closest("[data-format]");

        if (!button || button.disabled) return;
        applyFormat(button.dataset.format);
      });

      visual.addEventListener(
        "input",
        syncVisualToSource
      );

      visual.addEventListener(
        "paste",
        insertSanitizedPaste
      );

      visual.addEventListener(
        "keydown",
        handleVisualShortcut
      );

      for (const type of [
        "keyup",
        "mouseup",
        "focus",
        "input"
      ]) {
        visual.addEventListener(
          type,
          saveVisualSelection
        );
      }

      source.addEventListener("input", () => {
        updateCodeDecorations();
        updateCounter();
      });

      source.addEventListener(
        "scroll",
        syncCodeScroll,
        { passive: true }
      );

      source.addEventListener(
        "keydown",
        handleSourceShortcut
      );

      window.addEventListener(
        "resize",
        syncCodeScroll,
        { passive: true }
      );
    }

    function setHtml(value = "", {
      view = "visual",
      focus = false
    } = {}) {
      const clean = sanitize(value);

      source.value = clean;
      visual.innerHTML = clean;

      updateCodeDecorations();
      syncCodeScroll();
      updateCounter();
      setView(view, { focus });
    }

    function getHtml() {
      if (currentView === "visual") {
        syncVisualToSource();
      }

      const clean = getCleanSource();

      if (currentView === "visual") {
        visual.innerHTML = clean;
      }

      updateCodeDecorations();
      updateCounter();

      return clean;
    }

    function clear() {
      source.value = "";
      visual.innerHTML = "";
      preview.innerHTML = "";
      savedVisualRange = null;

      updateCodeDecorations();
      syncCodeScroll();
      setView("visual", { focus: false });
      updateCounter();
    }

    bindEvents();
    clear();

    return Object.freeze({
      setHtml,
      getHtml,
      clear,
      setView,
      getView: () => currentView,
      focus: () => {
        if (currentView === "html") {
          source.focus();
        } else {
          visual.focus();
        }
      }
    });
  }

  window.WeeklyRichEditor = Object.freeze({
    create
  });
})();
