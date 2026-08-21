(() => {
  "use strict";

  const root = document.querySelector("#diamond-loader");
  const title = document.querySelector("#diamond-loader-title");
  const message = document.querySelector("#diamond-loader-message");

  if (!root) {
    window.WeeklyLoader = Object.freeze({
      show: () => {},
      hide: () => {},
      begin: () => () => {},
      setMessage: () => {}
    });
    return;
  }

  let activeCount = 0;
  let showTimer = 0;
  let visibleSince = performance.now();
  let hideTimer = 0;

  function clearTimers() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = 0;
    }

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }
  }

  function setMessage(
    nextMessage = "Đang tải dữ liệu...",
    nextTitle = "Đang tải bảng thông báo"
  ) {
    if (title) {
      title.textContent = nextTitle;
    }

    if (message) {
      message.textContent = nextMessage;
    }

    root.setAttribute(
      "aria-label",
      `${nextTitle}. ${nextMessage}`
    );
  }

  function reveal({ blocking = false } = {}) {
    clearTimers();
    visibleSince = performance.now();
    root.classList.add("is-visible");
    root.classList.toggle("is-blocking", Boolean(blocking));
    root.setAttribute("aria-busy", "true");
  }

  function show({
    message: nextMessage = "Đang tải dữ liệu...",
    title: nextTitle = "Đang tải bảng thông báo",
    delay = 110,
    blocking = false
  } = {}) {
    setMessage(nextMessage, nextTitle);

    if (root.classList.contains("is-visible")) {
      root.classList.toggle("is-blocking", Boolean(blocking));
      return;
    }

    if (showTimer) return;

    showTimer = window.setTimeout(() => {
      showTimer = 0;
      reveal({ blocking });
    }, Math.max(0, delay));
  }

  function hide({ minimum = 260 } = {}) {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = 0;
    }

    if (!root.classList.contains("is-visible")) {
      root.classList.remove("is-blocking");
      root.setAttribute("aria-busy", "false");
      return;
    }

    const elapsed = performance.now() - visibleSince;
    const wait = Math.max(0, minimum - elapsed);

    if (hideTimer) {
      clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(() => {
      hideTimer = 0;
      root.classList.remove("is-visible", "is-blocking");
      root.setAttribute("aria-busy", "false");
    }, wait);
  }

  function begin(options = {}) {
    activeCount += 1;
    show(options);

    let ended = false;

    return () => {
      if (ended) return;
      ended = true;

      activeCount = Math.max(0, activeCount - 1);

      if (activeCount === 0) {
        hide({ minimum: options.minimum ?? 260 });
      }
    };
  }

  function finishInitial() {
    activeCount = 0;
    hide({ minimum: 420 });
  }

  window.WeeklyLoader = Object.freeze({
    show,
    hide,
    begin,
    setMessage,
    finishInitial
  });
})();
