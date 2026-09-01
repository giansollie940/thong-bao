(() => {
  const STORAGE_KEY = "weekly-sidebar-collapsed";
  const desktopQuery = window.matchMedia("(min-width: 821px)");

  function boot() {
    const shell = document.querySelector(".app-shell");
    const sidebar = document.querySelector("#app-sidebar");
    const toggle = document.querySelector("#sidebar-toggle");
    if (!shell || !sidebar || !toggle) return;

    const labelTargets = sidebar.querySelectorAll(
      ".sidebar-link, .sidebar-command, .sidebar-mini-command, .sidebar-action"
    );
    labelTargets.forEach((node) => {
      if (!node.dataset.sidebarLabel) {
        node.dataset.sidebarLabel = node.textContent.replace(/\s+/g, " ").trim();
      }
    });

    function readPreference() {
      try {
        return localStorage.getItem(STORAGE_KEY) === "true";
      } catch (_) {
        return false;
      }
    }

    function persistPreference(collapsed) {
      try {
        localStorage.setItem(STORAGE_KEY, String(collapsed));
      } catch (_) {
        // Storage can be unavailable in privacy-restricted contexts.
      }
    }

    function applyState(collapsed, { persist = false } = {}) {
      const effectiveCollapsed = desktopQuery.matches && collapsed;
      shell.classList.toggle("sidebar-collapsed", effectiveCollapsed);
      sidebar.classList.toggle("is-collapsed", effectiveCollapsed);
      toggle.setAttribute("aria-expanded", String(!effectiveCollapsed));
      toggle.setAttribute(
        "aria-label",
        effectiveCollapsed ? "Bung thanh điều hướng" : "Thu gọn thanh điều hướng"
      );
      toggle.title = effectiveCollapsed ? "Bung thanh điều hướng" : "Thu gọn thanh điều hướng";
      const glyph = toggle.querySelector("[aria-hidden='true']");
      if (glyph) glyph.textContent = effectiveCollapsed ? "›" : "‹";
      if (persist && desktopQuery.matches) persistPreference(effectiveCollapsed);
    }

    applyState(readPreference());

    toggle.addEventListener("click", () => {
      const next = !shell.classList.contains("sidebar-collapsed");
      applyState(next, { persist: true });
    });

    const handleViewportChange = () => applyState(readPreference());
    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", handleViewportChange);
    } else {
      desktopQuery.addListener(handleViewportChange);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
