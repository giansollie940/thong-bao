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
    const panelToggle = root.querySelector(
      "#announcement-format-more"
    );
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
      !panelToggle ||
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
      try {
        action();
      } finally {
        /*
         * Giữ vùng bôi đen sau khi định dạng,
         * để người dùng có thể bấm tiếp màu/highlight/căn lề
         * mà không phải chọn lại.
         */
        requestAnimationFrame(
          restoreSelection
        );
      }
    }

    function setPanelOpen(open) {
      panel.hidden = !open;
      panelToggle.setAttribute(
        "aria-expanded",
        String(open)
      );
      panelToggle.classList.toggle(
        "active",
        open
      );
    }

    panelToggle.addEventListener(
      "pointerdown",
      rememberSelection,
      true
    );

    panelToggle.addEventListener("click", () => {
      setPanelOpen(panel.hidden);
    });

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
