(() => {
  "use strict";

  function create({ root, renderer, onToast = () => {} } = {}) {
    if (!root || !renderer) {
      throw new Error("Thiáº¿u root hoáº·c content renderer.");
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
      throw new Error("Thiáº¿u thÃ nh pháº§n cá»§a rich editor.");
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

      counter.textContent = `${chars} kÃ½ tá»± Â· ${words} tá»«`;
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
          ? "Soáº¡n tháº£o trá»±c quan"
          : "HTML an toÃ n";

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

    function visualHasFocus() {
      const active = document.activeElement;
      return Boolean(
        active &&
        (active === visual || visual.contains(active))
      );
    }

    function saveVisualSelection() {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return false;

      const range = selection.getRangeAt(0);

      if (!rangeBelongsToVisual(range)) {
        return false;
      }

      /*
       * Toolbar controls can move focus away from contenteditable and
       * leave a collapsed caret behind. Do not let that transient caret
       * overwrite a meaningful highlighted range that we already saved.
       */
      if (
        range.collapsed &&
        savedVisualRange &&
        !savedVisualRange.collapsed &&
        !visualHasFocus()
      ) {
        return false;
      }

      savedVisualRange = range.cloneRange();
      return true;
    }

    function saveSourceSelection() {
      const nextSelection = {
        start: source.selectionStart ?? 0,
        end: source.selectionEnd ?? 0,
        direction:
          source.selectionDirection || "none"
      };

      /* Preserve a non-empty HTML selection while a toolbar control owns focus. */
      if (
        nextSelection.start === nextSelection.end &&
        savedSourceSelection.start !== savedSourceSelection.end &&
        document.activeElement !== source
      ) {
        return savedSourceSelection;
      }

      savedSourceSelection = nextSelection;
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
        ).join("; ");
    }

    function wrapVisualStyle(styles = {}, placeholder = "ná»™i dung") {
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
        placeholder = "ná»™i dung"
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
        `<$µ¨Ý[OH‰ØÜÜÕ^H‰ÜÙ[XÝYOÉÝYßO˜Â‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
ˆ[ˆÝ\ˆ[™ˆœÙ[XÝ‚ˆ
NÂ‚ˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂˆB‚ˆ[˜Ý[Ûˆ\R[›[™TÝ[JÝ[\ÈHßJHÂˆYˆ
Ý\œ™[šY]ÈOOHš\ÝX[ŠHÂˆÜ˜\š\ÝX[Ý[JÝ[\ÊNÂˆH[ÙHÂˆ™\XÙTÛÝ\˜ÙUÚ]Ý[JÝ[\ÊNÂˆBˆB‚ˆ[˜Ý[Ûˆ\P›ØÚÔÝ[JÝ[\ÈHßJHÂˆYˆ
Ý\œ™[šY]ÈOOHš\ÝX[ŠHÂˆ\Uš\ÝX[›ØÚÔÝ[JÝ[\ÊNÂˆH[ÙHÂˆ™\XÙTÛÝ\˜ÙUÚ]Ý[JˆÝ[\ËˆÂˆ›ØÚÎˆYKˆXÙZÛ\Žˆ“¸næZH[™Èñ ÛˆÚ8nâ[š‚ˆBˆ
NÂˆBˆB‚ˆ[˜Ý[Ûˆ[Ü˜\[[Y[
[[Y[
HÂˆYˆ
Y[[Y[Ëœ\™[›ÙJH™]\›ŽÂ‚ˆÚ[H
[[Y[™š\œÝÚ[
HÂˆ[[Y[œ\™[›ÙKš[œÙ\™Y›Ü™Jˆ[[Y[™š\œÝÚ[ˆ[[Y[ˆ
NÂˆB‚ˆ[[Y[œ™[[Ý™J
NÂˆB‚ˆ[˜Ý[ÛˆÛX\•š\ÝX[›Ü›X][™Ê
HÂˆÛÛœÝ˜[™ÙHHÝ\œ™[š\ÝX[˜[™ÙJ
NÂ‚ˆYˆ
\˜[™ÙJHÂˆš\ÝX[™›ØÝ\Ê
NÂˆ™]\›ŽÂˆB‚ˆYˆ
˜[™ÙK˜ÛÛ\ÙY
HÂˆÛÛœÝ[[Y[Bˆ˜[™ÙKœÝ\ÛÛZ[™\‹››ÙU\HOOH›ÙK‘SSQS•Ó“ÑBˆÈ˜[™ÙKœÝ\ÛÛZ[™\‚ˆˆ˜[™ÙKœÝ\ÛÛZ[™\‹œ\™[[[Y[Â‚ˆÛÛœÝ[›[™HH[[Y[Ë˜ÛÜÙ\Ý
ˆœÝ›Û™Ë‹[KKKËX\šËÜ[ˆ‚ˆ
NÂ‚ˆYˆ
ˆ[›[™H	‰‚ˆ[›[™HOOHš\ÝX[	‰‚ˆš\ÝX[˜ÛÛZ[œÊ[›[™JBˆ
HÂˆ[Ü˜\[[Y[
[›[™JNÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆB‚ˆ™]\›ŽÂˆB‚ˆÛÛœÝœ˜YÛY[H˜[™ÙK™^˜XÝÛÛ[Ê
NÂ‚ˆ›Üˆ
ÛÛœÝ[[Y[ÙˆÂˆ‹‹™œ˜YÛY[œ]Y\žTÙ[XÝÜ[
ŠˆŠBˆJHÂˆ›Üˆ
ÛÛœÝ›Ü\HÙˆÂˆ™›ÛY˜[Z[H‹ˆ™›Û\Ú^™H‹ˆ™›Û]ÙZYÚ‹ˆ™›Û\Ý[H‹ˆ˜ÛÛÜˆ‹ˆ˜˜XÚÙÜ›Ý[™‹ˆ˜˜XÚÙÜ›Ý[™XÛÛÜˆ‹ˆ^YXÛÜ˜][Ûˆ‹ˆ^YXÛÜ˜][Û‹[[™H‹ˆ^X[YÛˆ‚ˆJHÂˆ[[Y[œÝ[Kœ™[[Ý™T›Ü\J›Ü\JNÂˆB‚ˆYˆ
Y[[Y[™Ù]]šX]JœÝ[HŠOËš[J
JHÂˆ[[Y[œ™[[Ý™P]šX]JœÝ[HŠNÂˆBˆB‚ˆ›Üˆ
ÛÛœÝ[[Y[ÙˆÂˆ‹‹™œ˜YÛY[œ]Y\žTÙ[XÝÜ[
ˆœÝ›Û™Ë‹[KKKËX\šÈ‚ˆ
BˆKœ™]™\œÙJ
JHÂˆ[Ü˜\[[Y[
[[Y[
NÂˆB‚ˆÛÛœÝÜ˜\\ˆHØÝ[Y[˜Ü™X]Q[[Y[
œÜ[ˆŠNÂˆÜ˜\\‹˜\[™
œ˜YÛY[
NÂˆ˜[™ÙKš[œÙ\›ÙJÜ˜\\ŠNÂ‚ˆÙ[XÝÛÛ[ÊÜ˜\\ŠNÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆB‚ˆ[˜Ý[ÛˆÛX\”ÛÝ\˜ÙQ›Ü›X][™Ê
HÂˆÛÛœÝÂˆÝ\ˆ[™ˆHHÝ\œ™[ÛÝ\˜ÙTÙ[XÝ[ÛŠ
NÂ‚ˆYˆ
Ý\OOH[™
HÂˆÛ•Ø\Ý
ˆ•›Û™ÈS0èÞHÚ8nã[ˆ1$[øn¨[ˆpèÈøn©Ûˆ0ìØH1$xnâÛš8n¨[™Ëˆ‚ˆ
NÂˆ™]\›ŽÂˆB‚ˆ]Ù[XÝYHÛÝ\˜ÙK˜[YKœÛXÙJÝ\[™
NÂ‚ˆÙ[XÝYHÙ[XÝYˆœ™\XÙJˆÏÏÊÎœÝ›Û™ßŸ[___ßX\šÊW–×—J‹ÙÚKˆˆ‚ˆ
Bˆœ™\XÙJˆÊ×—JÊWÜÝ[OJÈ‰×JV×××J×Š×—JŠKÙÚKˆ‰IÈ‚ˆ
NÂ‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
ˆÙ[XÝYˆÝ\ˆ[™ˆœÙ[XÝ‚ˆ
NÂ‚ˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂˆB‚ˆ[˜Ý[ÛˆÛX\‘›Ü›X][™Ê
HÂˆYˆ
Ý\œ™[šY]ÈOOHš\ÝX[ŠHÂˆÛX\•š\ÝX[›Ü›X][™Ê
NÂˆH[ÙHÂˆÛX\”ÛÝ\˜ÙQ›Ü›X][™Ê
NÂˆB‚ˆB‚ˆ[˜Ý[Ûˆ›Ü›X]š\ÝX[›ØÚÊYËXÙZÛ\ŠHÂˆÛÛœÝ˜[™ÙHHÝ\œ™[š\ÝX[˜[™ÙJ
NÂ‚ˆYˆ
\˜[™ÙJHÂˆš\ÝX[™›ØÝ\Ê
NÂˆ™]\›ŽÂˆB‚ˆÛÛœÝ›ØÚÈHÛÜÙ\Ý^›ØÚÊ˜[™ÙKœÝ\ÛÛZ[™\ŠNÂ‚ˆYˆ
›ØÚÊHÂˆÛÛœÝ™\XÙ[Y[HØÝ[Y[˜Ü™X]Q[[Y[
YÊNÂ‚ˆÚ[H
›ØÚË™š\œÝÚ[
HÂˆ™\XÙ[Y[˜\[™
›ØÚË™š\œÝÚ[
NÂˆB‚ˆ›ØÚËœ™\XÙUÚ]
™\XÙ[Y[
NÂˆÙ[XÝÛÛ[Ê™\XÙ[Y[
NÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆ™]\›ŽÂˆB‚ˆÜ˜\š\ÝX[
YËXÙZÛ\ŠNÂˆB‚ˆ[˜Ý[Ûˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠ™Y›Ü™KY\‹XÙZÛ\ŠHÂˆÛÛœÝÂˆÝ\ˆ[™ˆHHÝ\œ™[ÛÝ\˜ÙTÙ[XÝ[ÛŠ
NÂˆÛÛœÝÙ[XÝYHÛÝ\˜ÙK˜[YKœÛXÙJÝ\[™
HXÙZÛ\ŽÂˆÛÛœÝ[H	Ø™Y›Ü™_IÜÙ[XÝYIØY\ŸXÂ‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
[Ý\[™œÙ[XÝŠNÂˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂˆB‚ˆ[˜Ý[ÛˆXZÙUš\ÝX[\Ý
YÊHÂˆÛÛœÝ˜[™ÙHHÝ\œ™[š\ÝX[˜[™ÙJ
NÂ‚ˆYˆ
\˜[™ÙJHÂˆš\ÝX[™›ØÝ\Ê
NÂˆ™]\›ŽÂˆB‚ˆÛÛœÝ^H˜[™ÙKÔÝš[™Ê
Kš[J
H“]á»¥XÈ[šðèXÚŽÂˆÛÛœÝ[™\ÈH^ˆœÜ]
×ŠËÊBˆ›X\
[™HOˆ[™Kš[J
JBˆ™š[\Š›ÛÛX[ŠNÂ‚ˆÛÛœÝ\ÝHØÝ[Y[˜Ü™X]Q[[Y[
YÊNÂ‚ˆ›Üˆ
ÛÛœÝ[™HÙˆ[™\ÊHÂˆÛÛœÝ][HHØÝ[Y[˜Ü™X]Q[[Y[
›HŠNÂˆ][K^ÛÛ[H[™NÂˆ\Ý˜\[™
][JNÂˆB‚ˆ˜[™ÙK™[]PÛÛ[Ê
NÂˆ˜[™ÙKš[œÙ\›ÙJ\Ý
NÂˆÙ[XÝÛÛ[Ê\Ý
NÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆB‚ˆ[˜Ý[ÛˆXZÙTÛÝ\˜ÙS\Ý
YÊHÂˆÛÛœÝÂˆÝ\ˆ[™ˆHHÝ\œ™[ÛÝ\˜ÙTÙ[XÝ[ÛŠ
NÂ‚ˆÛÛœÝ^HÛÝ\˜ÙK˜[YKœÛXÙJÝ\[™
Kš[J
H“xnéXÈ[šðèXÚŽÂˆÛÛœÝ[™\ÈH^ˆœÜ]
×ŠËÊBˆ›X\
[™HOˆ[™Kš[J
JBˆ™š[\Š›ÛÛX[ŠNÂˆÛÛœÝ[H	ÝYßO‰Û[™\Ë›X\
[™HOˆO‰Ü™[™\™\‹™\ØØ\R[
[™J_OÛO˜
Kš›Ú[ŠˆŠ_OÉÝYßO˜Â‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
[Ý\[™œÙ[XÝŠNÂˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂˆB‚ˆ[˜Ý[Ûˆ˜[Y]S[šÊ˜[YJHÂˆÛÛœÝ˜]ÈHÝš[™Ê˜[YHˆŠKš[J
NÂˆYˆ
\˜]ÊH™]\›ˆˆŽÂ‚ˆžHÂˆYˆ
ˆ˜]ËœÝ\ÕÚ]
ˆÈŠHˆ˜]ËœÝ\ÕÚ]
‹ÈŠHˆ˜]ËœÝ\ÕÚ]
‹‹ÈŠHˆ˜]ËœÝ\ÕÚ]
‹‹‹ÈŠBˆ
HÂˆ™]\›ˆ˜]ÎÂˆB‚ˆÛÛœÝ\›H™]ÈT“
˜]ÊNÂ‚ˆ™]\›ˆÈšˆ‹šÎˆ‹›XZ[Îˆ‹[ˆ—Kš[˜ÛY\Ê\›œ›ÝØÛÛ
BˆÈ˜]ÂˆˆˆŽÂˆHØ]ÚÂˆ™]\›ˆˆŽÂˆBˆB‚ˆ[˜Ý[ÛˆXZÙUš\ÝX[[šÊ
HÂˆÛÛœÝ˜[™ÙHHÝ\œ™[š\ÝX[˜[™ÙJ
NÂˆYˆ
\˜[™ÙJH™]\›ŽÂ‚ˆÛÛœÝÙ[XÝYH˜[™ÙKÔÝš[™Ê
H›pê›ˆøn¯ÝŽÂˆÛÛœÝ™YˆH˜[Y]S[šÊ›Û\
“š8n«\0ê›ˆøn¯Ý8nçÈ1$pè›È
Î‹ËË‹‹ŠNˆŠJNÂ‚ˆYˆ
Z™YŠHÂˆÛ•Ø\Ý
“pê›ˆøn¯ÝÚpí™È8nèÜ8náËˆŠNÂˆ™]\›ŽÂˆB‚ˆÛÛœÝ[šÈHØÝ[Y[˜Ü™X]Q[[Y[
˜HŠNÂˆ[šËš™YˆH™YŽÂˆ[šË^ÛÛ[HÙ[XÝYÂˆ[šËœ™[H››ÛÜ[™\ˆ›Ü™Y™\œ™\ˆŽÂˆ[šË\™Ù]H—Ø›[šÈŽÂ‚ˆ˜[™ÙK™[]PÛÛ[Ê
NÂˆ˜[™ÙKš[œÙ\›ÙJ[šÊNÂˆÙ[XÝÛÛ[Ê[šÊNÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆB‚ˆ[˜Ý[ÛˆXZÙTÛÝ\˜ÙS[šÊ
HÂˆÛÛœÝÂˆÝ\ˆ[™ˆHHÝ\œ™[ÛÝ\˜ÙTÙ[XÝ[ÛŠ
NÂˆÛÛœÝÙ[XÝYHÛÝ\˜ÙK˜[YKœÛXÙJÝ\[™
H›pê›ˆøn¯ÝŽÂˆÛÛœÝ™YˆH˜[Y]S[šÊ›Û\
“š8n«\0ê›ˆøn¯Ý8nçÈ1$pè›È
Î‹ËË‹‹ŠNˆŠJNÂ‚ˆYˆ
Z™YŠHÂˆÛ•Ø\Ý
“pê›ˆøn¯ÝÚpí™È8nèÜ8náËˆŠNÂˆ™]\›ŽÂˆB‚ˆÛÛœÝ[HH™YH‰Ü™[™\™\‹™\ØØ\R[
™YŠ_Hˆ\™Ù]H—Ø›[šÈˆ™[H››ÛÜ[™\ˆ›Ü™Y™\œ™\ˆ‰ÜÙ[XÝYOØO˜Â‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
[Ý\[™œÙ[XÝŠNÂˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂˆB‚ˆ[˜Ý[Ûˆ\Q›Ü›X]
›Ü›X]
HÂˆYˆ
Ý\œ™[šY]ÈOOHš\ÝX[ŠHÂˆYˆ
›Ü›X]OOH˜›ÛŠHÂˆÜ˜\š\ÝX[
œÝ›Û™È‹›¸næZH[™È1$xn«[HŠNÂˆH[ÙHYˆ
›Ü›X]OOHš][XÈŠHÂˆÜ˜\š\ÝX[
™[H‹›¸næZH[™È™Úpê›™ÈŠNÂˆH[ÙHYˆ
›Ü›X]OOH[™\›[™HŠHÂˆÜ˜\š\ÝX[
H‹›¸næZH[™Èøn¨XÚÚ0è›ˆŠNÂˆH[ÙHYˆ
›Ü›X]OOHœÝšZÙHŠHÂˆÜ˜\š\ÝX[
œÈ‹›¸næZH[™Èøn¨XÚ™Ø[™ÈŠNÂˆH[ÙHYˆ
›Ü›X]OOHšXY[™ÈŠHÂˆ›Ü›X]š\ÝX[›ØÚÊšÈ‹•pêH1$xnàHŠNÂˆH[ÙHYˆ
›Ü›X]OOH˜[]ŠHÂˆXZÙUš\ÝX[\Ý
[ŠNÂˆH[ÙHYˆ
›Ü›X]OOH›[X™\™YŠHÂˆXZÙUš\ÝX[\Ý
›ÛŠNÂˆH[ÙHYˆ
›Ü›X]OOHœ][ÝHŠHÂˆÜ˜\š\ÝX[
ˆ˜›ØÚÜ][ÝH‹ˆ“¸næZH[™È°ëXÚ8nªÛˆ‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOH›[šÈŠHÂˆXZÙUš\ÝX[[šÊ
NÂˆB‚ˆ™]\›ŽÂˆB‚ˆYˆ
›Ü›X]OOH˜›ÛŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆÝ›Û™Ïˆ‹ˆÜÝ›Û™Ïˆ‹ˆ›¸næZH[™È1$xn«[H‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOHš][XÈŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆ[Oˆ‹ˆÙ[Oˆ‹ˆ›¸næZH[™È™Úpê›™È‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOH[™\›[™HŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆOˆ‹ˆÝOˆ‹ˆ›¸næZH[™Èøn¨XÚÚ0è›ˆ‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOHœÝšZÙHŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆÏˆ‹ˆÜÏˆ‹ˆ›¸næZH[™Èøn¨XÚ™Ø[™È‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOHšXY[™ÈŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆÏˆ‹ˆÚÏˆ‹ˆ•0êH1$xnàH‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOH˜[]ŠHÂˆXZÙTÛÝ\˜ÙS\Ý
[ŠNÂˆH[ÙHYˆ
›Ü›X]OOH›[X™\™YŠHÂˆXZÙTÛÝ\˜ÙS\Ý
›ÛŠNÂˆH[ÙHYˆ
›Ü›X]OOHœ][ÝHŠHÂˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆ›ØÚÜ][ÝOˆ‹ˆØ›ØÚÜ][ÝOˆ‹ˆ“¸næZH[™È°ëXÚ8nªÛˆ‚ˆ
NÂˆH[ÙHYˆ
›Ü›X]OOH›[šÈŠHÂˆXZÙTÛÝ\˜ÙS[šÊ
NÂˆBˆB‚ˆ[˜Ý[Ûˆ\ÝUš\ÝX[
]™[
HÂˆ]™[œ™]™[Y˜][

NÂ‚ˆÛÛœÝÛ\›Ø\™H]™[˜Û\›Ø\™]NÂˆÛÛœÝ\ÝY[BˆÛ\›Ø\™Ë™Ù]]J^Ú[ŠHˆŽÂˆÛÛœÝ\ÝY^BˆÛ\›Ø\™Ë™Ù]]J^ÜZ[ˆŠHˆŽÂˆÛÛœÝ˜[™ÙHHÝ\œ™[š\ÝX[˜[™ÙJ
NÂ‚ˆYˆ
\˜[™ÙJH™]\›ŽÂ‚ˆ˜[™ÙK™[]PÛÛ[Ê
NÂ‚ˆYˆ
\ÝY[
HÂˆÛÛœÝœ˜YÛY[Bˆ˜[™ÙK˜Ü™X]PÛÛ^X[œ˜YÛY[
ˆØ[š]^™J\ÝY[
Bˆ
NÂˆÛÛœÝ\Ý›ÙHHœ˜YÛY[›\ÝÚ[Â‚ˆ˜[™ÙKš[œÙ\›ÙJœ˜YÛY[
NÂ‚ˆYˆ
\Ý›ÙJHÂˆXÙPØ\™]Y\Š\Ý›ÙJNÂˆBˆH[ÙHÂˆÛÛœÝ^›ÙHBˆØÝ[Y[˜Ü™X]U^›ÙJ\ÝY^
NÂ‚ˆ˜[™ÙKš[œÙ\›ÙJ^›ÙJNÂˆXÙPØ\™]Y\Š^›ÙJNÂˆB‚ˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆB‚ˆ[˜Ý[Ûˆ[™Uš\ÝX[Ù^YÝÛŠ]™[
HÂˆYˆ
J]™[˜Ý›Ù^H]™[›Y]RÙ^JJH™]\›ŽÂ‚ˆÛÛœÝÙ^HH]™[šÙ^KÓÝÙ\Ø\ÙJ
NÂ‚ˆYˆ
Ù^HOOH˜ˆŠHÂˆ]™[œ™]™[Y˜][

NÂˆÜ˜\š\ÝX[
œÝ›Û™È‹›¸næZH[™È1$xn«[HŠNÂˆH[ÙHYˆ
Ù^HOOHšHŠHÂˆ]™[œ™]™[Y˜][

NÂˆÜ˜\š\ÝX[
™[H‹›¸næZH[™È™Úpê›™ÈŠNÂˆH[ÙHYˆ
Ù^HOOHHŠHÂˆ]™[œ™]™[Y˜][

NÂˆÜ˜\š\ÝX[
H‹›¸næZH[™Èøn¨XÚÚ0è›ˆŠNÂˆBˆB‚ˆ[˜Ý[Ûˆ[™TÛÝ\˜ÙRÙ^YÝÛŠ]™[
HÂˆYˆ
ˆ]™[šÙ^HOOH•Xˆˆ	‰‚ˆY]™[˜Ý›Ù^H	‰‚ˆY]™[›Y]RÙ^Bˆ
HÂˆ]™[œ™]™[Y˜][

NÂ‚ˆÛÝ\˜ÙKœÙ]˜[™ÙU^
ˆˆ‹ˆÛÝ\˜ÙKœÙ[XÝ[Û”Ý\ˆÛÝ\˜ÙKœÙ[XÝ[Û‘[™ˆ™[™‚ˆ
NÂ‚ˆÛÝ\˜ÙK™\Ü]Ú]™[
ˆ™]È]™[
š[œ]‹ÈX˜›\ÎˆYHJBˆ
NÂ‚ˆ™]\›ŽÂˆB‚ˆYˆ
J]™[˜Ý›Ù^H]™[›Y]RÙ^JJH™]\›ŽÂ‚ˆÛÛœÝÙ^HH]™[šÙ^KÓÝÙ\Ø\ÙJ
NÂ‚ˆYˆ
Ù^HOOH˜ˆŠHÂˆ]™[œ™]™[Y˜][

NÂ‚ˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆÝ›Û™Ïˆ‹ˆÜÝ›Û™Ïˆ‹ˆ›¸næZH[™È1$xn«[H‚ˆ
NÂˆH[ÙHYˆ
Ù^HOOHšHŠHÂˆ]™[œ™]™[Y˜][

NÂ‚ˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆ[Oˆ‹ˆÙ[Oˆ‹ˆ›¸næZH[™È™Úpê›™È‚ˆ
NÂˆH[ÙHYˆ
Ù^HOOHHŠHÂˆ]™[œ™]™[Y˜][

NÂ‚ˆ™\XÙTÛÝ\˜ÙTÙ[XÝ[ÛŠˆOˆ‹ˆÝOˆ‹ˆ›¸næZH[™Èøn¨XÚÚ0è›ˆ‚ˆ
NÂˆBˆB‚ˆ[˜Ý[Ûˆ[™UX’Ù^YÝÛŠ]™[
HÂˆÛÛœÝ[™^HXœËš[™^ÙŠ]™[˜Ý\œ™[\™Ù]
NÂˆYˆ
[™^
H™]\›ŽÂ‚ˆ]™^H[™^Â‚ˆYˆ
]™[šÙ^HOOH\œ›ÝÔšYÚŠHÂˆ™^H
[™^
ÈJH	HXœË›[™ÝÂˆH[ÙHYˆ
]™[šÙ^HOOH\œ›ÝÓYŠHÂˆ™^Bˆ
[™^HH
ÈXœË›[™Ý
H	BˆXœË›[™ÝÂˆH[ÙHYˆ
]™[šÙ^HOOH’ÛYHŠHÂˆ™^HÂˆH[ÙHYˆ
]™[šÙ^HOOH‘[™ŠHÂˆ™^HXœË›[™ÝHNÂˆH[ÙHÂˆ™]\›ŽÂˆB‚ˆ]™[œ™]™[Y˜][

NÂ‚ˆÙ]šY]ÊXœÖÛ™^K™]\Ù]™Y]Ü•šY]ÊNÂˆXœÖÛ™^K™›ØÝ\Ê
NÂˆB‚ˆ›Üˆ
ÛÛœÝXˆÙˆXœÊHÂˆX‹˜Y]™[\Ý[™\Šˆ˜ÛXÚÈ‹ˆ

HOˆÙ]šY]ÊX‹™]\Ù]™Y]Ü•šY]ÊBˆ
NÂ‚ˆX‹˜Y]™[\Ý[™\ŠˆšÙ^YÝÛˆ‹ˆ[™UX’Ù^YÝÛ‚ˆ
NÂˆB‚ˆÛÛ˜\‹˜Y]™[\Ý[™\ŠˆœÚ[\™ÝÛˆ‹ˆ]™[OˆÂˆØ\\™TÙ[XÝ[ÛŠ
NÂ‚ˆYˆ
]™[\™Ù]˜ÛÜÙ\Ý
–Ù]KY›Ü›X]HŠJHÂˆ]™[œ™]™[Y˜][

NÂˆBˆBˆ
NÂ‚ˆÛÛ˜\‹˜Y]™[\Ý[™\Šˆ˜ÛXÚÈ‹ˆ]™[OˆÂˆÛÛœÝ]ÛˆBˆ]™[\™Ù]˜ÛÜÙ\Ý
–Ù]KY›Ü›X]HŠNÂ‚ˆYˆ
]ÛŠHÂˆ\Q›Ü›X]
]Û‹™]\Ù]™›Ü›X]
NÂˆBˆBˆ
NÂ‚ˆš\ÝX[˜Y]™[\Ý[™\Šˆš[œ]‹ˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙBˆ
NÂˆš\ÝX[˜Y]™[\Ý[™\Šˆœ\ÝH‹ˆ\ÝUš\ÝX[ˆ
NÂˆš\ÝX[˜Y]™[\Ý[™\ŠˆšÙ^YÝÛˆ‹ˆ[™Uš\ÝX[Ù^YÝÛ‚ˆ
NÂ‚ˆ›Üˆ
ÛÛœÝ]™[˜[YHÙˆÂˆšÙ^]\‹ˆ›[Ý\Ù]\‹ˆ™›ØÝ\È‹ˆš[œ]‚ˆJHÂˆš\ÝX[˜Y]™[\Ý[™\Šˆ]™[˜[YKˆØ]™Uš\ÝX[Ù[XÝ[Û‚ˆ
NÂˆB‚ˆÛÝ\˜ÙK˜Y]™[\Ý[™\Šˆš[œ]‹ˆ

HOˆÂˆ\]S[™S[X™\œÊ
NÂˆ\]PÛÝ[\Š
NÂˆBˆ
NÂ‚ˆÛÝ\˜ÙK˜Y]™[\Ý[™\ŠˆœØÜ›Û‹ˆÞ[˜Ó[™S[X™\”ØÜ›ÛˆÈ\ÜÚ]™NˆYHBˆ
NÂ‚ˆ›Üˆ
ÛÛœÝ]™[˜[YHÙˆÂˆœÙ[XÝ‹ˆšÙ^]\‹ˆ›[Ý\Ù]\‹ˆ™›ØÝ\È‹ˆš[œ]‚ˆJHÂˆÛÝ\˜ÙK˜Y]™[\Ý[™\Šˆ]™[˜[YKˆØ]™TÛÝ\˜ÙTÙ[XÝ[Û‚ˆ
NÂˆB‚ˆÛÝ\˜ÙK˜Y]™[\Ý[™\ŠˆšÙ^YÝÛˆ‹ˆ[™TÛÝ\˜ÙRÙ^YÝÛ‚ˆ
NÂ‚ˆ[˜Ý[ÛˆÙ][
ˆ˜[YHHˆ‹ˆÈšY]ÈHš\ÝX[‹›ØÝ\ÈH˜[ÙHHHßBˆ
HÂˆÛÛœÝÛX[ˆHØ[š]^™J˜[YJNÂ‚ˆÛÝ\˜ÙK˜[YHHÛX[ŽÂˆš\ÝX[š[›™\’SHÛX[ŽÂ‚ˆ\]S[™S[X™\œÊ
NÂˆÞ[˜Ó[™S[X™\”ØÜ›Û

NÂˆ\]PÛÝ[\Š
NÂˆÙ]šY]ÊšY]ËÈ›ØÝ\ÈJNÂˆB‚ˆ[˜Ý[ÛˆÙ][

HÂˆYˆ
Ý\œ™[šY]ÈOOHš\ÝX[ŠHÂˆÞ[˜Õš\ÝX[ÔÛÝ\˜ÙJ
NÂˆH[ÙHÂˆÞ[˜ÔÛÝ\˜ÙUÕš\ÝX[

NÂˆB‚ˆÛÛœÝÛX[ˆHØ[š]^™JÛÝ\˜ÙK˜[YJNÂ‚ˆÛÝ\˜ÙK˜[YHHÛX[ŽÂˆš\ÝX[š[›™\’SHÛX[ŽÂ‚ˆ\]S[™S[X™\œÊ
NÂˆ\]PÛÝ[\Š
NÂ‚ˆ™]\›ˆÛX[ŽÂˆB‚ˆ[˜Ý[ÛˆÛX\Š
HÂˆÛÝ\˜ÙK˜[YHHˆŽÂˆš\ÝX[š[›™\’SHˆŽÂˆØ]™Yš\ÝX[˜[™ÙHH[ÂˆØ]™YÛÝ\˜ÙTÙ[XÝ[ÛˆHÂˆÝ\ˆˆ[™ˆˆ\™XÝ[ÛŽˆ››Û™H‚ˆNÂ‚ˆ\]S[™S[X™\œÊ
NÂˆÞ[˜Ó[™S[X™\”ØÜ›Û

NÂˆÙ]šY]Êš\ÝX[‹È›ØÝ\Îˆ˜[ÙHJNÂˆ\]PÛÝ[\Š
NÂˆB‚ˆÛX\Š
NÂ‚ˆ™]\›ˆØš™XÝ™œ™Y^™JÂˆÙ][ˆÙ][ˆÛX\‹ˆÙ]šY]ËˆÙ]šY]Îˆ

HOˆÝ\œ™[šY]Ëˆ\R[›[™TÝ[Kˆ\P›ØÚÔÝ[KˆÛX\‘›Ü›X][™ËˆØ\\™TÙ[XÝ[Û‹ˆ™\ÝÜ™TÙ[XÝ[Û‹ˆ›ØÝ\Îˆ

HOˆÂˆYˆ
Ý\œ™[šY]ÈOOHš[ŠHÂˆÛÝ\˜ÙK™›ØÝ\Ê
NÂˆH[ÙHÂˆš\ÝX[™›ØÝ\Ê
NÂˆBˆBˆJNÂˆB‚ˆÚ[™ÝË•ÙYZÛTšXÚY]ÜˆHØš™XÝ™œ™Y^™JÂˆÜ™X]BˆJNÂŸJJ
NÂ