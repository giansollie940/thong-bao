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
    "iframe", "img", "figure", "figcaption",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
    "code", "pre", "kbd", "sup", "sub", "style"
  ]);

  const DROP_WITH_CONTENT = new Set([
    "script", "object", "embed",
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
    iframe: new Set([
      "src", "title", "loading", "allow", "allowfullscreen",
      "width", "height", "referrerpolicy"
    ]),
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

  function safeYouTubeEmbedUrl(value = "") {
    const raw = String(value).trim();
    if (!raw) return "";

    try {
      const url = new URL(raw, window.location.href);

      if (url.protocol !== "https:") {
        return "";
      }

      const host = url.hostname.toLowerCase();
      const allowedHost = new Set([
        "youtube.com",
        "www.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
      ]);

      if (!allowedHost.has(host)) {
        return "";
      }

      if (!url.pathname.startsWith("/embed/")) {
        return "";
      }

      const videoId =
        url.pathname.slice("/embed/".length).split("/")[0];

      if (!/^[A-Za-z0-9_-]{6,64}$/.test(videoId)) {
        return "";
      }

      url.hash = "";
      return url.href;
    } catch {
      return "";
    }
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

    if (tag === "iframe") {
      const cleanSrc = safeYouTubeEmbedUrl(
        element.getAttribute("src") || ""
      );

      if (!cleanSrc) {
        element.remove();
        return;
      }

      element.setAttribute("src", cleanSrc);
    }

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

      if (tag === "iframe" && name === "src") {
        const cleanUrl = safeYouTubeEmbedUrl(value);

        if (cleanUrl) {
          element.setAttribute("src", cleanUrl);
        } else {
          element.remove();
          return;
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

    if (tag === "iframe") {
      element.classList.add("weekly-youtube-embed");

      if (!element.getAttribute("title")) {
        element.setAttribute("title", "Video YouTube");
      }

      element.setAttribute("loading", "lazy");
      element.setAttribute(
        "referrerpolicy",
        "strict-origin-when-cross-origin"
      );
      element.setAttribute(
        "allow",
        [
          "accelerometer",
          "autoplay",
          "clipboard-write",
          "encrypted-media",
          "gyroscope",
          "picture-in-picture",
          "web-share"
        ].join("; ")
      );
      element.setAttribute("allowfullscreen", "");
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

    for (const iframe of [
      ...template.content.querySelectorAll(
        "iframe.weekly-youtube-embed"
      )
    ]) {
      const parent = iframe.parentElement;

      if (
        parent &&
        ["DIV", "FIGURE", "SECTION"].includes(parent.tagName) &&
        parent.children.length === 1 &&
        (parent.textContent || "").trim() === ""
      ) {
        parent.classList.add("weekly-video-frame");

        parent.style.removeProperty("padding-top");
        parent.style.removeProperty("padding-bottom");
        parent.style.removeProperty("height");
        parent.style.removeProperty("min-height");

        iframe.style.removeProperty("position");
        iframe.style.removeProperty("top");
        iframe.style.removeProperty("right");
        iframe.style.removeProperty("bottom");
        iframe.style.removeProperty("left");
        iframe.style.removeProperty("height");
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
    toPlainText
  });
})();
