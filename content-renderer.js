(() => {
  "use strict";

  const HTML_MARKER = "<!--weekly-html:v1-->";

  const ALLOWED_TAGS = new Set([
    "article", "section", "div", "span",
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "mark", "small",
    "h2", "h3", "h4", "h5",
    "ul", "ol", "li",
    "blockquote",
    "a", "img", "figure", "figcaption",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
    "code", "pre", "kbd", "sup", "sub"
  ]);

  const DROP_WITH_CONTENT = new Set([
    "script", "style", "iframe", "object", "embed",
    "svg", "math", "template", "form",
    "input", "button", "select", "textarea",
    "meta", "link", "base"
  ]);

  const GLOBAL_ATTRIBUTES = new Set([
    "class", "title", "style"
  ]);

  const TAG_ATTRIBUTES = {
    a: new Set(["href", "target", "rel"]),
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
    "max-width"
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

    const cleaned = [];

    for (const property of SAFE_STYLE_PROPERTIES) {
      const cssValue = probe.style.getPropertyValue(property).trim();
      if (!cssValue) continue;

      if (
        /url\s*\(/i.test(cssValue) ||
        /expression\s*\(/i.test(cssValue) ||
        /javascript:/i.test(cssValue) ||
        /@import/i.test(cssValue)
      ) {
        continue;
      }

      cleaned.push(`${property}: ${cssValue}`);
    }

    return cleaned.join("; ");
  }

  function sanitizeElement(element) {
    const tag = element.tagName.toLowerCase();

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

      if (!GLOBAL_ATTRIBUTES.has(name) && !allowedForTag.has(name)) {
        element.removeAttribute(attribute.name);
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
