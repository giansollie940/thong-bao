(() => {
  "use strict";

  function create({ root, onToast = () => {} } = {}) {
    if (!root) {
      throw new Error("Thiếu root của rich editor.");
    }

    const visual = root.querySelector("#announcement-visual-editor");
    const source = root.querySelector("#announcement-content");
    const toggle = root.querySelector("#announcement-find-toggle");
    const panel = root.querySelector("#announcement-find-panel");
    const findInput = root.querySelector("#announcement-find-text");
    const replaceInput = root.querySelector("#announcement-replace-text");
    const caseInput = root.querySelector("#announcement-find-case");
    const resultStatus = root.querySelector("#announcement-find-status");
    const previousButton = root.querySelector("#announcement-find-prev");
    const nextButton = root.querySelector("#announcement-find-next");
    const replaceButton = root.querySelector("#announcement-replace-one");
    const replaceAllButton = root.querySelector("#announcement-replace-all");
    const closeButton = root.querySelector("#announcement-find-close");

    if (
      !visual || !source || !toggle || !panel || !findInput ||
      !replaceInput || !caseInput || !resultStatus ||
      !previousButton || !nextButton || !replaceButton ||
      !replaceAllButton || !closeButton
    ) {
      throw new Error("Thiếu thành phần Find & Replace của rich editor.");
    }

    let matches = [];
    let currentIndex = -1;
    let cacheKey = "";

    function view() {
      return root.dataset.view === "html"
        ? "html"
        : "visual";
    }

    function normalized(value) {
      const text = String(value ?? "");

      return caseInput.checked
        ? text
        : text.toLocaleLowerCase("vi");
    }

    function query() {
      return findInput.value;
    }

    function findOffsets(text, needle) {
      if (!needle) return [];

      const haystack = normalized(text);
      const target = normalized(needle);
      const results = [];
      let from = 0;

      while (from <= haystack.length - target.length) {
        const index = haystack.indexOf(target, from);
        if (index < 0) break;

        results.push({
          start: index,
          end: index + needle.length
        });

        from = index + Math.max(1, target.length);
      }

      return results;
    }

    function visualMatches() {
      const results = [];
      const walker = document.createTreeWalker(
        visual,
        NodeFilter.SHOW_TEXT
      );

      let node = walker.nextNode();

      while (node) {
        const text = node.nodeValue || "";

        for (const offset of findOffsets(text, query())) {
          results.push({
            mode: "visual",
            node,
            start: offset.start,
            end: offset.end
          });
        }

        node = walker.nextNode();
      }

      return results;
    }

    function sourceMatches() {
      return findOffsets(
        source.value,
        query()
      ).map(offset => ({
        mode: "html",
        start: offset.start,
        end: offset.end
      }));
    }

    function fingerprint() {
      return view() === "html"
        ? source.value
        : visual.innerHTML;
    }

    function makeCacheKey() {
      return JSON.stringify([
        view(),
        query(),
        caseInput.checked,
        fingerprint()
      ]);
    }

    function setStatus(message) {
      resultStatus.textContent = message;
    }

    function rebuild({ force = false, announce = true } = {}) {
      const nextKey = makeCacheKey();

      if (!force && nextKey === cacheKey) {
        return matches;
      }

      cacheKey = nextKey;
      currentIndex = -1;

      if (!query()) {
        matches = [];

        if (announce) {
          setStatus("Nhập nội dung cần tìm.");
        }

        return matches;
      }

      matches = view() === "html"
        ? sourceMatches()
        : visualMatches();

      if (announce) {
        setStatus(
          matches.length
            ? `${matches.length} kết quả`
            : "Không tìm thấy kết quả."
        );
      }

      return matches;
    }

    function selectVisualMatch(match) {
      if (!match?.node?.isConnected) return false;

      const range = document.createRange();
      const selection = window.getSelection();

      if (!selection) return false;

      range.setStart(match.node, match.start);
      range.setEnd(match.node, match.end);

      try {
        visual.focus({ preventScroll: true });
      } catch {
        visual.focus();
      }

      selection.removeAllRanges();
      selection.addRange(range);

      match.node.parentElement?.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });

      return true;
    }

    function selectSourceMatch(match) {
      if (!match) return false;

      source.focus();
      source.setSelectionRange(
        match.start,
        match.end
      );

      return true;
    }

    function selectCurrent() {
      const match = matches[currentIndex];
      if (!match) return false;

      const selected = match.mode === "html"
        ? selectSourceMatch(match)
        : selectVisualMatch(match);

      if (selected) {
        setStatus(
          `${currentIndex + 1}/${matches.length} kết quả`
        );
      }

      return selected;
    }

    function move(direction) {
      rebuild();

      if (!matches.length) return false;

      if (currentIndex < 0) {
        currentIndex = direction < 0
          ? matches.length - 1
          : 0;
      } else {
        currentIndex = (
          currentIndex + direction + matches.length
        ) % matches.length;
      }

      return selectCurrent();
    }

    function selectedEditorText() {
      if (view() === "html") {
        return source.value.slice(
          source.selectionStart,
          source.selectionEnd
        );
      }

      const selection = window.getSelection();
      if (!selection?.rangeCount) return "";

      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const element = node.nodeType === Node.ELEMENT_NODE
        ? node
        : node.parentElement;

      if (!element || !visual.contains(element)) {
        return "";
      }

      return selection.toString();
    }

    function open({ focusReplace = false } = {}) {
      const selected = selectedEditorText();

      if (
        !findInput.value &&
        selected &&
        selected.length <= 180 &&
        !selected.includes("\n")
      ) {
        findInput.value = selected;
      }

      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");

      cacheKey = "";
      rebuild({ force: true });

      requestAnimationFrame(() => {
        const target = focusReplace
          ? replaceInput
          : findInput;

        target.focus();
        target.select();
      });
    }

    function close({ returnFocus = true } = {}) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");

      if (returnFocus) {
        requestAnimationFrame(() => toggle.focus());
      }
    }

    function dispatchEditorInput(target) {
      target.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    function replaceCurrent() {
      rebuild();

      if (!matches.length) return;

      if (currentIndex < 0) {
        move(1);
        return;
      }

      const match = matches[currentIndex];
      const replacement = replaceInput.value;
      const oldIndex = currentIndex;

      if (match.mode === "html") {
        source.setRangeText(
          replacement,
          match.start,
          match.end,
          "end"
        );

        dispatchEditorInput(source);
      } else if (match.node?.isConnected) {
        const text = match.node.nodeValue || "";

        match.node.nodeValue =
          text.slice(0, match.start) +
          replacement +
          text.slice(match.end);

        dispatchEditorInput(visual);
      } else {
        cacheKey = "";
        rebuild({ force: true });
        return;
      }

      cacheKey = "";
      rebuild({ force: true, announce: false });

      if (!matches.length) {
        setStatus("Đã thay 1 kết quả · không còn kết quả nào.");
        currentIndex = -1;
        return;
      }

      currentIndex = Math.min(
        oldIndex,
        matches.length - 1
      );

      selectCurrent();
    }

    function replaceAll() {
      rebuild();

      if (!matches.length) return;

      const replacement = replaceInput.value;
      const count = matches.length;

      if (view() === "html") {
        let value = source.value;

        for (const match of [...matches].reverse()) {
          value =
            value.slice(0, match.start) +
            replacement +
            value.slice(match.end);
        }

        source.value = value;
        dispatchEditorInput(source);
      } else {
        const grouped = new Map();

        for (const match of matches) {
          if (!match.node?.isConnected) continue;

          if (!grouped.has(match.node)) {
            grouped.set(match.node, []);
          }

          grouped.get(match.node).push(match);
        }

        for (const [node, nodeMatches] of grouped) {
          let value = node.nodeValue || "";

          for (const match of [...nodeMatches].reverse()) {
            value =
              value.slice(0, match.start) +
              replacement +
              value.slice(match.end);
          }

          node.nodeValue = value;
        }

        dispatchEditorInput(visual);
      }

      cacheKey = "";
      rebuild({ force: true, announce: false });
      currentIndex = -1;

      setStatus(`Đã thay ${count} kết quả.`);
      onToast(`Đã thay ${count} kết quả.`);
    }

    function reset() {
      findInput.value = "";
      replaceInput.value = "";
      caseInput.checked = false;
      matches = [];
      currentIndex = -1;
      cacheKey = "";
      setStatus("Nhập nội dung cần tìm.");
      close({ returnFocus: false });
    }

    toggle.addEventListener("pointerdown", event => {
      event.preventDefault();
    });

    toggle.addEventListener("click", () => {
      if (panel.hidden) {
        open();
      } else {
        close();
      }
    });

    closeButton.addEventListener("click", () => close());
    previousButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    replaceButton.addEventListener("click", replaceCurrent);
    replaceAllButton.addEventListener("click", replaceAll);

    findInput.addEventListener("input", () => {
      cacheKey = "";
      currentIndex = -1;
      rebuild({ force: true });
    });

    caseInput.addEventListener("change", () => {
      cacheKey = "";
      currentIndex = -1;
      rebuild({ force: true });
    });

    findInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        move(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    replaceInput.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        replaceCurrent();
      }
    });

    root.addEventListener(
      "keydown",
      event => {
        if (!(event.ctrlKey || event.metaKey)) return;

        const key = event.key.toLowerCase();

        if (key === "f") {
          event.preventDefault();
          open();
        } else if (key === "h") {
          event.preventDefault();
          open({ focusReplace: true });
        }
      },
      true
    );

    root.addEventListener("click", event => {
      if (event.target.closest("[data-editor-view]")) {
        requestAnimationFrame(() => {
          cacheKey = "";
          currentIndex = -1;

          if (!panel.hidden) {
            rebuild({ force: true });
          }
        });
      }
    });

    visual.addEventListener("input", () => {
      cacheKey = "";
      currentIndex = -1;

      if (!panel.hidden) {
        rebuild({ force: true });
      }
    });

    source.addEventListener("input", () => {
      cacheKey = "";
      currentIndex = -1;

      if (!panel.hidden) {
        rebuild({ force: true });
      }
    });

    reset();

    return Object.freeze({
      open,
      close,
      reset,
      findNext: () => move(1),
      findPrevious: () => move(-1),
      replaceCurrent,
      replaceAll
    });
  }

  window.WeeklyFindReplace = Object.freeze({
    create
  });
})();
