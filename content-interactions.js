(() => {
  "use strict";

  const FRAME_SELECTOR = [
    ".announcement-content.html-content",
    ".announcement-content"
  ].join(", ");

  const TAB_PANEL_SELECTOR = [
    '[role="tabpanel"]',
    "[data-tab-panel]",
    ".notice-tab-panel",
    ".tab-panel",
    ".tab-pane",
    ".tabs-panel",
    ".tab-section",
    ".ui.tab"
  ].join(", ");

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

  const tabByTrigger = new WeakMap();
  const tabByNav = new WeakMap();
  const accordionByTrigger = new WeakMap();
  const accordionByRoot = new WeakMap();
  const frameKeys = new WeakMap();
  const detailsOriginalNames = new WeakMap();

  let elementUid = 0;
  let frameUid = 0;
  let scheduledFrame = 0;

  function unique(elements) {
    const seen = new Set();

    return elements.filter(element => {
      if (!element || seen.has(element)) return false;
      seen.add(element);
      return true;
    });
  }

  function nextId(prefix) {
    elementUid += 1;
    return `${prefix}-${elementUid}`;
  }

  function getFrameKey(frame) {
    if (!(frame instanceof Element)) return "document";

    if (!frameKeys.has(frame)) {
      frameUid += 1;
      frameKeys.set(frame, `weekly-frame-${frameUid}`);
    }

    return frameKeys.get(frame);
  }

  function collectFrames(scope = document) {
    if (!scope?.querySelectorAll) return [];

    if (scope instanceof Element && scope.matches(FRAME_SELECTOR)) {
      return [scope];
    }

    const contentFrames = [
      ...scope.querySelectorAll(
        ".announcement-content.html-content"
      )
    ];

    if (contentFrames.length) {
      return unique(contentFrames);
    }

    const fallbackFrames = [
      ...scope.querySelectorAll(".announcement-content")
    ];

    if (fallbackFrames.length) {
      return unique(fallbackFrames);
    }

    return [scope];
  }


  function normalizeTarget(value = "") {
    const raw = String(value).trim();
    if (!raw) return "";

    const hash = raw.indexOf("#");

    return hash >= 0
      ? raw.slice(hash + 1)
      : raw;
  }

  function findLocalId(root, id) {
    if (!(root instanceof Element) || !id) return null;

    for (const candidate of root.querySelectorAll("[id]")) {
      if (candidate.id === id) return candidate;
    }

    return null;
  }

  function triggerTarget(trigger) {
    if (!(trigger instanceof Element)) return "";

    const direct =
      trigger.getAttribute("aria-controls") ||
      trigger.getAttribute("data-tab-target") ||
      trigger.getAttribute("data-bs-target") ||
      trigger.getAttribute("data-target") ||
      "";

    if (direct) return normalizeTarget(direct);

    const href = trigger.getAttribute("href") || "";

    return href.includes("#")
      ? normalizeTarget(href)
      : "";
  }

  function triggerKey(trigger) {
    return (
      trigger?.getAttribute("data-tab") ||
      trigger?.getAttribute("data-tab-key") ||
      ""
    ).trim();
  }

  function panelKey(panel) {
    return (
      panel?.getAttribute("data-tab") ||
      panel?.getAttribute("data-tab-panel") ||
      panel?.getAttribute("data-tab-key") ||
      ""
    ).trim();
  }

  function tabPanelPool(root, nav) {
    if (!(root instanceof Element)) return [];

    return [
      ...root.querySelectorAll(TAB_PANEL_SELECTOR)
    ].filter(panel => {
      if (nav?.contains(panel)) return false;

      return true;
    });
  }

  function resolveTabPanel(root, trigger, pool, index) {
    const targetId = triggerTarget(trigger);

    if (targetId) {
      const direct = findLocalId(root, targetId);

      if (
        direct &&
        direct !== trigger &&
        !trigger.contains(direct)
      ) {
        return direct;
      }
    }

    const key = triggerKey(trigger);

    if (key) {
      const byKey = pool.find(
        panel => panelKey(panel) === key
      );

      if (byKey) return byKey;
    }

    return pool[index] || null;
  }

  function triggerList(nav, selector) {
    if (!(nav instanceof Element)) return [];

    return unique([
      ...nav.querySelectorAll(selector)
    ]).filter(trigger => !tabByTrigger.has(trigger));
  }

  function inferInitialTab(pairs) {
    return (
      pairs.find(({ trigger, panel }) =>
        trigger.getAttribute("aria-selected") === "true" ||
        trigger.classList.contains("active") ||
        trigger.classList.contains("is-active") ||
        panel.classList.contains("active") ||
        panel.classList.contains("show") ||
        panel.classList.contains("is-active")
      ) ||
      pairs[0] ||
      null
    );
  }

  function setTabActive(group, activeTrigger) {
    if (!group) return;

    for (const { trigger, panel } of group.pairs) {
      const active = trigger === activeTrigger;

      trigger.setAttribute(
        "aria-selected",
        String(active)
      );
      trigger.tabIndex = active ? 0 : -1;

      trigger.classList.toggle("active", active);
      trigger.classList.toggle("show", active);
      trigger.classList.toggle("is-active", active);

      const item = trigger.closest("li");

      if (item && group.nav.contains(item)) {
        item.classList.toggle("active", active);
        item.classList.toggle("is-active", active);
      }

      panel.hidden = !active;
      panel.classList.toggle("active", active);
      panel.classList.toggle("show", active);
      panel.classList.toggle("is-active", active);
    }
  }

  function createTabGroup({
    frame,
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

    const existing = tabByNav.get(nav);

    if (existing) {
      return existing;
    }

    const cleanTriggers = unique(triggers)
      .filter(trigger => root.contains(trigger))
      .filter(trigger => !tabByTrigger.has(trigger));

    if (cleanTriggers.length < 2) return null;

    const pool = tabPanelPool(root, nav);
    const pairs = [];
    const usedPanels = new Set();

    cleanTriggers.forEach((trigger, index) => {
      const panel = resolveTabPanel(
        root,
        trigger,
        pool,
        index
      );

      if (!panel || usedPanels.has(panel)) return;

      usedPanels.add(panel);
      pairs.push({ trigger, panel });
    });

    if (pairs.length < 2) return null;

    root.classList.add("weekly-tabs-root");
    root.setAttribute("data-weekly-tabs-ready", "true");

    nav.classList.add("weekly-tab-list");
    nav.setAttribute("role", "tablist");

    const group = {
      frame,
      root,
      nav,
      pairs
    };

    tabByNav.set(nav, group);

    for (const { trigger, panel } of pairs) {
      tabByTrigger.set(trigger, group);

      trigger.classList.add("weekly-tab-button");
      trigger.setAttribute("role", "tab");

      if (!trigger.id) {
        trigger.id = nextId("weekly-tab");
      }

      const item = trigger.closest("li");

      if (item && nav.contains(item)) {
        item.classList.add("weekly-tab-item");
      }

      panel.classList.add("weekly-tab-panel");
      panel.setAttribute("role", "tabpanel");

      if (!panel.id) {
        panel.id = nextId("weekly-panel");
      }

      trigger.setAttribute("aria-controls", panel.id);
      panel.setAttribute("aria-labelledby", trigger.id);
    }

    const initial = inferInitialTab(pairs);

    if (initial) {
      setTabActive(group, initial.trigger);
    }

    return group;
  }

  function discoverCanvasTabs(frame) {
    for (const root of frame.querySelectorAll(
      ".enhanceable_content.tabs, .tabs:not(ul):not(ol)"
    )) {
      

      const nav = [...root.children].find(
        child =>
          child.matches?.("ul, ol") &&
          child.querySelectorAll(
            "a[href^='#'], button[aria-controls]"
          ).length >= 2
      );

      if (!nav) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
          nav,
          "a[href^='#'], button[aria-controls]"
        )
      });
    }
  }

  function discoverBootstrapTabs(frame) {
    for (const nav of frame.querySelectorAll(
      ".nav-tabs, .nav-pills"
    )) {
      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, [data-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
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
        )
      });
    }
  }

  function discoverAriaTabs(frame) {
    for (const nav of frame.querySelectorAll('[role="tablist"]')) {
      if (nav.classList.contains("weekly-tab-list")) continue;

      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, [data-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
          nav,
          '[role="tab"], [aria-controls]'
        )
      });
    }
  }

  function discoverFoundationTabs(frame) {
    for (const nav of frame.querySelectorAll("ul.tabs, ol.tabs")) {
      const root = nav.parentElement;
      if (!root) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
          nav,
          ".tabs-title > a[href^='#'], a[href^='#']"
        )
      });
    }
  }

  function discoverGenericTabs(frame) {
    const selector = [
      ".tab-buttons",
      ".tabs-nav",
      ".tab-nav",
      ".tab-list",
      ".tab-links",
      ".tab-menu",
      ".notice-tab-list"
    ].join(", ");

    for (const nav of frame.querySelectorAll(selector)) {
      const root =
        nav.closest(
          ".tabs-container, .tab-container, .tabs-wrapper, .tab-wrapper, .tabbed-content, [data-tabs], [data-notice-tabs]"
        ) ||
        nav.parentElement;

      if (!root) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
          nav,
          [
            "[data-tab-target]",
            "[data-target]",
            "[data-bs-target]",
            "[data-tab]",
            "a[href^='#']",
            "button[aria-controls]"
          ].join(", ")
        )
      });
    }
  }

  function discoverSemanticTabs(frame) {
    for (const nav of frame.querySelectorAll(".ui.tabular.menu")) {
      const root = nav.parentElement;
      if (!root) continue;

      createTabGroup({
        frame,
        root,
        nav,
        triggers: triggerList(
          nav,
          ".item[data-tab]"
        )
      });
    }
  }

  function enhanceTabs(frame) {
    if (!(frame instanceof Element)) return;

    discoverCanvasTabs(frame);
    discoverBootstrapTabs(frame);
    discoverAriaTabs(frame);
    discoverFoundationTabs(frame);
    discoverGenericTabs(frame);
    discoverSemanticTabs(frame);
  }

  function accordionTarget(trigger) {
    const direct =
      trigger?.getAttribute("aria-controls") ||
      trigger?.getAttribute("data-bs-target") ||
      trigger?.getAttribute("data-target") ||
      trigger?.getAttribute("data-collapse-target") ||
      trigger?.getAttribute("data-accordion-target") ||
      "";

    if (direct) return normalizeTarget(direct);

    const href = trigger?.getAttribute("href") || "";

    return href.includes("#")
      ? normalizeTarget(href)
      : "";
  }

  function accordionTriggers(root) {
    return unique([
      ...root.querySelectorAll(ACCORDION_TRIGGER_SELECTOR)
    ]).filter(trigger => {
      if (trigger.closest("details")) return false;

      const nestedRoot = trigger.closest(
        ACCORDION_ROOT_SELECTOR
      );

      return (
        !accordionByTrigger.has(trigger) &&
        (!nestedRoot || nestedRoot === root)
      );
    });
  }

  function accordionPanels(root) {
    return unique([
      ...root.querySelectorAll(ACCORDION_PANEL_SELECTOR)
    ]).filter(panel => {
      if (panel.closest("details")) return false;

      const nestedRoot = panel.closest(
        ACCORDION_ROOT_SELECTOR
      );

      return !nestedRoot || nestedRoot === root;
    });
  }

  function resolveAccordionPanel(
    root,
    trigger,
    panels,
    index
  ) {
    const id = accordionTarget(trigger);

    if (id) {
      const direct = findLocalId(root, id);

      if (
        direct &&
        direct !== trigger &&
        !trigger.contains(direct)
      ) {
        return direct;
      }
    }

    return panels[index] || null;
  }

  function applyAccordionState(pair, open) {
    if (!pair) return;

    pair.trigger.setAttribute(
      "aria-expanded",
      String(open)
    );
    pair.trigger.classList.toggle("is-open", open);
    pair.trigger.classList.toggle("active", open);
    pair.trigger.classList.toggle("show", open);

    pair.panel.hidden = !open;
    pair.panel.classList.toggle("is-open", open);
    pair.panel.classList.toggle("active", open);
    pair.panel.classList.toggle("show", open);
  }

  function setAccordionOpen(group, pair, open) {
    if (!group || !pair) return;

    if (open && group.exclusive) {
      for (const other of group.pairs) {
        if (other === pair) continue;
        applyAccordionState(other, false);
      }
    }

    applyAccordionState(pair, open);
  }

  function createAccordionGroup(frame, root) {
    if (!(root instanceof Element)) return null;

    const existing = accordionByRoot.get(root);
    if (existing) return existing;

    const triggers = accordionTriggers(root);
    const panels = accordionPanels(root);

    if (!triggers.length || !panels.length) {
      return null;
    }

    const pairs = [];
    const usedPanels = new Set();

    triggers.forEach((trigger, index) => {
      const panel = resolveAccordionPanel(
        root,
        trigger,
        panels,
        index
      );

      if (!panel || usedPanels.has(panel)) return;

      usedPanels.add(panel);
      pairs.push({ trigger, panel });
    });

    if (!pairs.length) return null;

    const exclusive =
      root.hasAttribute("data-accordion-single") ||
      root.getAttribute("data-accordion-mode") === "single" ||
      root.classList.contains("accordion-single") ||
      pairs.some(({ panel }) =>
        panel.hasAttribute("data-bs-parent")
      );

    const group = {
      frame,
      root,
      pairs,
      exclusive
    };

    accordionByRoot.set(root, group);

    root.classList.add("weekly-accordion-root");
    root.setAttribute(
      "data-weekly-accordion-ready",
      "true"
    );

    const initiallyOpen = new Set(
      pairs.filter(({ trigger, panel }) =>
        trigger.getAttribute("aria-expanded") === "true" ||
        trigger.classList.contains("active") ||
        panel.classList.contains("show") ||
        panel.classList.contains("active") ||
        panel.classList.contains("is-active")
      )
    );

    if (
      exclusive &&
      initiallyOpen.size > 1
    ) {
      const [firstOpen] = initiallyOpen;
      initiallyOpen.clear();

      if (firstOpen) {
        initiallyOpen.add(firstOpen);
      }
    }

    for (const pair of pairs) {
      const { trigger, panel } = pair;

      accordionByTrigger.set(trigger, group);

      trigger.classList.add(
        "weekly-accordion-trigger"
      );

      if (trigger.tagName === "A") {
        trigger.setAttribute("role", "button");
      }

      if (trigger.tagName === "BUTTON") {
        trigger.setAttribute("type", "button");
      }

      if (!trigger.id) {
        trigger.id = nextId(
          "weekly-accordion-trigger"
        );
      }

      panel.classList.add(
        "weekly-accordion-panel"
      );
      panel.setAttribute("role", "region");

      if (!panel.id) {
        panel.id = nextId(
          "weekly-accordion-panel"
        );
      }

      trigger.setAttribute(
        "aria-controls",
        panel.id
      );
      panel.setAttribute(
        "aria-labelledby",
        trigger.id
      );

      applyAccordionState(
        pair,
        initiallyOpen.has(pair)
      );
    }

    return group;
  }

  function discoverAccordionRoots(frame) {
    const roots = new Set([
      ...frame.querySelectorAll(ACCORDION_ROOT_SELECTOR)
    ]);

    for (const trigger of frame.querySelectorAll(
      ACCORDION_TRIGGER_SELECTOR
    )) {
      if (
        trigger.closest("details") ||
        accordionByTrigger.has(trigger)
      ) {
        continue;
      }

      let root = trigger.closest(
        ACCORDION_ROOT_SELECTOR
      );

      if (!root) {
        let current = trigger.parentElement;

        for (
          let depth = 0;
          current && depth < 4;
          depth += 1
        ) {
          const triggerCount =
            current.querySelectorAll(
              ACCORDION_TRIGGER_SELECTOR
            ).length;
          const panelCount =
            current.querySelectorAll(
              ACCORDION_PANEL_SELECTOR
            ).length;

          if (triggerCount >= 1 && panelCount >= 1) {
            root = current;
            break;
          }

          current = current.parentElement;
        }
      }

      if (root) roots.add(root);
    }

    return roots;
  }

  function enhanceNativeDetails(frame) {
    const frameKey = getFrameKey(frame);

    for (const details of frame.querySelectorAll("details")) {
      const summary =
        details.querySelector(":scope > summary");

      if (!summary) continue;

      details.classList.add(
        "weekly-native-details"
      );
      summary.classList.add(
        "weekly-native-summary"
      );

      if (!summary.id) {
        summary.id = nextId("weekly-summary");
      }

      if (!detailsOriginalNames.has(details)) {
        detailsOriginalNames.set(
          details,
          details.getAttribute("name") || ""
        );
      }

      const originalName =
        detailsOriginalNames.get(details);

      if (originalName) {
        const scopedName =
          `${frameKey}--${originalName}`;

        if (
          details.getAttribute("name") !==
          scopedName
        ) {
          details.setAttribute(
            "name",
            scopedName
          );
        }
      }
    }
  }

  function enhanceAccordions(frame) {
    if (!(frame instanceof Element)) return;

    enhanceNativeDetails(frame);

    for (const root of discoverAccordionRoots(frame)) {
      createAccordionGroup(frame, root);
    }
  }

  function enhance(scope = document) {
    for (const frame of collectFrames(scope)) {
      if (!(frame instanceof Element)) continue;

      enhanceTabs(frame);
      enhanceAccordions(frame);
    }
  }

  function scheduleEnhance(scope = document) {
    if (scheduledFrame) return;

    scheduledFrame = requestAnimationFrame(() => {
      scheduledFrame = 0;
      enhance(scope);
    });
  }

  document.addEventListener("click", event => {
    const tab =
      event.target.closest(".weekly-tab-button");

    if (tab) {
      const group = tabByTrigger.get(tab);

      if (group) {
        event.preventDefault();
        event.stopPropagation();
        setTabActive(group, tab);
        return;
      }
    }

    const accordion =
      event.target.closest(
        ".weekly-accordion-trigger"
      );

    if (!accordion) return;

    const group =
      accordionByTrigger.get(accordion);

    if (!group) return;

    const pair = group.pairs.find(
      item => item.trigger === accordion
    );

    if (!pair) return;

    event.preventDefault();
    event.stopPropagation();

    const open =
      accordion.getAttribute(
        "aria-expanded"
      ) !== "true";

    setAccordionOpen(group, pair, open);
  });

  document.addEventListener("keydown", event => {
    const tab =
      event.target.closest(".weekly-tab-button");

    if (tab) {
      const group = tabByTrigger.get(tab);

      if (!group) return;

      if (
        tab.tagName === "A" &&
        event.key === " "
      ) {
        event.preventDefault();
        event.stopPropagation();
        setTabActive(group, tab);
        return;
      }

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

      const triggers = group.pairs.map(
        pair => pair.trigger
      );
      const index = triggers.indexOf(tab);

      if (index < 0) return;

      let nextIndex = index;

      if (event.key === "ArrowRight") {
        nextIndex =
          (index + 1) % triggers.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (index - 1 + triggers.length) %
          triggers.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = triggers.length - 1;
      }

      event.preventDefault();
      event.stopPropagation();

      const next = triggers[nextIndex];

      setTabActive(group, next);
      next.focus();
      return;
    }

    const accordion =
      event.target.closest(
        ".weekly-accordion-trigger"
      );

    if (
      accordion?.tagName === "A" &&
      event.key === " "
    ) {
      event.preventDefault();
      accordion.click();
    }
  });

  function startObserver() {
    if (!document.body) return;

    const observer = new MutationObserver(records => {
      if (
        records.some(record =>
          record.addedNodes.length
        )
      ) {
        scheduleEnhance(document);
      }
    });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  function start() {
    enhance(document);
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

  window.WeeklyInteractions = Object.freeze({
    enhance
  });
})();
