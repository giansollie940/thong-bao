(() => {
  "use strict";

  const HTML_MARKER = "<!--weekly-html:v1-->";

  const ALLOWED_TAGS = new Set([
    "article", "section", "nav", "div", "span",
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "mark", "small",
    "h2", "h3", "h4", "h5",
    "ul", "ol", "li",
    "blockquote",
    "a", "button", "details", "summary",
    "img", "figure", "figcaption",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
    "code", "pre", "kbd", "sup", "sub", "style"
  ]);

  const DROP_WITH_CONTENT = new Set([
    "script", "iframe", "object", "embed",
    "svg", "math", "template", "form",
    "input", "select", "textarea",
    "meta", "link", "base"
  ]);

  const GLOBAL_ATTRIBUTES = new Set([
    "id", "class", "title", "style",
    "role", "tabindex", "hidden"
  ]);

  const TAG_ATTRIBUTES = {
    a: new Set(["href", "target", "rel"]),
    button: new Set(["type", "disabled"]),
    details: new Set(["open", "name"]),
    img: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
    th: new Set(["colspan", "rowspan", "scope"]),
    td: new Set(["colspan", "rowspan"])
  };

  const SAFE_STYLE_PROPERTIES = new Set([
    "color",
    "background",
    "background-color",
    "font-size",
    "font-weight",
    "font-style",
    "font-family",
    "line-height",
    "letter-spacing",
    "text-align",
    "text-decoration",
    "text-decoration-color",
    "text-decoration-line",
    "text-decoration-style",
    "white-space",
    "border",
    "border-color",
    "border-style",
    "border-width",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-radius",
    "box-shadow",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",

    "display",
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "gap",
    "row-gap",
    "column-gap",

    "flex",
    "flex-direction",
    "flex-wrap",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "align-items",
    "align-content",
    "align-self",
    "justify-content",
    "justify-items",
    "justify-self",
    "order",

    "grid-template-columns",
    "grid-template-rows",
    "grid-auto-columns",
    "grid-auto-rows",
    "grid-auto-flow",
    "grid-column",
    "grid-row",
    "place-items",
    "place-content",

    "overflow",
    "overflow-x",
    "overflow-y",
    "object-fit",
    "aspect-ratio",
    "vertical-align",
    "opacity"
  ]);

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeLinkUrl(value = "") {
    const raw = String(value).trim();
    if (!raw) return "";

    const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (/^(?:javascript|vbscript|data):/i.test(compact)) return "";

    if (
      raw.startsWith("#") ||
      raw.startsWith("/") ||
      raw.startsWith("./") ||
      raw.startsWith("../")
    ) {
      return raw;
    }

    return /^(?:https?:\/\/|mailto:|tel:)/i.test(raw)
      ? raw
      : "";
  }

  function safeImageUrl(value = "") {
    const raw = String(value).trim();
    if (!raw) return "";

    const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (/^(?:javascript|vbscript|data):/i.test(compact)) return "";

    if (
      raw.startsWith("/") ||
      raw.startsWith("./") ||
      raw.startsWith("../") ||
      /^https?:\/\//i.test(raw)
    ) {
      return raw;
    }

    return "";
  }

  function sanitizeClassName(value = "") {
    return String(value)
      .split(/\s+/)
      .map(token => token.replace(/[^\w-]/g, ""))
      .filter(Boolean)
      .slice(0, 12)
      .join(" ");
  }

  function sanitizeInlineStyle(value = "") {
    const probe = document.createElement("span");
    probe.style.cssText = String(value);
    return sanitizeCssStyleDeclaration(probe.style);
  }

  const STYLE_SCOPE =
    ":is(.announcement-content.html-content, .visual-rich-editor)";

  function isSafeAttributeName(name) {
    return (
      GLOBAL_ATTRIBUTES.has(name) ||
      /^aria-[a-z0-9_-]+$/i.test(name) ||
      /^data-[a-z0-9_-]+$/i.test(name)
    );
  }

  function sanitizeId(value = "") {
    return String(value)
      .trim()
      .replace(/[^\w:-]/g, "-")
      .slice(0, 120);
  }

  function sanitizeTabIndex(value = "") {
    return ["-1", "0"].includes(String(value).trim())
      ? String(value).trim()
      : "";
  }

  function splitSelectorList(selectorText = "") {
    const selectors = [];
    let current = "";
    let depth = 0;
    let quote = "";

    for (let index = 0; index < selectorText.length; index += 1) {
      const char = selectorText[index];

      if (quote) {
        current += char;

        if (
          char === quote &&
          selectorText[index - 1] !== "\\"
        ) {
          quote = "";
        }

        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === "(" || char === "[") {
        depth += 1;
      } else if (char === ")" || char === "]") {
        depth = Math.max(0, depth - 1);
      }

      if (char === "," && depth === 0) {
        if (current.trim()) selectors.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    if (current.trim()) selectors.push(current.trim());
    return selectors;
  }

  function sanitizeCssStyleDeclaration(style) {
    const cleaned = [];

    for (const property of SAFE_STYLE_PROPERTIES) {
      const cssValue =
        style.getPropertyValue(property).trim();

      if (!cssValue) continue;

      if (
        /url\s*\(/i.test(cssValue) ||
        /expression\s*\(/i.test(cssValue) ||
        /javascript:/i.test(cssValue) ||
        /vbscript:/i.test(cssValue) ||
        /@import/i.test(cssValue)
      ) {
        continue;
      }

      cleaned.push(`${property}: ${cssValue}`);
    }

    return cleaned.join("; ");
  }

  function scopeSelector(selector = "") {
    const clean = String(selector).trim();
    if (!clean) return "";

    if (
      clean.includes(".announcement-content.html-content") ||
      clean.includes(".visual-rich-editor")
    ) {
      return clean;
    }

    return `${STYLE_SCOPE} ${clean}`;
  }

  function sanitizeStyleSheetText(value = "") {
    if (
      typeof CSSStyleSheet !== "function" ||
      typeof CSSStyleSheet.prototype.replaceSync !== "function"
    ) {
      return "";
    }

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(String(value));

      const renderRules = rules => {
        const safeRules = [];

        for (const rule of rules) {
          if (rule.type === 1) {
            const declarations =
              sanitizeCssStyleDeclaration(rule.style);

            if (!declarations) continue;

            const selectors = splitSelectorList(
              rule.selectorText
            )
              .map(scopeSelector)
              .filter(Boolean);

            if (!selectors.length) continue;

            safeRules.push(
              `${selectors.join(", ")} { ${declarations}; }`
            );

            continue;
          }

          if (rule.type === 4) {
            const nested = renderRules(rule.cssRules);

            if (nested) {
              safeRules.push(
                `@media ${rule.conditionText} { ${nested} }`
              );
            }
          }
        }

        return safeRules.join("\n");
      };

      return renderRules(sheet.cssRules);
    } catch {
      return "";
    }
  }

  function sanitizeElement(element) {
    const tag = element.tagName.toLowerCase();

    if (tag === "style") {
      const cleanCss =
        sanitizeStyleSheetText(element.textContent);

      if (cleanCss) {
        element.textContent = cleanCss;
      } else {
        element.remove();
      }

      return;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      element.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode;
      if (!parent) return;

      const children = [...element.childNodes];

      for (const child of children) {
        parent.insertBefore(child, element);

        if (child.nodeType === Node.ELEMENT_NODE) {
          sanitizeElement(child);
        }
      }

      element.remove();
      return;
    }

    const allowedForTag = TAG_ATTRIBUTES[tag] || new Set();

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (!isSafeAttributeName(name) && !allowedForTag.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === "id") {
        const cleanId = sanitizeId(value);

        if (cleanId) {
          element.setAttribute("id", cleanId);
        } else {
          element.removeAttribute("id");
        }

        continue;
      }

      if (name === "tabindex") {
        const cleanTabIndex = sanitizeTabIndex(value);

        if (cleanTabIndex) {
          element.setAttribute("tabindex", cleanTabIndex);
        } else {
          element.removeAttribute("tabindex");
        }

        continue;
      }

      if (name === "class") {
        const cleanClass = sanitizeClassName(value);

        if (cleanClass) {
          element.setAttribute("class", cleanClass);
        } else {
          element.removeAttribute("class");
        }

        continue;
      }

      if (name === "style") {
        const cleanStyle = sanitizeInlineStyle(value);

        if (cleanStyle) {
          element.setAttribute("style", cleanStyle);
        } else {
          element.removeAttribute("style");
        }

        continue;
      }

      if (tag === "a" && name === "href") {
        const cleanUrl = safeLinkUrl(value);

        if (cleanUrl) {
          element.setAttribute("href", cleanUrl);
        } else {
          element.removeAttribute("href");
        }

        continue;
      }

      if (tag === "img" && name === "src") {
        const cleanUrl = safeImageUrl(value);

        if (cleanUrl) {
          element.setAttribute("src", cleanUrl);
        } else {
          element.removeAttribute("src");
        }
      }
    }

    if (tag === "button") {
      element.setAttribute("type", "button");
    }

    if (tag === "a" && element.hasAttribute("href")) {
      element.setAttribute("rel", "noopener noreferrer");

      if (/^https?:\/\//i.test(element.getAttribute("href") || "")) {
        element.setAttribute("target", "_blank");
      } else {
        element.removeAttribute("target");
      }
    }

    if (tag === "img") {
      if (!element.hasAttribute("alt")) {
        element.setAttribute("alt", "");
      }

      element.setAttribute("loading", "lazy");
      element.setAttribute("decoding", "async");
    }

    for (const child of [...element.children]) {
      sanitizeElement(child);
    }
  }

  function sanitizeHtml(raw = "") {
    const template = document.createElement("template");
    template.innerHTML = String(raw);

    for (const node of [...template.content.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.remove();
        continue;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(node);
      }
    }

    return template.innerHTML.trim();
  }

  function inlineMarkdown(text = "") {
    const links = [];

    let source = String(text).replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_match, label, url) => {
        const cleanUrl = safeLinkUrl(url);

        if (!cleanUrl) {
          return `${label} (${url})`;
        }

        const token = `@@WEEKLY_LINK_${links.length}@@`;

        links.push(
          `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
        );

        return token;
      }
    );

    let html = escapeHtml(source)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

    return html.replace(
      /@@WEEKLY_LINK_(\d+)@@/g,
      (_match, index) => links[Number(index)] || ""
    );
  }

  function renderMarkdown(raw = "") {
    const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let list = [];
    let listType = "";

    const flushList = () => {
      if (!list.length) return;

      const tag = listType === "ol" ? "ol" : "ul";
      out.push(
        `<${tag}>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`
      );

      list = [];
      listType = "";
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushList();
        continue;
      }

      if (/^#{2,4}\s+/.test(line)) {
        flushList();
        out.push(
          `<h4 class="content-subheading">${inlineMarkdown(line.replace(/^#{2,4}\s+/, ""))}</h4>`
        );
        continue;
      }

      if (/^>\s+/.test(line)) {
        flushList();
        out.push(
          `<blockquote>${inlineMarkdown(line.replace(/^>\s+/, ""))}</blockquote>`
        );
        continue;
      }

      if (/^---+$/.test(line)) {
        flushList();
        out.push("<hr>");
        continue;
      }

      if (/^-\s+/.test(line)) {
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        list.push(line.replace(/^-\s+/, ""));
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        list.push(line.replace(/^\d+\.\s+/, ""));
        continue;
      }

      flushList();
      out.push(`<p>${inlineMarkdown(line)}</p>`);
    }

    flushList();
    return out.join("");
  }

  function markdownToPlainText(raw = "") {
    return String(raw)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^#{2,4}\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^\s*---+\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getStoredMode(raw = "") {
    return String(raw).trimStart().startsWith(HTML_MARKER)
      ? "html"
      : "markdown";
  }

  function getEditorContent(raw = "") {
    const source = String(raw);

    if (getStoredMode(source) !== "html") {
      return source;
    }

    const markerIndex = source.indexOf(HTML_MARKER);

    return source
      .slice(markerIndex + HTML_MARKER.length)
      .replace(/^\s*\n?/, "")
      .trim();
  }

  function serializeEditorContent(raw = "", mode = "markdown") {
    const source = String(raw).trim();

    return mode === "html"
      ? `${HTML_MARKER}\n${source}`
      : source;
  }

  function renderEditorContent(raw = "", mode = "markdown") {
    return mode === "html"
      ? sanitizeHtml(raw)
      : renderMarkdown(raw);
  }

  function renderStoredContent(raw = "") {
    const mode = getStoredMode(raw);
    return renderEditorContent(getEditorContent(raw), mode);
  }

  function htmlToPlainText(raw = "") {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(raw);

    return (template.content.textContent || "")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function toPlainText(raw = "", mode = null) {
    const actualMode = mode || getStoredMode(raw);
    const source = mode ? String(raw) : getEditorContent(raw);

    return actualMode === "html"
      ? htmlToPlainText(source)
      : markdownToPlainText(source);
  }

  /* =======================================================
     V3.15.5 — Universal Tabs Adapter
     Canvas LMS / Bootstrap / Foundation / WAI-ARIA /
     generic target-based tabs.
     ======================================================= */

  const UNIVERSAL_TAB_TRIGGER = [
    "a[href^='#']",
    "button[aria-controls]",
    "[data-tab-target]",
    "[data-target]",
    "[data-bs-target]",
    "[data-tab]"
  ].join(", ");

  const UNIVERSAL_TAB_PANEL = [
    '[role="tabpanel"]',
    "[data-tab-panel]",
    ".notice-tab-panel",
    ".tab-panel",
    ".tab-pane",
    ".tabs-panel",
    ".tab-section",
    ".ui.tab"
  ].join(", ");

  const tabGroups = new Map();
  let tabGroupUid = 0;
  let tabElementUid = 0;

  function nextUniversalId(prefix) {
    tabElementUid += 1;
    return `${prefix}-${tabElementUid}`;
  }

  function nextTabGroupId() {
    tabGroupUid += 1;
    return `weekly-tab-group-${tabGroupUid}`;
  }

  function normalizeTarget(value = "") {
    const raw = String(value).trim();
    if (!raw) return "";

    const hashIndex = raw.indexOf("#");

    if (hashIndex >= 0) {
      return raw.slice(hashIndex + 1);
    }

    return raw;
  }

  function triggerTarget(trigger) {
    if (!(trigger instanceof Element)) return "";

    const direct =
      trigger.getAttribute("aria-controls") ||
      trigger.getAttribute("data-tab-target") ||
      trigger.getAttribute("data-bs-target") ||
      trigger.getAttribute("data-target") ||
      "";

    if (direct) {
      return normalizeTarget(direct);
    }

    return normalizeTarget(
      trigger.getAttribute("href") || ""
    );
  }

  function triggerKey(trigger) {
    if (!(trigger instanceof Element)) return "";

    return (
      trigger.getAttribute("data-tab") ||
      trigger.getAttribute("data-tab-key") ||
      ""
    ).trim();
  }

  function panelKey(panel) {
    if (!(panel instanceof Element)) return "";

    return (
      panel.getAttribute("data-tab") ||
      panel.getAttribute("data-tab-panel") ||
      panel.getAttribute("data-tab-key") ||
      ""
    ).trim();
  }

  function idTargetWithin(root, id) {
    if (!(root instanceof Element) || !id) return null;

    const target = document.getElementById(id);

    return target && root.contains(target)
      ? target
      : null;
  }

  function likelyPanelPool(root, nav) {
    if (!(root instanceof Element)) return [];

    const panels = [
      ...root.querySelectorAll(UNIVERSAL_TAB_PANEL)
    ].filter(panel => {
      if (nav?.contains(panel)) return false;

      const existingGroup =
        panel.getAttribute("data-weekly-tab-group");

      return !existingGroup;
    });

    return panels;
  }

  function panelForTrigger(
    root,
    trigger,
    panelPool,
    index
  ) {
    const targetId = triggerTarget(trigger);

    if (targetId) {
      const target = idTargetWithin(root, targetId);

      if (
        target &&
        target !== trigger &&
        !trigger.contains(target)
      ) {
        return target;
      }
    }

    const key = triggerKey(trigger);

    if (key) {
      const byKey = panelPool.find(
        panel => panelKey(panel) === key
      );

      if (byKey) return byKey;
    }

    return panelPool[index] || null;
  }

  function uniqueElements(elements) {
    const seen = new Set();

    return elements.filter(element => {
      if (!element || seen.has(element)) {
        return false;
      }

      seen.add(element);
      return true;
    });
  }

  function createTabGroup({
    root,
    nav,
    triggers
  }) {
    if (
      !(root instanceof Element) ||
      !(nav instanceof Element)
    ) {
      return null;
    }

    const cleanTriggers = uniqueElements(
      triggers
        .filter(trigger => root.contains(trigger))
        .filter(trigger => !trigger.hasAttribute(
          "data-weekly-tab-group"
        ))
    );

    if (cleanTriggers.length < 2) return null;

    const panelPool = likelyPanelPool(root, nav);

    const mappedPanels = cleanTriggers.map(
      (trigger, index) =>
        panelForTrigger(
          root,
          trigger,
          panelPool,
          index
        )
    );

    const uniquePanels = uniqueElements(
      mappedPanels.filter(Boolean)
    );

    if (uniquePanels.length < 2) return null;

    const groupId = nextTabGroupId();

    root.classList.add("weekly-tabs-root");
    nav.classList.add("weekly-tab-list");
    nav.setAttribute("role", "tablist");
    nav.setAttribute(
      "data-weekly-tab-group",
      groupId
    );

    const pairs = [];

    cleanTriggers.forEach((trigger, index) => {
      const panel = mappedPanels[index];

      if (!panel) return;

      trigger.classList.add(
        "weekly-tab-button"
      );
      trigger.setAttribute(
        "data-weekly-tab-group",
        groupId
      );
      trigger.setAttribute("role", "tab");

      if (!trigger.id) {
        trigger.id =
          nextUniversalId("weekly-tab");
      }

      const item = trigger.closest("li");

      if (
        item &&
        nav.contains(item)
      ) {
        item.classList.add(
          "weekly-tab-item"
        );
      }

      panel.classList.add(
        "weekly-tab-panel"
      );
      panel.setAttribute(
        "data-weekly-tab-group",
        groupId
      );
      panel.setAttribute(
        "role",
        "tabpanel"
      );

      if (!panel.id) {
        panel.id =
          nextUniversalId("weekly-panel");
      }

      trigger.setAttribute(
        "aria-controls",
        panel.id
      );
      panel.setAttribute(
        "aria-labelledby",
        trigger.id
      );

      pairs.push({
        trigger,
        panel
      });
    });

    if (pairs.length < 2) return null;

    const group = {
      id: groupId,
      root,
      nav,
      pairs
    };

    tabGroups.set(groupId, group);

    const initialPair =
      pairs.find(({ trigger, panel }) =>
        trigger.getAttribute(
          "aria-selected"
        ) === "true" ||
        trigger.classList.contains("active") ||
        trigger.classList.contains("is-active") ||
        panel.classList.contains("active") ||
        panel.classList.contains("show") ||
        panel.classList.contains("is-active")
      ) ||
      pairs[0];

    activateUniversalTab(
      group,
      initialPair.trigger
    );

    return group;
  }

  function activateUniversalTab(
    group,
    activeTrigger
  ) {
    if (!group) return;

    for (const { trigger, panel } of group.pairs) {
      const active =
        trigger === activeTrigger;

      trigger.setAttribute(
        "aria-selected",
        String(active)
      );
      trigger.tabIndex = active ? 0 : -1;

      trigger.classList.toggle(
        "active",
        active
      );
      trigger.classList.toggle(
        "show",
        active
      );
      trigger.classList.toggle(
        "is-active",
        active
      );

      const item = trigger.closest("li");

      if (
        item &&
        group.nav.contains(item)
      ) {
        item.classList.toggle(
          "active",
          active
        );
        item.classList.toggle(
          "is-active",
          active
        );
      }

      panel.hidden = !active;

      panel.classList.toggle(
        "active",
        active
      );
      panel.classList.toggle(
        "show",
        active
      );
      panel.classList.toggle(
        "is-active",
        active
      );
    }
  }

  function triggersInside(nav, selector) {
    if (!(nav instanceof Element)) return [];

    return uniqueElements([
      ...nav.querySelectorAll(selector)
    ]);
  }

  function discoverCanvasTabs(scope) {
    const roots = [
      ...scope.querySelectorAll(
        ".enhanceable_content.tabs, " +
        ".tabs:not(ul):not(ol)"
      )
    ];

    for (const root of roots) {
      if (
        root.hasAttribute(
          "data-weekly-tabs-scanned"
        )
      ) {
        continue;
      }

      const nav =
        [...root.children].find(
          child =>
            child.matches?.("ul, ol") &&
            child.querySelectorAll(
              "a[href^='#'], button[aria-controls]"
            ).length >= 2
        );

      if (!nav) continue;

      const triggers = triggersInside(
        nav,
        "a[href^='#'], button[aria-controls]"
      );

      const group = createTabGroup({
        root,
        nav,
        triggers
      });

      if (group) {
        root.setAttribute(
          "data-weekly-tabs-scanned",
          "true"
        );
      }
    }
  }

  function discoverBootstrapTabs(scope) {
    const navs = [
      ...scope.querySelectorAll(
        ".nav-tabs, .nav-pills"
      )
    ];

    for (const nav of navs) {
      if (
        nav.hasAttribute(
          "data-weekly-tab-group"
        )
      ) {
        continue;
      }

      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, [data-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      const triggers = triggersInside(
        nav,
        [
          "[data-bs-target]",
          "[data-target]",
          '[data-bs-toggle="tab"]',
          '[data-bs-toggle="pill"]',
          '[data-toggle="tab"]',
          '[data-toggle="pill"]',
          "a[href^='#']",
          "button[aria-controls]"
        ].join(", ")
      );

      createTabGroup({
        root,
        nav,
        triggers
      });
    }
  }

  function discoverAriaTabs(scope) {
    const navs = [
      ...scope.querySelectorAll(
        '[role="tablist"]'
      )
    ];

    for (const nav of navs) {
      if (
        nav.hasAttribute(
          "data-weekly-tab-group"
        )
      ) {
        continue;
      }

      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, [data-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      const triggers = triggersInside(
        nav,
        '[role="tab"], [aria-controls]'
      );

      createTabGroup({
        root,
        nav,
        triggers
      });
    }
  }

  function discoverFoundationTabs(scope) {
    const navs = [
      ...scope.querySelectorAll(
        "ul.tabs, ol.tabs"
      )
    ];

    for (const nav of navs) {
      if (
        nav.hasAttribute(
          "data-weekly-tab-group"
        )
      ) {
        continue;
      }

      const root = nav.parentElement;
      if (!root) continue;

      const triggers = triggersInside(
        nav,
        ".tabs-title > a[href^='#'], a[href^='#']"
      );

      createTabGroup({
        root,
        nav,
        triggers
      });
    }
  }

  function discoverGenericTabs(scope) {
    const navs = [
      ...scope.querySelectorAll(
        [
          ".tab-buttons",
          ".tabs-nav",
          ".tab-nav",
          ".tab-list",
          ".tab-links",
          ".tab-menu",
          ".notice-tab-list"
        ].join(", ")
      )
    ];

    for (const nav of navs) {
      if (
        nav.hasAttribute(
          "data-weekly-tab-group"
        )
      ) {
        continue;
      }

      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, .tabbed-content, [data-tabs], [data-notice-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      const triggers = triggersInside(
        nav,
        [
          "[data-tab-target]",
          "[data-target]",
          "[data-bs-target]",
          "[data-tab]",
          "a[href^='#']",
          "button[aria-controls]"
        ].join(", ")
      );

      createTabGroup({
        root,
        nav,
        triggers
      });
    }
  }

  function discoverSemanticTabs(scope) {
    const navs = [
      ...scope.querySelectorAll(
        ".ui.tabular.menu"
      )
    ];

    for (const nav of navs) {
      if (
        nav.hasAttribute(
          "data-weekly-tab-group"
        )
      ) {
        continue;
      }

      const root = nav.parentElement;
      if (!root) continue;

      const triggers = triggersInside(
        nav,
        ".item[data-tab]"
      );

      createTabGroup({
        root,
        nav,
        triggers
      });
    }
  }

  function enhanceTabs(scope = document) {
    if (!scope?.querySelectorAll) return;

    discoverCanvasTabs(scope);
    discoverBootstrapTabs(scope);
    discoverAriaTabs(scope);
    discoverFoundationTabs(scope);
    discoverGenericTabs(scope);
    discoverSemanticTabs(scope);
  }

  function scheduleTabEnhancement(
    scope = document
  ) {
    requestAnimationFrame(
      () => enhanceTabs(scope)
    );
  }

  function groupForTrigger(trigger) {
    const groupId =
      trigger?.getAttribute(
        "data-weekly-tab-group"
      );

    return groupId
      ? tabGroups.get(groupId) || null
      : null;
  }

  document.addEventListener(
    "click",
    event => {
      const trigger =
        event.target.closest(
          ".weekly-tab-button"
        );

      if (!trigger) return;

      const group = groupForTrigger(trigger);

      if (!group) return;

      event.preventDefault();

      activateUniversalTab(
        group,
        trigger
      );
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End"
        ].includes(event.key)
      ) {
        return;
      }

      const trigger =
        event.target.closest(
          ".weekly-tab-button"
        );

      if (!trigger) return;

      const group = groupForTrigger(trigger);

      if (!group) return;

      const triggers =
        group.pairs.map(
          pair => pair.trigger
        );

      const currentIndex =
        triggers.indexOf(trigger);

      if (currentIndex < 0) return;

      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") {
        nextIndex =
          (currentIndex + 1) %
          triggers.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (
            currentIndex -
            1 +
            triggers.length
          ) %
          triggers.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex =
          triggers.length - 1;
      }

      event.preventDefault();

      const next =
        triggers[nextIndex];

      activateUniversalTab(
        group,
        next
      );

      next.focus();
    }
  );

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () =>
        scheduleTabEnhancement(document),
      { once: true }
    );
  } else {
    scheduleTabEnhancement(document);
  }

  const universalTabObserver =
    new MutationObserver(records => {
      for (const record of records) {
        if (record.addedNodes.length) {
          scheduleTabEnhancement(document);
          break;
        }
      }
    });

  const observeUniversalTabs = () => {
    if (!document.body) return;

    universalTabObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  };

  if (document.body) {
    observeUniversalTabs();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      observeUniversalTabs,
      { once: true }
    );
  }

  /* =======================================================
     V3.15.6 — Universal Accordion Adapter
     Native details / WAI-ARIA / Bootstrap / Foundation /
     generic target-based collapse.
     ======================================================= */

  const ACCORDION_ROOT_SELECTOR = [
    ".accordion",
    ".notice-accordion",
    ".accordion-group",
    ".accordion-container",
    ".collapse-group",
    "[data-accordion]",
    "[data-notice-accordion]"
  ].join(", ");

  const ACCORDION_TRIGGER_SELECTOR = [
    ".accordion-button",
    ".accordion-title",
    ".accordion-trigger",
    ".accordion-header button",
    ".accordion-header a",
    '[data-bs-toggle="collapse"]',
    '[data-toggle="collapse"]',
    "[data-collapse-target]",
    "[data-accordion-target]",
    "[aria-controls][aria-expanded]"
  ].join(", ");

  const ACCORDION_PANEL_SELECTOR = [
    ".accordion-collapse",
    ".accordion-content",
    ".accordion-panel",
    ".collapse",
    "[data-accordion-panel]",
    '[role="region"]'
  ].join(", ");

  const accordionGroups = new Map();
  let accordionGroupUid = 0;
  let accordionElementUid = 0;

  function nextAccordionId(prefix) {
    accordionElementUid += 1;
    return `${prefix}-${accordionElementUid}`;
  }

  function nextAccordionGroupId() {
    accordionGroupUid += 1;
    return `weekly-accordion-group-${accordionGroupUid}`;
  }

  function accordionTargetToken(trigger) {
    if (!(trigger instanceof Element)) return "";

    const direct =
      trigger.getAttribute("aria-controls") ||
      trigger.getAttribute("data-bs-target") ||
      trigger.getAttribute("data-target") ||
      trigger.getAttribute("data-collapse-target") ||
      trigger.getAttribute("data-accordion-target") ||
      "";

    if (direct) {
      return normalizeTarget(direct);
    }

    const href = trigger.getAttribute("href") || "";

    return href.includes("#")
      ? normalizeTarget(href)
      : "";
  }

  function accordionTriggersWithin(root) {
    if (!(root instanceof Element)) return [];

    return uniqueElements(
      [...root.querySelectorAll(ACCORDION_TRIGGER_SELECTOR)]
        .filter(trigger => {
          if (
            trigger.closest("details") ||
            trigger.closest(".weekly-tabs-root")
          ) {
            return false;
          }

          const nested =
            trigger.closest(ACCORDION_ROOT_SELECTOR);

          return !nested || nested === root;
        })
    );
  }

  function accordionPanelsWithin(root) {
    if (!(root instanceof Element)) return [];

    return uniqueElements(
      [...root.querySelectorAll(ACCORDION_PANEL_SELECTOR)]
        .filter(panel => {
          if (
            panel.closest("details") ||
            panel.closest(".weekly-tabs-root")
          ) {
            return false;
          }

          const nested =
            panel.closest(ACCORDION_ROOT_SELECTOR);

          return !nested || nested === root;
        })
    );
  }

  function accordionPanelForTrigger(root, trigger, panels, index) {
    const id = accordionTargetToken(trigger);

    if (id) {
      const panel = idTargetWithin(root, id);

      if (
        panel &&
        panel !== trigger &&
        !trigger.contains(panel)
      ) {
        return panel;
      }
    }

    return panels[index] || null;
  }

  function normalizeAccordionPair(groupId, root, trigger, panel) {
    trigger.classList.add("weekly-accordion-trigger");
    trigger.setAttribute("data-weekly-accordion-group", groupId);

    if (trigger.tagName === "A") {
      trigger.setAttribute("role", "button");
    }

    if (trigger.tagName === "BUTTON") {
      trigger.setAttribute("type", "button");
    }

    if (!trigger.id) {
      trigger.id = nextAccordionId("weekly-accordion-trigger");
    }

    panel.classList.add("weekly-accordion-panel");
    panel.setAttribute("data-weekly-accordion-group", groupId);
    panel.setAttribute("role", "region");

    if (!panel.id) {
      panel.id = nextAccordionId("weekly-accordion-panel");
    }

    trigger.setAttribute("aria-controls", panel.id);
    panel.setAttribute("aria-labelledby", trigger.id);

    const initiallyOpen =
      trigger.getAttribute("aria-expanded") === "true" ||
      trigger.classList.contains("active") ||
      panel.classList.contains("show") ||
      panel.classList.contains("active") ||
      panel.classList.contains("is-active");

    trigger.setAttribute(
      "aria-expanded",
      String(initiallyOpen)
    );

    trigger.classList.toggle("is-open", initiallyOpen);
    panel.classList.toggle("is-open", initiallyOpen);
    panel.hidden = !initiallyOpen;

    return { trigger, panel };
  }

  function createAccordionGroup(root) {
    if (!(root instanceof Element)) return null;

    const existingId =
      root.getAttribute("data-weekly-accordion-group");

    if (existingId && accordionGroups.has(existingId)) {
      return accordionGroups.get(existingId);
    }

    const triggers = accordionTriggersWithin(root);
    const panels = accordionPanelsWithin(root);

    if (triggers.length < 1 || panels.length < 1) {
      return null;
    }

    const groupId = nextAccordionGroupId();
    const usedPanels = new Set();
    const pairs = [];

    triggers.forEach((trigger, index) => {
      const panel =
        accordionPanelForTrigger(
          root,
          trigger,
          panels,
          index
        );

      if (!panel || usedPanels.has(panel)) return;

      usedPanels.add(panel);
      pairs.push(
        normalizeAccordionPair(
          groupId,
          root,
          trigger,
          panel
        )
      );
    });

    if (!pairs.length) return null;

    root.classList.add("weekly-accordion-root");
    root.setAttribute("data-weekly-accordion-ready", "true");
    root.setAttribute("data-weekly-accordion-group", groupId);

    const exclusive =
      root.hasAttribute("data-accordion-single") ||
      root.getAttribute("data-accordion-mode") === "single" ||
      root.classList.contains("accordion-single");

    const group = {
      id: groupId,
      root,
      pairs,
      exclusive
    };

    accordionGroups.set(groupId, group);
    return group;
  }

  function setAccordionPairOpen(group, pair, open) {
    if (!group || !pair) return;

    if (open && group.exclusive) {
      for (const other of group.pairs) {
        if (other === pair) continue;

        other.trigger.setAttribute("aria-expanded", "false");
        other.trigger.classList.remove("is-open", "active", "show");
        other.panel.hidden = true;
        other.panel.classList.remove("is-open", "active", "show");
      }
    }

    pair.trigger.setAttribute("aria-expanded", String(open));
    pair.trigger.classList.toggle("is-open", open);
    pair.trigger.classList.toggle("active", open);

    pair.panel.hidden = !open;
    pair.panel.classList.toggle("is-open", open);
    pair.panel.classList.toggle("active", open);
    pair.panel.classList.toggle("show", open);
  }

  function groupForAccordionTrigger(trigger) {
    const id =
      trigger?.getAttribute("data-weekly-accordion-group");

    return id
      ? accordionGroups.get(id) || null
      : null;
  }

  function enhanceNativeDetails(scope = document) {
    if (!scope?.querySelectorAll) return;

    for (const details of scope.querySelectorAll("details")) {
      const summary =
        details.querySelector(":scope > summary");

      if (!summary) continue;

      details.classList.add("weekly-native-details");
      summary.classList.add("weekly-native-summary");

      if (!summary.id) {
        summary.id =
          nextAccordionId("weekly-summary");
      }
    }
  }

  function enforceNamedDetails(details) {
    if (!(details instanceof HTMLDetailsElement)) return;

    const name = details.getAttribute("name");

    if (!name || !details.open) return;

    for (const peer of document.querySelectorAll("details[name]")) {
      if (
        peer !== details &&
        peer.getAttribute("name") === name
      ) {
        peer.open = false;
      }
    }
  }

  function enhanceAccordionRoots(scope = document) {
    if (!scope?.querySelectorAll) return;

    const roots = new Set();

    if (
      scope instanceof Element &&
      scope.matches(ACCORDION_ROOT_SELECTOR)
    ) {
      roots.add(scope);
    }

    for (const root of scope.querySelectorAll(
      ACCORDION_ROOT_SELECTOR
    )) {
      if (
        root.closest("details") ||
        root.closest(".weekly-tabs-root")
      ) {
        continue;
      }

      roots.add(root);
    }

    for (const trigger of scope.querySelectorAll(
      ACCORDION_TRIGGER_SELECTOR
    )) {
      if (
        trigger.closest("details") ||
        trigger.closest(".weekly-tabs-root")
      ) {
        continue;
      }

      let root =
        trigger.closest(ACCORDION_ROOT_SELECTOR);

      if (!root) {
        let current = trigger.parentElement;

        for (
          let depth = 0;
          current && depth < 4;
          depth += 1
        ) {
          if (accordionPanelsWithin(current).length) {
            root = current;
            break;
          }

          current = current.parentElement;
        }
      }

      if (root) roots.add(root);
    }

    for (const root of roots) {
      createAccordionGroup(root);
    }
  }

  function enhanceAccordions(scope = document) {
    enhanceNativeDetails(scope);
    enhanceAccordionRoots(scope);
  }

  function scheduleAccordionEnhancement(scope = document) {
    requestAnimationFrame(
      () => enhanceAccordions(scope)
    );
  }

  document.addEventListener("click", event => {
    const trigger =
      event.target.closest(".weekly-accordion-trigger");

    if (!trigger) return;

    const group =
      groupForAccordionTrigger(trigger);

    if (!group) return;

    const pair =
      group.pairs.find(
        item => item.trigger === trigger
      );

    if (!pair) return;

    event.preventDefault();

    const open =
      trigger.getAttribute("aria-expanded") !== "true";

    setAccordionPairOpen(group, pair, open);
  });

  document.addEventListener("keydown", event => {
    const trigger =
      event.target.closest(".weekly-accordion-trigger");

    if (!trigger) return;

    if (
      trigger.tagName === "A" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      trigger.click();
    }
  });

  document.addEventListener(
    "toggle",
    event => {
      if (
        event.target instanceof HTMLDetailsElement
      ) {
        enforceNamedDetails(event.target);
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => scheduleAccordionEnhancement(document),
      { once: true }
    );
  } else {
    scheduleAccordionEnhancement(document);
  }

  const universalAccordionObserver =
    new MutationObserver(records => {
      for (const record of records) {
        if (record.addedNodes.length) {
          scheduleAccordionEnhancement(document);
          break;
        }
      }
    });

  const observeUniversalAccordions = () => {
    if (!document.body) return;

    universalAccordionObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  };

  if (document.body) {
    observeUniversalAccordions();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      observeUniversalAccordions,
      { once: true }
    );
  }

  window.WeeklyContent = Object.freeze({
    HTML_MARKER,
    safeLinkUrl,
    sanitizeHtml,
    renderMarkdown,
    renderEditorContent,
    renderStoredContent,
    getStoredMode,
    getEditorContent,
    serializeEditorContent,
    toPlainText,
    enhanceTabs,
    enhanceAccordions
  });
})();
