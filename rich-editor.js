(() => {
  "use strict";

  function create({ root, renderer, onToast = () => {} } = {}) {
    if (!root || !renderer) {
      throw new Error("Thiếu root hoặc content renderer.");
    }

    const visual = root.querySelector("#announcement-visual-editor");
    const source = root.querySelector("#announcement-content");
    const toolbar = root.querySelector("#announcement-format-toolbar");
    const status = root.querySelector("#announcement-editor-status");
    const counter = root.querySelector("#announcement-editor-count");
    const lineNumbers = root.querySelector("#announcement-html-lines");
    const tabs = [...root.querySelectorAll("[data-editor-view]")];
    const panels = [...root.querySelectorAll("[data-editor-panel]")];

    if (
      !visual ||
      !source ||
      !toolbar ||
      !status ||
      !counter ||
      !lineNumbers ||
      tabs.length !== 2 ||
      panels.length !== 2
    ) {
      throw new Error("Thiếu thành phần của rich editor.");
    }

    let currentView = "visual";
    let savedVisualRange = null;
    let savedSourceSelection = {
      start: 0,
      end: 0,
      direction: "none"
    };

    const sanitize = value => renderer.sanitizeHtml(value || "");

    function updateLineNumbers() {
      const count = Math.max(1, source.value.split("\n").length);

      lineNumbers.textContent = Array.from(
        { length: count },
        (_, index) => String(index + 1)
      ).join("\n");
    }

    function syncLineNumberScroll() {
      lineNumbers.style.transform =
        `translateY(${-source.scrollTop}px)`;
    }

    function syncVisualToSource() {
      source.value = sanitize(visual.innerHTML);
      updateLineNumbers();
      updateCounter();
    }

    function syncSourceToVisual() {
      const clean = sanitize(source.value);

      source.value = clean;
      visual.innerHTML = clean;
      savedVisualRange = null;
      savedSourceSelection = {
        start: 0,
        end: 0,
        direction: "none"
      };

      updateLineNumbers();
      updateCounter();
    }

    function currentHtml() {
      return currentView === "visual"
        ? sanitize(visual.innerHTML)
        : sanitize(source.value);
    }

    function updateCounter() {
      const text = renderer.toPlainText(
        currentHtml(),
        "html"
      );

      const chars = [...text].length;
      const words = text
        ? text.trim().split(/\s+/).filter(Boolean).length
        : 0;

      counter.textContent = `${chars} ký tự · ${words} từ`;
    }

    function setView(view, { focus = true } = {}) {
      if (!["visual", "html"].includes(view)) return;

      if (currentView === "visual" && view === "html") {
        syncVisualToSource();
      } else if (currentView === "html" && view === "visual") {
        syncSourceToVisual();
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

      status.textContent =
        view === "visual"
          ? "Soạn thảo trực quan"
          : "HTML an toàn";

      updateCounter();

      if (!focus) return;

      requestAnimationFrame(() => {
        if (view === "visual") {
          visual.focus();
        } else {
          source.focus();
          syncLineNumberScroll();
        }
      });
    }

    function rangeBelongsToVisual(range) {
      if (!range) return false;

      const node = range.commonAncestorContainer;
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? node
          : node.parentElement;

      return Boolean(
        element &&
        (element === visual || visual.contains(element))
      );
    }

    function saveVisualSelection() {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return false;

      const range = selection.getRangeAt(0);

      if (!rangeBelongsToVisual(range)) {
        return false;
      }

      savedVisualRange = range.cloneRange();
      return true;
    }

    function saveSourceSelection() {
      savedSourceSelection = {
        start: source.selectionStart ?? 0,
        end: source.selectionEnd ?? 0,
        direction:
          source.selectionDirection || "none"
      };

      return savedSourceSelection;
    }

    function captureSelection() {
      if (currentView === "visual") {
        saveVisualSelection();
        return;
      }

      saveSourceSelection();
    }

    function restoreVisualSelection({
      focus = true
    } = {}) {
      if (!savedVisualRange) return null;

      try {
        if (!rangeBelongsToVisual(savedVisualRange)) {
          return null;
        }

        const selection = window.getSelection();
        if (!selection) return null;

        if (focus) {
          try {
            visual.focus({ preventScroll: true });
          } catch {
            visual.focus();
          }
        }

        selection.removeAllRanges();
        selection.addRange(savedVisualRange);

        return savedVisualRange;
      } catch {
        savedVisualRange = null;
        return null;
      }
    }

    function restoreSourceSelection({
      focus = true
    } = {}) {
      const start = Math.min(
        savedSourceSelection.start,
        source.value.length
      );
      const end = Math.min(
        savedSourceSelection.end,
        source.value.length
      );

      if (focus) {
        try {
          source.focus({ preventScroll: true });
        } catch {
          source.focus();
        }
      }

      source.setSelectionRange(
        start,
        end,
        savedSourceSelection.direction
      );

      return {
        start,
        end,
        direction: savedSourceSelection.direction
      };
    }

    function restoreSelection(options = {}) {
      return currentView === "visual"
        ? restoreVisualSelection(options)
        : restoreSourceSelection(options);
    }

    function currentVisualRange() {
      const selection = window.getSelection();

      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);

        if (rangeBelongsToVisual(range)) {
          savedVisualRange = range.cloneRange();
          return range;
        }
      }

      return restoreVisualSelection({
        focus: false
      });
    }

    function currentSourceSelection() {
      if (document.activeElement === source) {
        saveSourceSelection();
      }

      return restoreSourceSelection({
        focus: false
      });
    }

    function selectContents(node) {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();

      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);

      savedVisualRange = range.cloneRange();
    }

    function placeCaretAfter(node) {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();

      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      savedVisualRange = range.cloneRange();
    }

    function wrapVisual(tag, placeholder) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const wrapper = document.createElement(tag);

      if (range.collapsed) {
        wrapper.textContent = placeholder;
        range.insertNode(wrapper);
      } else {
        wrapper.append(range.extractContents());
        range.insertNode(wrapper);
      }

      selectContents(wrapper);
      syncVisualToSource();
    }

    function cssTextFromObject(styles = {}) {
      return Object.entries(styles)
        .filter(([, value]) => String(value || "").trim())
        .map(([property, value]) =>
          `${property}: ${String(value).trim()}`
        )
        .join("; ");
    }

    function wrapVisualStyle(styles = {}, placeholder = "nội dung") {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const wrapper = document.createElement("span");
      const cssText = cssTextFromObject(styles);

      if (!cssText) return;

      wrapper.setAttribute("style", cssText);

      if (range.collapsed) {
        wrapper.textContent = placeholder;
        range.insertNode(wrapper);
      } else {
        wrapper.append(range.extractContents());
        range.insertNode(wrapper);
      }

      selectContents(wrapper);
      syncVisualToSource();
    }

    function closestTextBlock(node) {
      const element =
        node?.nodeType === Node.ELEMENT_NODE
          ? node
          : node?.parentElement;

      if (!element) return null;

      const block = element.closest(
        "p, h2, h3, h4, h5, li, blockquote, figcaption, td, th"
      );

      return block && visual.contains(block)
        ? block
        : null;
    }

    function blocksForVisualRange(range) {
      if (!range) return [];

      if (range.collapsed) {
        const block = closestTextBlock(
          range.startContainer
        );

        return block ? [block] : [];
      }

      const blocks = new Set();
      const walker = document.createTreeWalker(
        visual,
        NodeFilter.SHOW_TEXT
      );

      let node = walker.nextNode();

      while (node) {
        try {
          if (
            node.nodeValue?.trim() &&
            range.intersectsNode(node)
          ) {
            const block = closestTextBlock(node);

            if (block) {
              blocks.add(block);
            }
          }
        } catch {
          // Ignore detached nodes.
        }

        node = walker.nextNode();
      }

      if (!blocks.size) {
        const startBlock = closestTextBlock(
          range.startContainer
        );
        const endBlock = closestTextBlock(
          range.endContainer
        );

        if (startBlock) blocks.add(startBlock);
        if (endBlock) blocks.add(endBlock);
      }

      return [...blocks];
    }

    function applyVisualBlockStyle(styles = {}) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const blocks = blocksForVisualRange(range);

      if (!blocks.length) {
        wrapVisualStyle(styles);
        return;
      }

      for (const block of blocks) {
        for (const [property, value] of Object.entries(styles)) {
          block.style.setProperty(
            property,
            String(value || "").trim()
          );
        }
      }

      savedVisualRange = range.cloneRange();
      syncVisualToSource();
    }

    function replaceSourceWithStyle(
      styles = {},
      {
        block = false,
        placeholder = "nội dung"
      } = {}
    ) {
      const cssText = cssTextFromObject(styles);
      if (!cssText) return;

      const {
        start,
        end
      } = currentSourceSelection();
      const selected =
        source.value.slice(start, end) || placeholder;

      const tag = block ? "div" : "span";
      const html =
        `<${tag} style="${cssText}">${selected}</${tag}>`;

      source.setRangeText(
        html,
        start,
        end,
        "select"
      );

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function applyInlineStyle(styles = {}) {
      if (currentView === "visual") {
        wrapVisualStyle(styles);
      } else {
        replaceSourceWithStyle(styles);
      }
    }

    function applyBlockStyle(styles = {}) {
      if (currentView === "visual") {
        applyVisualBlockStyle(styles);
      } else {
        replaceSourceWithStyle(
          styles,
          {
            block: true,
            placeholder: "Nội dung căn chỉnh"
          }
        );
      }
    }

    function unwrapElement(element) {
      if (!element?.parentNode) return;

      while (element.firstChild) {
        element.parentNode.insertBefore(
          element.firstChild,
          element
        );
      }

      element.remove();
    }

    function clearVisualFormatting() {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      if (range.collapsed) {
        const element =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;

        const inline = element?.closest(
          "strong, b, em, i, u, s, mark, span"
        );

        if (
          inline &&
          inline !== visual &&
          visual.contains(inline)
        ) {
          unwrapElement(inline);
          syncVisualToSource();
        }

        return;
      }

      const fragment = range.extractContents();

      for (const element of [
        ...fragment.querySelectorAll("*")
      ]) {
        for (const property of [
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "color",
          "background",
          "background-color",
          "text-decoration",
          "text-decoration-line",
          "text-align"
        ]) {
          element.style.removeProperty(property);
        }

        if (!element.getAttribute("style")?.trim()) {
          element.removeAttribute("style");
        }
      }

      for (const element of [
        ...fragment.querySelectorAll(
          "strong, b, em, i, u, s, mark"
        )
      ].reverse()) {
        unwrapElement(element);
      }

      const wrapper = document.createElement("span");
      wrapper.append(fragment);
      range.insertNode(wrapper);

      selectContents(wrapper);
      syncVisualToSource();
    }

    function clearSourceFormatting() {
      const {
        start,
        end
      } = currentSourceSelection();

      if (start === end) {
        onToast(
          "Trong HTML, hãy chọn đoạn mã cần xóa định dạng."
        );
        return;
      }

      let selected = source.value.slice(start, end);

      selected = selected
        .replace(
          /<\/?(?:strong|b|em|i|u|s|mark)\b[^>]*>/gi,
          ""
        )
        .replace(
          /(<[^>]+)\sstyle=(["'])[\s\S]*?\2([^>]*>)/gi,
          "$1$3"
        );

      source.setRangeText(
        selected,
        start,
        end,
        "select"
      );

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function clearFormatting() {
      if (currentView === "visual") {
        clearVisualFormatting();
      } else {
        clearSourceFormatting();
      }
    }

    function formatVisualBlock(tag, placeholder) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const startNode = range.startContainer;
      const endNode = range.endContainer;

      const startElement =
        startNode.nodeType === Node.ELEMENT_NODE
          ? startNode
          : startNode.parentElement;

      const endElement =
        endNode.nodeType === Node.ELEMENT_NODE
          ? endNode
          : endNode.parentElement;

      const selector = "p, h2, h3, h4, h5";

      const startBlock =
        startElement?.closest(selector);
      const endBlock =
        endElement?.closest(selector);

      if (
        startBlock &&
        startBlock === endBlock &&
        startBlock !== visual &&
        visual.contains(startBlock)
      ) {
        const replacement =
          document.createElement(tag);

        while (startBlock.firstChild) {
          replacement.append(
            startBlock.firstChild
          );
        }

        if (!replacement.textContent.trim()) {
          replacement.textContent = placeholder;
        }

        startBlock.replaceWith(replacement);
        selectContents(replacement);
        syncVisualToSource();
        return;
      }

      wrapVisual(tag, placeholder);
    }

    function makeVisualList(tag) {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const selected = range.toString().trim();
      const items = selected
        ? selected
            .split(/\n+/)
            .map(value => value.trim())
            .filter(Boolean)
        : ["Mục thứ nhất", "Mục thứ hai"];

      const list = document.createElement(tag);

      for (const text of items) {
        const item = document.createElement("li");
        item.textContent = text;
        list.append(item);
      }

      range.deleteContents();
      range.insertNode(list);

      const first = list.querySelector("li");
      first
        ? selectContents(first)
        : placeCaretAfter(list);

      syncVisualToSource();
    }

    function promptSafeUrl() {
      const url = prompt(
        "Nhập địa chỉ liên kết (https://...):",
        "https://"
      );

      if (!url) return "";

      const safeUrl = renderer.safeLinkUrl(url);

      if (!safeUrl) {
        onToast("Liên kết không hợp lệ.");
        return "";
      }

      return safeUrl;
    }

    function makeVisualLink() {
      const range = currentVisualRange();

      if (!range) {
        visual.focus();
        return;
      }

      const safeUrl = promptSafeUrl();
      if (!safeUrl) return;

      const anchor = document.createElement("a");

      anchor.href = safeUrl;

      if (/^https?:\/\//i.test(safeUrl)) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }

      if (range.collapsed) {
        anchor.textContent = "tên liên kết";
        range.insertNode(anchor);
      } else {
        anchor.append(range.extractContents());
        range.insertNode(anchor);
      }

      selectContents(anchor);
      syncVisualToSource();
    }

    function replaceSourceSelection(
      before,
      after,
      placeholder
    ) {
      const {
        start,
        end
      } = currentSourceSelection();
      const selected =
        source.value.slice(start, end) || placeholder;

      source.setRangeText(
        `${before}${selected}${after}`,
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

    function makeSourceList(tag) {
      const {
        start,
        end
      } = currentSourceSelection();
      const selected =
        source.value.slice(start, end).trim();

      const items = selected
        ? selected
            .split("\n")
            .map(value => value.trim())
            .filter(Boolean)
        : ["Mục thứ nhất", "Mục thứ hai"];

      const block = [
        `<${tag}>`,
        ...items.map(item => `  <li>${item}</li>`),
        `</${tag}>`
      ].join("\n");

      source.setRangeText(
        block,
        start,
        end,
        "end"
      );

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function makeSourceLink() {
      const {
        start,
        end
      } = currentSourceSelection();
      const selected =
        source.value.slice(start, end) ||
        "tên liên kết";

      const safeUrl = promptSafeUrl();
      if (!safeUrl) return;

      const escapedUrl = safeUrl
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");

      source.setRangeText(
        `<a href="${escapedUrl}">${selected}</a>`,
        start,
        end,
        "end"
      );

      source.focus();
      source.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function applyFormat(format) {
      if (currentView === "visual") {
        if (format === "bold") {
          wrapVisual("strong", "nội dung đậm");
        } else if (format === "italic") {
          wrapVisual("em", "nội dung nghiêng");
        } else if (format === "underline") {
          wrapVisual("u", "nội dung gạch chân");
        } else if (format === "strike") {
          wrapVisual("s", "nội dung gạch ngang");
        } else if (format === "heading") {
          formatVisualBlock("h3", "Tiêu đề");
        } else if (format === "bullet") {
          makeVisualList("ul");
        } else if (format === "numbered") {
          makeVisualList("ol");
        } else if (format === "quote") {
          wrapVisual(
            "blockquote",
            "Nội dung trích dẫn"
          );
        } else if (format === "link") {
          makeVisualLink();
        }

        return;
      }

      if (format === "bold") {
        replaceSourceSelection(
          "<strong>",
          "</strong>",
          "nội dung đậm"
        );
      } else if (format === "italic") {
        replaceSourceSelection(
          "<em>",
          "</em>",
          "nội dung nghiêng"
        );
      } else if (format === "underline") {
        replaceSourceSelection(
          "<u>",
          "</u>",
          "nội dung gạch chân"
        );
      } else if (format === "strike") {
        replaceSourceSelection(
          "<s>",
          "</s>",
          "nội dung gạch ngang"
        );
      } else if (format === "heading") {
        replaceSourceSelection(
          "<h3>",
          "</h3>",
          "Tiêu đề"
        );
      } else if (format === "bullet") {
        makeSourceList("ul");
      } else if (format === "numbered") {
        makeSourceList("ol");
      } else if (format === "quote") {
        replaceSourceSelection(
          "<blockquote>",
          "</blockquote>",
          "Nội dung trích dẫn"
        );
      } else if (format === "link") {
        makeSourceLink();
      }
    }

    function pasteVisual(event) {
      event.preventDefault();

      const clipboard = event.clipboardData;
      const pastedHtml =
        clipboard?.getData("text/html") || "";
      const pastedText =
        clipboard?.getData("text/plain") || "";
      const range = currentVisualRange();

      if (!range) return;

      range.deleteContents();

      if (pastedHtml) {
        const fragment =
          range.createContextualFragment(
            sanitize(pastedHtml)
          );

        const lastNode = fragment.lastChild;

        range.insertNode(fragment);

        if (lastNode) {
          placeCaretAfter(lastNode);
        }
      } else {
        const textNode =
          document.createTextNode(pastedText);

        range.insertNode(textNode);
        placeCaretAfter(textNode);
      }

      syncVisualToSource();
    }

    function handleVisualKeydown(event) {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      if (key === "b") {
        event.preventDefault();
        wrapVisual("strong", "nội dung đậm");
      } else if (key === "i") {
        event.preventDefault();
        wrapVisual("em", "nội dung nghiêng");
      } else if (key === "u") {
        event.preventDefault();
        wrapVisual("u", "nội dung gạch chân");
      }
    }

    function handleSourceKeydown(event) {
      if (
        event.key === "Tab" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();

        source.setRangeText(
          "  ",
          source.selectionStart,
          source.selectionEnd,
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

        replaceSourceSelection(
          "<strong>",
          "</strong>",
          "nội dung đậm"
        );
      } else if (key === "i") {
        event.preventDefault();

        replaceSourceSelection(
          "<em>",
          "</em>",
          "nội dung nghiêng"
        );
      } else if (key === "u") {
        event.preventDefault();

        replaceSourceSelection(
          "<u>",
          "</u>",
          "nội dung gạch chân"
        );
      }
    }

    function handleTabKeydown(event) {
      const index = tabs.indexOf(event.currentTarget);
      if (index < 0) return;

      let next = index;

      if (event.key === "ArrowRight") {
        next = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        next =
          (index - 1 + tabs.length) %
          tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();

      setView(tabs[next].dataset.editorView);
      tabs[next].focus();
    }

    for (const tab of tabs) {
      tab.addEventListener(
        "click",
        () => setView(tab.dataset.editorView)
      );

      tab.addEventListener(
        "keydown",
        handleTabKeydown
      );
    }

    toolbar.addEventListener(
      "pointerdown",
      event => {
        captureSelection();

        if (event.target.closest("[data-format]")) {
          event.preventDefault();
        }
      }
    );

    toolbar.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest("[data-format]");

        if (button) {
          applyFormat(button.dataset.format);
        }
      }
    );

    visual.addEventListener(
      "input",
      syncVisualToSource
    );
    visual.addEventListener(
      "paste",
      pasteVisual
    );
    visual.addEventListener(
      "keydown",
      handleVisualKeydown
    );

    for (const eventName of [
      "keyup",
      "mouseup",
      "focus",
      "input"
    ]) {
      visual.addEventListener(
        eventName,
        saveVisualSelection
      );
    }

    source.addEventListener(
      "input",
      () => {
        updateLineNumbers();
        updateCounter();
      }
    );

    source.addEventListener(
      "scroll",
      syncLineNumberScroll,
      { passive: true }
    );

    for (const eventName of [
      "select",
      "keyup",
      "mouseup",
      "focus",
      "input"
    ]) {
      source.addEventListener(
        eventName,
        saveSourceSelection
      );
    }

    source.addEventListener(
      "keydown",
      handleSourceKeydown
    );

    function setHtml(
      value = "",
      { view = "visual", focus = false } = {}
    ) {
      const clean = sanitize(value);

      source.value = clean;
      visual.innerHTML = clean;

      updateLineNumbers();
      syncLineNumberScroll();
      updateCounter();
      setView(view, { focus });
    }

    function getHtml() {
      if (currentView === "visual") {
        syncVisualToSource();
      } else {
        syncSourceToVisual();
      }

      const clean = sanitize(source.value);

      source.value = clean;
      visual.innerHTML = clean;

      updateLineNumbers();
      updateCounter();

      return clean;
    }

    function clear() {
      source.value = "";
      visual.innerHTML = "";
      savedVisualRange = null;
      savedSourceSelection = {
        start: 0,
        end: 0,
        direction: "none"
      };

      updateLineNumbers();
      syncLineNumberScroll();
      setView("visual", { focus: false });
      updateCounter();
    }

    clear();

    return Object.freeze({
      setHtml,
      getHtml,
      clear,
      setView,
      getView: () => currentView,
      applyInlineStyle,
      applyBlockStyle,
      clearFormatting,
      captureSelection,
      restoreSelection,
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
