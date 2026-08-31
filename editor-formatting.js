(() => {
  "use strict";

  function create({
    root,
    editor,
    onToast = () => {}
  } = {}) {
    if (!root || !editor) {
      throw new Error(
        "Thiếu root hoặc rich editor cho Formatting Toolbar."
      );
    }

    const toolbar = root.querySelector(
      "#announcement-format-toolbar"
    );
    const panel = root.querySelector(
      "#announcement-format-panel"
    );

    function enhanceLegacyToolbar() {
      if (!toolbar || !panel) return;

      const legacyToggle = root.querySelector(
        "#announcement-format-more"
      );
      let colorToggle = root.querySelector(
        "#announcement-color-more"
      );
      let alignToggle = root.querySelector(
        "#announcement-align-more"
      );

      if (!colorToggle && legacyToggle) {
        colorToggle = legacyToggle;
        colorToggle.id = "announcement-color-more";
        colorToggle.dataset.editorFormatToggle = "color";
        colorToggle.title = "Màu chữ và highlight";
        colorToggle.setAttribute(
          "aria-label",
          "Màu chữ và highlight"
        );
        colorToggle.textContent = "🎨 Màu";
      }

      if (!alignToggle && colorToggle) {
        alignToggle = document.createElement("button");
        alignToggle.className =
          "format-button format-button-wide format-more-button";
        alignToggle.id = "announcement-align-more";
        alignToggle.type = "button";
        alignToggle.dataset.editorFormatToggle = "align";
        alignToggle.setAttribute(
          "aria-controls",
          "announcement-format-panel"
        );
        alignToggle.setAttribute("aria-expanded", "false");
        alignToggle.setAttribute(
          "aria-label",
          "Căn lề đoạn văn"
        );
        alignToggle.title = "Căn lề đoạn văn";
        alignToggle.textContent = "☰ Căn";
        colorToggle.after(alignToggle);
      }

      const groups = [
        ...panel.querySelectorAll(
          ".editor-format-panel-group"
        )
      ];

      if (groups.length >= 3) {
        groups[0].dataset.editorFormatSection = "align";
        groups[1].dataset.editorFormatSection = "color";
        groups[2].dataset.editorFormatSection = "color";
      }

      const heading = toolbar.querySelector(
        '[data-format="heading"]'
      );
      const link = toolbar.querySelector(
        '[data-format="link"]'
      );
      const clear = toolbar.querySelector(
        "[data-editor-clear-format]"
      );
      const bold = toolbar.querySelector(
        '[data-format="bold"]'
      );
      const find = toolbar.querySelector(
        "#announcement-find-toggle"
      );

      if (heading && colorToggle) {
        heading.before(colorToggle);
        colorToggle.after(alignToggle);
        alignToggle.after(heading);
      }

      if (link && clear) {
        link.after(clear);
      }

      for (const separator of [
        ...toolbar.querySelectorAll(
          ".format-separator"
        )
      ]) {
        separator.remove();
      }

      for (const target of [
        bold,
        colorToggle,
        heading,
        link,
        find
      ]) {
        if (!target) continue;

        const separator = document.createElement("span");
        separator.className = "format-separator";
        separator.setAttribute("aria-hidden", "true");
        target.before(separator);
      }

      const hint = panel.querySelector(
        ".editor-format-panel-hint"
      );
      if (hint) {
        hint.textContent =
          "Bôi đen nội dung trước, sau đó chọn Màu hoặc Căn. " +
          "Vùng chọn được giữ lại để áp dụng nhiều định dạng liên tiếp.";
      }
    }

    enhanceLegacyToolbar();
    const panelToggles = [
      ...root.querySelectorAll(
        "[data-editor-format-toggle]"
      )
    ];
    const panelSections = [
      ...root.querySelectorAll(
        "[data-editor-format-section]"
      )
    ];
    const fontSelect = root.querySelector(
      "#announcement-font-family"
    );
    const sizeSelect = root.querySelector(
      "#announcement-font-size"
    );
    const textColor = root.querySelector(
      "#announcement-text-color"
    );
    const highlightColor = root.querySelector(
      "#announcement-highlight-color"
    );
    const alignButtons = [
      ...root.querySelectorAll("[data-editor-align]")
    ];
    const textSwatches = [
      ...root.querySelectorAll("[data-editor-text-color]")
    ];
    const highlightSwatches = [
      ...root.querySelectorAll(
        "[data-editor-highlight-color]"
      )
    ];
    const clearButton = root.querySelector(
      "[data-editor-clear-format]"
    );

    if (
      !toolbar ||
      !panel ||
      !panelToggles.length ||
      !panelSections.length ||
      !fontSelect ||
      !sizeSelect ||
      !textColor ||
      !highlightColor ||
      !alignButtons.length ||
      !textSwatches.length ||
      !highlightSwatches.length ||
      !clearButton
    ) {
      throw new Error(
        "Thiếu thành phần của Formatting Toolbar."
      );
    }

    function rememberSelection() {
      editor.captureSelection?.();
    }

    function restoreSelection() {
      editor.restoreSelection?.({
        focus: true
      });
    }

    function runWithSelection(action) {
      /*
       * Restore the snapshot BEFORE formatting. A focus-taking
       * select/color control can leave a collapsed caret inside the
       * editor; without this step that caret can replace the real
       * highlighted range.
       */
      restoreSelection();

      try {
        action();
        rememberSelection();
      } finally {
        /* Keep the updated selection available for the next command. */
        requestAnimationFrame(restoreSelection);
      }
    }

    let activePanelMode = null;

    function setPanelOpen(open, mode = activePanelMode) {
      const nextMode =
        mode ||
        panelToggles[0].dataset.editorFormatToggle;

      panel.hidden = !open;
      activePanelMode = open ? nextMode : null;

      if (open) {
        panel.dataset.mode = nextMode;
      } else {
        delete panel.dataset.mode;
      }

      for (const section of panelSections) {
        section.hidden =
          open &&
          section.dataset.editorFormatSection !== nextMode;
      }

      for (const toggle of panelToggles) {
        const active =
          open &&
          toggle.dataset.editorFormatToggle === nextMode;

        toggle.setAttribute(
          "aria-expanded",
          String(active)
        );
        toggle.classList.toggle("active", active);
      }
    }

    for (const toggle of panelToggles) {
      toggle.addEventListener("click", () => {
        const mode = toggle.dataset.editorFormatToggle;
        const samePanelOpen =
          !panel.hidden && activePanelMode === mode;

        setPanelOpen(!samePanelOpen, mode);
      });
    }

    /*
     * Capture phase rất quan trọng:
     * lưu selection TRƯỚC KHI select/color/button nhận focus.
     */
    for (const container of [
      toolbar,
      panel
    ]) {
      container.addEventListener(
        "pointerdown",
        rememberSelection,
        true
      );

      container.addEventListener(
        "mousedown",
        rememberSelection,
        true
      );
    }

    const resetSelect = select => {
      requestAnimationFrame(() => {
        select.value = "";
      });
    };

    fontSelect.addEventListener("change", () => {
      if (!fontSelect.value) return;

      runWithSelection(() => {
        editor.applyInlineStyle({
          "font-family": fontSelect.value
        });
      });

      resetSelect(fontSelect);
    });

    sizeSelect.addEventListener("change", () => {
      if (!sizeSelect.value) return;

      runWithSelection(() => {
        editor.applyInlineStyle({
          "font-size": sizeSelect.value
        });
      });

      resetSelect(sizeSelect);
    });

    for (const button of alignButtons) {
      button.addEventListener("click", () => {
        runWithSelection(() => {
          editor.applyBlockStyle({
            "text-align":
              button.dataset.editorAlign
          });
        });

        for (const item of alignButtons) {
          item.classList.toggle(
            "active",
            item === button
          );
        }
      });
    }

    for (const swatch of textSwatches) {
      swatch.addEventListener("click", () => {
        const color =
          swatch.dataset.editorTextColor;

        runWithSelection(() => {
          editor.applyInlineStyle({
            color
          });
        });

        textColor.value =
          /^#[0-9a-f]{6}$/i.test(color)
            ? color
            : "#243a33";
      });
    }

    for (const swatch of highlightSwatches) {
      swatch.addEventListener("click", () => {
        const color =
          swatch.dataset.editorHighlightColor;

        runWithSelection(() => {
          editor.applyInlineStyle({
            "background-color": color
          });
        });

        if (/^#[0-9a-f]{6}$/i.test(color)) {
          highlightColor.value = color;
        }
      });
    }

    textColor.addEventListener("change", () => {
      runWithSelection(() => {
        editor.applyInlineStyle({
          color: textColor.value
        });
      });
    });

    highlightColor.addEventListener(
      "change",
      () => {
        runWithSelection(() => {
          editor.applyInlineStyle({
            "background-color":
              highlightColor.value
          });
        });
      }
    );

    clearButton.addEventListener("click", () => {
      runWithSelection(() => {
        editor.clearFormatting();
      });

      onToast(
        "Đã xóa định dạng đã chọn."
      );
    });

    root.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        !panel.hidden
      ) {
        setPanelOpen(false);
        restoreSelection();
      }
    });

    return Object.freeze({
      reset() {
        fontSelect.value = "";
        sizeSelect.value = "";
        setPanelOpen(false);

        for (const item of alignButtons) {
          item.classList.remove("active");
        }
      },
      closePanel() {
        setPanelOpen(false);
      }
    });
  }

  window.WeeklyEditorFormatting =
    Object.freeze({
      create
    });
})();
