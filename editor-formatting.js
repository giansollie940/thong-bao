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
    const inlineStateButtons = {
      bold: toolbar.querySelector('[data-format="bold"]'),
      italic: toolbar.querySelector('[data-format="italic"]'),
      underline: toolbar.querySelector('[data-format="underline"]'),
      strikeThrough: toolbar.querySelector('[data-format="strike"]')
    };

    function updateInlineButtonStates() {
      for (const [command, button] of Object.entries(inlineStateButtons)) {
        if (!button) continue;

        let active = false;
        try {
          active = Boolean(document.queryCommandState(command));
        } catch {
          active = false;
        }

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      }
    }

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
    let activePanelToggle = null;

    panel.classList.add("editor-format-dropdown");

    /*
     * The announcement form scrolls inside .modal-card. Keep the popup
     * in the dialog top layer but outside that scrolling/clipping element,
     * otherwise a fixed popup can be visually clipped or drift from its
     * trigger while the form scrolls.
     */
    const dialogHost = root.closest("dialog");
    if (dialogHost && panel.parentElement !== dialogHost) {
      dialogHost.append(panel);
    }

    function positionPanel(toggle = activePanelToggle) {
      if (!toggle || panel.hidden) return;

      const rect = toggle.getBoundingClientRect();
      const gap = 6;
      const margin = 10;
      const preferredWidth =
        activePanelMode === "align" ? 292 : 390;
      const width = Math.min(
        preferredWidth,
        Math.max(240, window.innerWidth - margin * 2)
      );
      const left = Math.min(
        Math.max(margin, rect.left),
        Math.max(margin, window.innerWidth - width - margin)
      );
      let top = rect.bottom + gap;

      panel.style.width = `${width}px`;
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;

      const panelRect = panel.getBoundingClientRect();
      if (panelRect.bottom > window.innerHeight - margin) {
        top = Math.max(
          margin,
          rect.top - panelRect.height - gap
        );
        panel.style.top = `${top}px`;
      }
    }

    function setPanelOpen(open, mode = activePanelMode, toggle = activePanelToggle) {
      const nextMode =
        mode ||
        panelToggles[0].dataset.editorFormatToggle;

      activePanelMode = open ? nextMode : null;
      activePanelToggle = open
        ? toggle || panelToggles.find(
            item => item.dataset.editorFormatToggle === nextMode
          )
        : null;

      if (open) {
        /*
         * Measure and position while invisible, then reveal synchronously.
         * This prevents the one-frame flash at the panel's previous/default
         * position that users perceive as a violent hover/click jitter.
         */
        panel.style.visibility = "hidden";
        panel.hidden = false;
        panel.dataset.mode = nextMode;
        panel.dataset.anchor = activePanelToggle?.id || "";
      } else {
        panel.hidden = true;
        panel.style.removeProperty("visibility");
        delete panel.dataset.mode;
        delete panel.dataset.anchor;
        panel.style.removeProperty("left");
        panel.style.removeProperty("top");
        panel.style.removeProperty("width");
      }

      for (const section of panelSections) {
        section.hidden =
          open &&
          section.dataset.editorFormatSection !== nextMode;
      }

      for (const item of panelToggles) {
        const active =
          open &&
          item.dataset.editorFormatToggle === nextMode;

        item.setAttribute(
          "aria-expanded",
          String(active)
        );
        item.classList.toggle("active", active);
      }

      if (open) {
        positionPanel(activePanelToggle);
        panel.style.removeProperty("visibility");
      }
    }

    for (const toggle of panelToggles) {
      toggle.addEventListener("click", () => {
        const mode = toggle.dataset.editorFormatToggle;
        const samePanelOpen =
          !panel.hidden && activePanelMode === mode;

        setPanelOpen(!samePanelOpen, mode, toggle);
      });
    }

    document.addEventListener("pointerdown", event => {
      if (panel.hidden) return;
      if (panel.contains(event.target)) return;
      if (panelToggles.some(item => item.contains(event.target))) return;
      setPanelOpen(false);
    });

    window.addEventListener(
      "resize",
      () => positionPanel(),
      { passive: true }
    );

    /* Scroll does not bubble. Capture phase sees scrolling modal-card too. */
    document.addEventListener(
      "scroll",
      () => positionPanel(),
      { passive: true, capture: true }
    );

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

    toolbar.addEventListener("click", event => {
      const button = event.target.closest(
        '[data-format="bold"], [data-format="italic"], [data-format="underline"], [data-format="strike"]'
      );
      if (!button) return;

      /*
       * The rich-editor click handler runs first and performs the actual
       * toggle. Mirror that toggle deterministically on the toolbar button
       * so focus/selection restoration cannot leave stale visual state.
       */
      const nextActive = button.getAttribute("aria-pressed") !== "true";
      button.classList.toggle("active", nextActive);
      button.setAttribute("aria-pressed", String(nextActive));
    });

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
