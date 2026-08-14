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
  const quoteEndpoint = supabaseUrl
    ? `${supabaseUrl}/functions/v1/learning-quote`
    : "";

  const STORAGE = {
    petHidden: "weeklyBoardPetHidden",
    quoteLibrary: "weeklyBoardQuoteLibraryV1",
    quoteSeen: "weeklyBoardQuoteSeenV4",
    libraryUpdatedAt: "weeklyBoardQuoteLibraryUpdatedAtV1"
  };

  const QUOTE_INTERVAL_MS = 60_000;
  const QUOTE_VISIBLE_MS = 12_000;
  const LIBRARY_SYNC_INTERVAL_MS = 30 * 60_000;
  const LIBRARY_REQUEST_TIMEOUT_MS = 9_000;
  const MAX_SEEN_IDS = 1_000;

  const SOURCE_NAME = "Từ điển danh ngôn";
  const SOURCE_CATEGORY_URL =
    "https://www.tudiendanhngon.vn/danhngon/ds/strcats/180";

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

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  let lastScrollY = window.scrollY;
  let scrollTimer = 0;
  let speechTimer = 0;
  let quoteTimer = 0;
  let syncTimer = 0;
  let syncPromise = null;
  let animationFrame = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value)
      );
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
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

    const sourceUrl =
      typeof raw.source_url === "string" &&
      /^https?:\/\//i.test(raw.source_url)
        ? raw.source_url
        : SOURCE_CATEGORY_URL;

    return {
      id: raw.id,
      text: raw.text.trim(),
      author: String(raw.author || "Khuyết danh").trim(),
      source_name: String(raw.source_name || SOURCE_NAME).trim(),
      source_url: sourceUrl
    };
  }

  function normalizeLibrary(quotes) {
    const unique = new Map();

    for (const raw of Array.isArray(quotes) ? quotes : []) {
      const quote = normalizeQuote(raw);
      if (quote && !unique.has(quote.id)) {
        unique.set(quote.id, quote);
      }
    }

    return [...unique.values()];
  }

  function loadQuoteLibrary() {
    const stored = normalizeLibrary(
      readJson(STORAGE.quoteLibrary, [])
    );

    return stored.length ? stored : [...BUILTIN_LIBRARY];
  }

  function saveQuoteLibrary(quotes) {
    const library = normalizeLibrary(quotes);
    if (!library.length) return;

    if (writeStorage(STORAGE.quoteLibrary, library)) {
      writeStorage(STORAGE.libraryUpdatedAt, new Date().toISOString());
    }
  }

  function loadSeenIds() {
    const value = readJson(STORAGE.quoteSeen, []);
    return Array.isArray(value)
      ? value.filter(item => typeof item === "string")
      : [];
  }

  function chooseLocalQuote() {
    const library = loadQuoteLibrary();
    let seen = loadSeenIds();
    const seenSet = new Set(seen);

    let candidates = library.filter(quote => !seenSet.has(quote.id));

    if (!candidates.length) {
      seen = [];
      candidates = [...library];
    }

    const quote =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      BUILTIN_LIBRARY[0];

    if (quote?.id) {
      seen.push(quote.id);
      writeStorage(STORAGE.quoteSeen, seen.slice(-MAX_SEEN_IDS));
    }

    return quote;
  }

  function libraryNeedsSync() {
    const lastUpdated = localStorage.getItem(STORAGE.libraryUpdatedAt);
    if (!lastUpdated) return true;

    const timestamp = Date.parse(lastUpdated);
    return (
      !Number.isFinite(timestamp) ||
      Date.now() - timestamp >= LIBRARY_SYNC_INTERVAL_MS
    );
  }

  async function fetchOnlineLibrary() {
    if (!quoteEndpoint) {
      throw new Error("Chưa cấu hình SUPABASE_URL.");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      LIBRARY_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(quoteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "library" }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Quote library HTTP ${response.status}`);
      }

      const payload = await response.json();
      const library = normalizeLibrary(payload?.quotes);

      if (!library.length) {
        throw new Error("Edge Function chưa trả thư viện danh ngôn.");
      }

      return library;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function syncLibrary({ force = false } = {}) {
    if (
      syncPromise ||
      document.hidden ||
      pet.hidden ||
      (!force && !libraryNeedsSync())
    ) {
      return syncPromise;
    }

    syncPromise = (async () => {
      try {
        const library = await fetchOnlineLibrary();
        saveQuoteLibrary(library);
        console.info(`Minty: đã đồng bộ ${library.length} danh ngôn.`);
        return library;
      } catch (error) {
        console.warn(
          "Minty: chưa đồng bộ được thư viện online, tiếp tục dùng local.",
          error
        );
        return loadQuoteLibrary();
      } finally {
        syncPromise = null;
      }
    })();

    return syncPromise;
  }

  function scheduleLibrarySync() {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(async () => {
      await syncLibrary({ force: true });
      scheduleLibrarySync();
    }, LIBRARY_SYNC_INTERVAL_MS);
  }

  function setPetHidden(hidden) {
    pet.hidden = hidden;
    restoreButton.hidden = !hidden;
    writeStorage(STORAGE.petHidden, hidden ? "1" : "0");

    if (hidden) {
      window.clearTimeout(quoteTimer);
      window.clearTimeout(syncTimer);
      closeSpeechBubble();
    }
  }

  function closeSpeechBubble() {
    window.clearTimeout(speechTimer);
    speech.classList.remove("is-visible", "is-quote");
  }

  function createSpeechCloseButton() {
    const button = document.createElement("button");
    button.className = "pet-speech-star-close";
    button.type = "button";
    button.setAttribute("aria-label", "Đóng bong bóng lời nói");
    button.title = "Đóng lời nói";
    button.textContent = "✦";

    const stopEvent = event => {
      event.preventDefault();
      event.stopPropagation();
    };

    button.addEventListener("pointerdown", stopEvent);
    button.addEventListener("mousedown", stopEvent);
    button.addEventListener("touchstart", stopEvent, { passive: false });
    button.addEventListener("click", event => {
      stopEvent(event);
      closeSpeechBubble();
    });

    return button;
  }

  function showSpeech(message, duration = 1_800) {
    speech.classList.remove("is-quote");
    speech.replaceChildren();

    const text = document.createElement("span");
    text.className = "pet-speech-simple-text";
    text.textContent = message;

    speech.append(createSpeechCloseButton(), text);
    speech.classList.add("is-visible");

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(closeSpeechBubble, duration);
  }

  function showQuote() {
    if (pet.hidden || document.hidden) return;

    const quote = chooseLocalQuote();

    speech.classList.add("is-quote");
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

    speech.append(createSpeechCloseButton(), text, author, source);
    speech.classList.add("is-visible");

    pet.classList.remove("is-happy");
    void pet.offsetWidth;
    pet.classList.add("is-happy");

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(closeSpeechBubble, QUOTE_VISIBLE_MS);
  }

  function scheduleNextQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(() => {
      showQuote();
      scheduleNextQuote();
    }, QUOTE_INTERVAL_MS);
  }

  function renderPointerReaction() {
    animationFrame = 0;

    if (reducedMotion.matches || !finePointer.matches || pet.hidden) {
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
      `${clamp(ny * 3, -3, 3).toFixed(2)}px`
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
    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(renderPointerReaction);
    }
  }

  function handleScroll() {
    if (reducedMotion.matches || pet.hidden) return;

    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    lastScrollY = currentY;

    pet.style.setProperty(
      "--pet-scroll-y",
      `${clamp(delta * 0.2, -11, 11).toFixed(1)}px`
    );
    pet.classList.add("is-scrolling");

    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      pet.style.setProperty("--pet-scroll-y", "0px");
      pet.classList.remove("is-scrolling");
    }, 150);
  }

  character.addEventListener("click", () => {
    showQuote();
    scheduleNextQuote();
  });

  hideButton.addEventListener("click", event => {
    event.stopPropagation();
    setPetHidden(true);
  });

  restoreButton.addEventListener("click", () => {
    setPetHidden(false);
    showSpeech("Mình quay lại rồi! 🐾");
    schedulePointerRender();
    syncLibrary();
    scheduleLibrarySync();
    scheduleNextQuote();
  });

  window.addEventListener(
    "pointermove",
    event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedulePointerRender();
    },
    { passive: true }
  );

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", schedulePointerRender, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.clearTimeout(quoteTimer);
      window.clearTimeout(syncTimer);
      return;
    }

    if (!pet.hidden) {
      syncLibrary();
      scheduleLibrarySync();
      scheduleNextQuote();
    }
  });

  reducedMotion.addEventListener?.("change", schedulePointerRender);
  finePointer.addEventListener?.("change", schedulePointerRender);

  const initiallyHidden =
    localStorage.getItem(STORAGE.petHidden) === "1";

  setPetHidden(initiallyHidden);

  if (!initiallyHidden) {
    window.setTimeout(
      () => showSpeech("Chào bạn! Mình là Minty 🌿"),
      850
    );

    window.setTimeout(() => syncLibrary(), 500);
    scheduleLibrarySync();
    scheduleNextQuote();
  }
})();
