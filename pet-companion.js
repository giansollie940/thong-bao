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
  const QUOTE_LIBRARY_KEY = "weeklyBoardQuoteLibraryV1";
  const QUOTE_SEEN_KEY = "weeklyBoardQuoteSeenV4";
  const QUOTE_LIBRARY_UPDATED_KEY = "weeklyBoardQuoteLibraryUpdatedAtV1";

  const QUOTE_INTERVAL_MS = 60 * 1000;
  const QUOTE_VISIBLE_MS = 12 * 1000;
  const LIBRARY_SYNC_INTERVAL_MS = 30 * 60 * 1000;
  const LIBRARY_REQUEST_TIMEOUT_MS = 9000;
  const MAX_SEEN_IDS = 1000;

  const SOURCE_NAME = "Từ điển danh ngôn";
  const SOURCE_CATEGORY_URL =
    "https://www.tudiendanhngon.vn/danhngon/ds/strcats/180";

  /*
   * Thư viện khởi tạo để Minty luôn có câu ngay cả khi chưa đồng bộ online.
   * Sau đó Edge Function sẽ cập nhật toàn bộ thư viện vào localStorage.
   */
  const BUILTIN_LIBRARY = [
    {
      id: "builtin:01",
      text: "Trong cách học, tự học phải là phần cốt lõi.",
      author: "Hồ Chí Minh",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "builtin:02",
      text: "Không biết chưa đáng ngại bằng việc không muốn học thêm.",
      author: "Benjamin Franklin",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "builtin:03",
      text: "Học hỏi là hành trình mà trí óc không nên ngừng nghỉ.",
      author: "Leonardo da Vinci",
      source_name: SOURCE_NAME,
      source_url: SOURCE_CATEGORY_URL
    },
    {
      id: "builtin:04",
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
  let librarySyncTimer = 0;
  let librarySyncPromise = null;
  let rafId = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function safeParseJson(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeQuote(raw) {
    if (
      !raw ||
      typeof raw.id !== "string" ||
      typeof raw.text !== "string" ||
      !raw.text.trim()
    ) {
      return null;
    }

    return {
      id: raw.id,
      text: raw.text.trim(),
      author: String(raw.author || "Khuyết danh").trim(),
      source_name: String(raw.source_name || SOURCE_NAME).trim(),
      source_url:
        typeof raw.source_url === "string" &&
        /^https?:\/\//i.test(raw.source_url)
          ? raw.source_url
          : SOURCE_CATEGORY_URL
    };
  }

  function dedupeLibrary(quotes) {
    const map = new Map();

    for (const raw of quotes || []) {
      const quote = normalizeQuote(raw);
      if (!quote) continue;

      if (!map.has(quote.id)) {
        map.set(quote.id, quote);
      }
    }

    return [...map.values()];
  }

  function loadQuoteLibrary() {
    try {
      const stored = safeParseJson(
        localStorage.getItem(QUOTE_LIBRARY_KEY) || "[]",
        []
      );

      const normalized = dedupeLibrary(stored);

      if (normalized.length) {
        return normalized;
      }
    } catch {}

    return [...BUILTIN_LIBRARY];
  }

  function saveQuoteLibrary(quotes) {
    const normalized = dedupeLibrary(quotes);

    if (!normalized.length) return;

    try {
      localStorage.setItem(
        QUOTE_LIBRARY_KEY,
        JSON.stringify(normalized)
      );

      localStorage.setItem(
        QUOTE_LIBRARY_UPDATED_KEY,
        new Date().toISOString()
      );
    } catch {
      // Nếu storage đầy/bị chặn, app vẫn dùng thư viện built-in.
    }
  }

  function loadSeenIds() {
    try {
      const stored = safeParseJson(
        localStorage.getItem(QUOTE_SEEN_KEY) || "[]",
        []
      );

      return Array.isArray(stored)
        ? stored.filter(value => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  }

  function saveSeenIds(ids) {
    try {
      localStorage.setItem(
        QUOTE_SEEN_KEY,
        JSON.stringify(ids.slice(-MAX_SEEN_IDS))
      );
    } catch {}
  }

  function chooseQuoteFromLocalLibrary() {
    const library = loadQuoteLibrary();
    let seen = loadSeenIds();
    const seenSet = new Set(seen);

    let available = library.filter(
      quote => !seenSet.has(quote.id)
    );

    // Đã xem hết kho: bắt đầu vòng mới.
    if (!available.length) {
      seen = [];
      available = [...library];
    }

    const quote =
      available[Math.floor(Math.random() * available.length)] ||
      BUILTIN_LIBRARY[0];

    if (quote?.id) {
      seen.push(quote.id);
      saveSeenIds(seen);
    }

    return quote;
  }

  async function fetchQuoteLibraryFromEdge() {
    if (!QUOTE_ENDPOINT) {
      throw new Error("Chưa có SUPABASE_URL.");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      LIBRARY_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(QUOTE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "library"
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Quote library HTTP ${response.status}`);
      }

      const payload = await response.json();
      const library = dedupeLibrary(payload?.quotes || []);

      if (!library.length) {
        throw new Error("Edge Function chưa trả thư viện danh ngôn.");
      }

      return {
        library,
        cache_status: String(payload.cache_status || "edge"),
        source_name: String(payload.source_name || SOURCE_NAME)
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function syncQuoteLibraryInBackground() {
    if (
      librarySyncPromise ||
      document.hidden ||
      pet.hidden
    ) {
      return librarySyncPromise;
    }

    librarySyncPromise = (async () => {
      try {
        const result = await fetchQuoteLibraryFromEdge();
        saveQuoteLibrary(result.library);

        console.info(
          `Minty: đã cập nhật ${result.library.length} danh ngôn (${result.cache_status}).`
        );

        return result.library;
      } catch (error) {
        console.warn(
          "Minty: chưa cập nhật được thư viện online, tiếp tục dùng local.",
          error
        );

        return loadQuoteLibrary();
      } finally {
        librarySyncPromise = null;
      }
    })();

    return librarySyncPromise;
  }

  function scheduleLibrarySync() {
    window.clearTimeout(librarySyncTimer);

    librarySyncTimer = window.setTimeout(async () => {
      await syncQuoteLibraryInBackground();
      scheduleLibrarySync();
    }, LIBRARY_SYNC_INTERVAL_MS);
  }

  function setHidden(hidden) {
    pet.hidden = hidden;
    restoreButton.hidden = !hidden;

    try {
      localStorage.setItem(PET_HIDDEN_KEY, hidden ? "1" : "0");
    } catch {}
  }

  function clearSpeechClasses() {
    speech.classList.remove("is-quote", "is-loading");
  }

  function closeSpeechBubble() {
    window.clearTimeout(speechTimer);
    speech.classList.remove("is-visible", "is-quote", "is-loading");
  }

  function createSpeechCloseButton() {
    const closeButton = document.createElement("button");
    closeButton.className = "pet-speech-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Đóng bong bóng lời nói");
    closeButton.title = "Đóng lời nói";
    closeButton.textContent = "×";

    closeButton.addEventListener("click", event => {
      event.stopPropagation();
      closeSpeechBubble();
    });

    return closeButton;
  }

  function showSpeech(message, duration = 1500) {
    clearSpeechClasses();
    speech.replaceChildren();

    const closeButton = createSpeechCloseButton();
    const text = document.createElement("span");
    text.className = "pet-speech-simple-text";
    text.textContent = message;

    speech.append(closeButton, text);
    speech.classList.add("is-visible");

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      speech.classList.remove("is-visible");
    }, duration);
  }

  function renderQuote(quote) {
    speech.classList.remove("is-loading");
    speech.classList.add("is-quote", "is-visible");
    speech.replaceChildren();

    const closeButton = createSpeechCloseButton();

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

    speech.append(closeButton, text, author, source);

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

  function showLocalQuote({ reschedule = true } = {}) {
    if (pet.hidden || document.hidden) {
      if (reschedule) scheduleNextQuote();
      return;
    }

    /*
     * QUAN TRỌNG:
     * Không fetch ở đây.
     * Click luôn lấy localStorage => gần như tức thời.
     */
    const quote = chooseQuoteFromLocalLibrary();
    renderQuote(quote);

    if (reschedule) {
      scheduleNextQuote();
    }
  }

  function scheduleFirstQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      () => showLocalQuote({ reschedule: true }),
      QUOTE_INTERVAL_MS
    );
  }

  function scheduleNextQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      () => showLocalQuote({ reschedule: true }),
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

    pet.style.setProperty(
      "--pet-eye-x",
      `${clamp(nx * 4.2, -4.2, 4.2).toFixed(2)}px`
    );
    pet.style.setProperty(
      "--pet-eye-y",
      `${clamp(ny * 3.0, -3.0, 3.0).toFixed(2)}px`
    );
    pet.style.setProperty(
      "--pet-head-rotate",
      `${clamp(dx / 110, -7, 7).toFixed(2)}deg`
    );
    pet.style.setProperty(
      "--pet-body-x",
      `${clamp(dx / 350, -3.5, 3.5).toFixed(2)}px`
    );
    pet.style.setProperty(
      "--pet-tail-rotate",
      `${clamp(-dx / 90, -11, 11).toFixed(2)}deg`
    );
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

    pet.style.setProperty(
      "--pet-scroll-y",
      `${shift.toFixed(1)}px`
    );

    pet.classList.add("is-scrolling");

    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      pet.style.setProperty("--pet-scroll-y", "0px");
      pet.classList.remove("is-scrolling");
    }, 150);
  }

  character.addEventListener("click", () => {
    window.clearTimeout(quoteTimer);

    // Tức thời: tuyệt đối không gọi mạng trong click.
    showLocalQuote({ reschedule: false });

    scheduleNextQuote();
  });

  hideButton.addEventListener("click", event => {
    event.stopPropagation();
    setHidden(true);
    window.clearTimeout(quoteTimer);
    window.clearTimeout(librarySyncTimer);
  });

  restoreButton.addEventListener("click", () => {
    setHidden(false);
    showSpeech("Mình quay lại rồi! 🐾", 1500);
    schedulePointerRender();

    // Sync chạy nền, không chặn UI.
    syncQuoteLibraryInBackground();
    scheduleLibrarySync();
    scheduleFirstQuote();
  });

  window.addEventListener(
    "pointermove",
    handlePointerMove,
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    handleScroll,
    { passive: true }
  );

  window.addEventListener(
    "resize",
    schedulePointerRender,
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(quoteTimer);
      window.clearTimeout(librarySyncTimer);
      return;
    }

    if (!pet.hidden) {
      syncQuoteLibraryInBackground();
      scheduleLibrarySync();
      scheduleFirstQuote();
    }
  });

  reduceMotion.addEventListener?.(
    "change",
    schedulePointerRender
  );

  finePointer.addEventListener?.(
    "change",
    schedulePointerRender
  );

  let initiallyHidden = false;

  try {
    initiallyHidden =
      localStorage.getItem(PET_HIDDEN_KEY) === "1";
  } catch {}

  setHidden(initiallyHidden);

  if (!initiallyHidden) {
    window.setTimeout(() => {
      showSpeech("Chào bạn! Mình là Minty 🌿", 1800);
    }, 850);

    /*
     * Sau khi trang mở:
     * 1. Minty đã có thư viện local ngay.
     * 2. Đồng bộ thư viện mới ở nền.
     */
    window.setTimeout(() => {
      syncQuoteLibraryInBackground();
    }, 500);

    scheduleLibrarySync();
    scheduleFirstQuote();
  }
})();
