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
    const clearButton = root.querySelector(
      "[data-editor-clear-format]"
    );

    if (
      !toolbar ||
      !fontSelect ||
      !sizeSelect ||
      !textColor ||
      !highlightColor ||
      !alignButtons.length ||
      !clearButton
    ) {
      throw new Error(
        "Thiếu thành phần của Formatting Toolbar."
      );
    }

    const resetSelect = select => {
      requestAnimationFrame(() => {
        select.value = "";
      });
    };

    fontSelect.addEventListener("change", () => {
      if (!fontSelect.value) return;

      editor.applyInlineStyle({
        "font-family": fontSelect.value
      });

      resetSelect(fontSelect);
    });

    sizeSelect.addEventListener("change", () => {
      if (!sizeSelect.value) return;

      editor.applyInlineStyle({
        "font-size": sizeSelect.value
      });

      resetSelect(sizeSelect);
    });

    textColor.addEventListener("change", () => {
      editor.applyInlineStyle({
        color: textColor.value
      });
    });

    highlightColor.addEventListener("change", () => {
      editor.applyInlineStyle({
        "background-color": highlightColor.value
      });
    });

    toolbar.addEventListener(
      "pointerdown",
      event => {
        if (
          event.target.closest(
            "[data-editor-align], [data-editor-clear-format]"
          )
        ) {
          event.preventDefault();
        }
      }
    );

    for (const button of alignButtons) {
      button.addEventListener("click", () => {
        editor.applyBlockStyle({
          "text-align": button.dataset.editorAlign
        });
      });
    }

    clearButton.addEventListener("click", () => {
      editor.clearFormatting();
      onToast("Đã xóa định dạng đã chọn.");
    });

    return Object.freeze({
      reset() {
        fontSelect.value = "";
        sizeSelect.value = "";
      }
    });
  }

  window.WeeklyEditorFormatting = Object.freeze({
    create
  });
})();
