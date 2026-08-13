(() => {
  "use strict";

  const pet = document.getElementById("pet-companion");
  const character = document.getElementById("pet-character");
  const hideButton = document.getElementById("pet-hide");
  const restoreButton = document.getElementById("pet-restore");
  const speech = document.getElementById("pet-speech");

  if (!pet || !character || !hideButton || !restoreButton || !speech) return;

  const config = window.APP_CONFIG || {};
  const supabaseUrl = String(config.SUPABASE_URL || "").replace(/\/+$/, "");
  const QUOTE_ENDPOINT = supabaseUrl
    ? `${supabaseUrl}/functions/v1/learning-quote`
    : "";

  const PET_HIDDEN_KEY = "weeklyBoardPetHidden";
  const QUOTE_SEEN_KEY = "weeklyBoardQuoteSeenV3";
  const OFFLINE_SEEN_KEY = "weeklyBoardOfflineQuoteSeenV1";

  const QUOTE_INTERVAL_MS = 60 * 1000;
  const QUOTE_VISIBLE_MS = 12 * 1000;
  const QUOTE_REQUEST_TIMEOUT_MS = 8000;
  const MAX_SEEN_IDS_SENT = 400;

  const SOURCE_NAME = "Từ điển danh ngôn";
  const SOURCE_CATEGORY_URL =
    "https://www.tudiendanhngon.vn/danhngon/ds/strcats/180";

  /*
   * Chỉ là lớp dự phòng cuối cùng khi Edge Function không thể truy cập.
   * Nguồn chính của app là Edge Function + cache PostgreSQL.
   */
  const OFFLINE_QUOTES = [
    {
      id: "offline:01",
      text: "Trong cách học, tự học phải là phần cốt lõi.",
      author: "Hồ Chí Minh",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "offline:02",
      text: "Không biết chưa đáng ngại bằng việc không muốn học thêm.",
      author: "Benjamin Franklin",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "offline:03",
      text: "Học hỏi là hành trình mà trí óc không nên ngừng nghỉ.",
      author: "Leonardo da Vinci",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "offline:04",
      text: "Người thầy chân chính cũng luôn là một người học.",
      author: "Elbert Hubbard",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    }
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  let lastScrollY = window.scrollY;
  let scrollTimer = 0;
  let speechTimer = 0;
  let helloTimer = 0;
  let quoteTimer = 0;
  let rafId = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let quoteLoading = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function loadStringArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(value => typeof value === "string");
    } catch {
      return [];
    }
  }

  function saveStringArray(key, values) {
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch {
      // Private mode/storage disabled: app vẫn hoạt động, chỉ mất lịch sử chống lặp.
    }
  }

  function rememberQuoteId(id, cycleReset = false) {
    if (!id) return;

    let seen = cycleReset ? [] : loadStringArray(QUOTE_SEEN_KEY);

    if (!seen.includes(id)) {
      seen.push(id);
    }

    // Giữ payload request nhỏ, trong khi kho hiện tại nhỏ hơn giới hạn này nhiều.
    if (seen.length > MAX_SEEN_IDS_SENT) {
      seen = seen.slice(-MAX_SEEN_IDS_SENT);
    }

    saveStringArray(QUOTE_SEEN_KEY, seen);
  }

  function chooseOfflineQuote() {
    let seen = loadStringArray(OFFLINE_SEEN_KEY);
    let available = OFFLINE_QUOTES.filter(quote => !seen.includes(quote.id));

    if (!available.length) {
      seen = [];
      available = [...OFFLINE_QUOTES];
    }

    const quote = available[Math.floor(Math.random() * available.length)];
    seen.push(quote.id);
    saveStringArray(OFFLINE_SEEN_KEY, seen);

    return {
      ...quote,
      delivery: "offline-fallback"
    };
  }

  async function fetchOnlineQuote() {
    if (!QUOTE_ENDPOINT) {
      throw new Error("Chưa có SUPABASE_URL.");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      QUOTE_REQUEST_TIMEOUT_MS
    );

    const seenIds = loadStringArray(QUOTE_SEEN_KEY)
      .slice(-MAX_SEEN_IDS_SENT);

    try {
      const response = await fetch(QUOTE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          seen_ids: seenIds
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Quote Edge Function HTTP ${response.status}`);
      }

      const payload = await response.json();
      const quote = payload?.quote;

      if (
        !quote ||
        typeof quote.id !== "string" ||
        typeof quote.text !== "string" ||
        !quote.text.trim() ||
        typeof quote.source_url !== "string" ||
        !quote.source_url.startsWith("http")
      ) {
        throw new Error("Edge Function trả dữ liệu danh ngôn không hợp lệ.");
      }

      rememberQuoteId(quote.id, Boolean(payload.cycle_reset));

      return {
        id: quote.id,
        text: quote.text.trim(),
        author: String(quote.author || "Khuyết danh").trim(),
        source_name: String(quote.source_name || SOURCE_NAME).trim(),
        source_url: quote.source_url,
        delivery: String(payload.cache_status || "edge")
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function getQuote() {
    try {
      return await fetchOnlineQuote();
    } catch (error) {
      console.warn("Minty quote: dùng fallback offline.", error);
      return chooseOfflineQuote();
    }
  }

  function setHidden(hidden) {
    pet.hidden = hidden;
    restoreButton.hidden = !hidden;

    try {
      localStorage.setItem(PET_HIDDEN_KEY, hidden ? "1" : "0");
    } catch {
      // localStorage có thể bị chặn.
    }
  }

  function clearSpeechClasses() {
    speech.classList.remove("is-quote", "is-loading");
  }

  function showSpeech(message, duration = 1500) {
    clearSpeechClasses();
    speech.textContent = message;
    speech.classList.add("is-visible");

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      speech.classList.remove("is-visible");
    }, duration);
  }

  function showQuoteLoading() {
    speech.replaceChildren();

    const loading = document.createElement("span");
    loading.className = "pet-quote-loading";
    loading.textContent = "Minty đang tìm một câu hay…";

    speech.append(loading);
    speech.classList.add("is-quote", "is-loading", "is-visible");
  }

  function renderQuote(quote) {
    speech.classList.remove("is-loading");
    speech.classList.add("is-quote", "is-visible");
    speech.replaceChildren();

    const text = document.createElement("span");
    text.className = "pet-quote-text";
    text.textContent = `“${quote.text}”`;

    const author = document.createElement("span");
    author.className = "pet-quote-author";
    author.textContent = `— ${quote.author || "Khuyết danh"}`;

    const source = document.createElement("a");
    source.className = "pet-quote-source";
    source.href = quote.source_url || SOURCE_CATEGORY_URL;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = `Nguồn: ${quote.source_name || SOURCE_NAME}`;
    source.title = "Mở nguồn của danh ngôn";

    speech.append(text, author, source);

    pet.classList.remove("is-happy");
    void pet.offsetWidth;
    pet.classList.add("is-happy");

    window.clearTimeout(helloTimer);
    helloTimer = window.setTimeout(() => {
      pet.classList.remove("is-happy");
    }, 560);

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      speech.classList.remove("is-visible", "is-quote", "is-loading");
    }, QUOTE_VISIBLE_MS);
  }

  async function showQuote({ reschedule = true } = {}) {
    if (pet.hidden || document.hidden || quoteLoading) {
      if (reschedule) scheduleNextQuote();
      return;
    }

    quoteLoading = true;
    showQuoteLoading();

    try {
      const quote = await getQuote();
      renderQuote(quote);
    } finally {
      quoteLoading = false;

      if (reschedule) {
        scheduleNextQuote();
      }
    }
  }

  function scheduleFirstQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      () => showQuote({ reschedule: true }),
      QUOTE_INTERVAL_MS
    );
  }

  function scheduleNextQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      () => showQuote({ reschedule: true }),
      QUOTE_INTERVAL_MS
    );
  }

  function renderPointerReaction() {
    rafId = 0;

    if (reduceMotion.matches || !finePointer.matches || pet.hidden) {
      pet.style.setProperty("--pet-eye-x", "0px");
      pet.style.setProperty("--pet-eye-y", "0px");
      pet.style.setProperty("--pet-head-rotate", "0deg");
      pet.style.setProperty("--pet-body-x", "0px");
      pet.style.setProperty("--pet-tail-rotate", "0deg");
      return;
    }

    const rect = character.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.42;

    const dx = pointerX - centerX;
    const dy = pointerY - centerY;
    const distance = Math.max(1, Math.hypot(dx, dy));

    const nx = clamp(dx / distance, -1, 1);
    const ny = clamp(dy / distance, -1, 1);

    const eyeX = clamp(nx * 4.2, -4.2, 4.2);
    const eyeY = clamp(ny * 3.0, -3.0, 3.0);
    const headRotate = clamp(dx / 110, -7, 7);
    const bodyX = clamp(dx / 350, -3.5, 3.5);
    const tailRotate = clamp(-dx / 90, -11, 11);

    pet.style.setProperty("--pet-eye-x", `${eyeX.toFixed(2)}px`);
    pet.style.setProperty("--pet-eye-y", `${eyeY.toFixed(2)}px`);
    pet.style.setProperty("--pet-head-rotate", `${headRotate.toFixed(2)}deg`);
    pet.style.setProperty("--pet-body-x", `${bodyX.toFixed(2)}px`);
    pet.style.setProperty("--pet-tail-rotate", `${tailRotate.toFixed(2)}deg`);
  }

  function schedulePointerRender() {
    if (!rafId) {
      rafId = window.requestAnimationFrame(renderPointerReaction);
    }
  }

  function handlePointerMove(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    schedulePointerRender();
  }

  function handleScroll() {
    if (reduceMotion.matches || pet.hidden) return;

    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    lastScrollY = currentY;
    const shift = clamp(delta * 0.20, -11, 11);

    pet.style.setProperty("--pet-scroll-y", `${shift.toFixed(1)}px`);
    pet.classList.add("is-scrolling");

    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      pet.style.setProperty("--pet-scroll-y", "0px");
      pet.classList.remove("is-scrolling");
    }, 150);
  }

  character.addEventListener("click", async () => {
    window.clearTimeout(quoteTimer);
    await showQuote({ reschedule: false });
    scheduleNextQuote();
  });

  hideButton.addEventListener("click", event => {
    event.stopPropagation();
    setHidden(true);
    window.clearTimeout(quoteTimer);
  });

  restoreButton.addEventListener("click", () => {
    setHidden(false);
    showSpeech("Mình quay lại rồi! 🐾", 1500);
    schedulePointerRender();
    scheduleFirstQuote();
  });

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", schedulePointerRender, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(quoteTimer);
      return;
    }

    if (!pet.hidden) {
      scheduleFirstQuote();
    }
  });

  reduceMotion.addEventListener?.("change", schedulePointerRender);
  finePointer.addEventListener?.("change", schedulePointerRender);

  let initiallyHidden = false;

  try {
    initiallyHidden = localStorage.getItem(PET_HIDDEN_KEY) === "1";
  } catch {
    initiallyHidden = false;
  }

  setHidden(initiallyHidden);

  if (!initiallyHidden) {
    window.setTimeout(() => {
      showSpeech("Chào bạn! Mình là Minty 🌿", 1800);
    }, 850);

    scheduleFirstQuote();
  }
})();
