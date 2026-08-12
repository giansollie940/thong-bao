(() => {
  "use strict";

  const pet = document.getElementById("pet-companion");
  const character = document.getElementById("pet-character");
  const hideButton = document.getElementById("pet-hide");
  const restoreButton = document.getElementById("pet-restore");
  const speech = document.getElementById("pet-speech");

  if (!pet || !character || !hideButton || !restoreButton || !speech) return;

  const STORAGE_KEY = "weeklyBoardPetHidden";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  /*
   * Danh ngôn đã được chọn từ các nguồn đáng tin cậy.
   * Nội dung tiếng Việt là bản dịch ngắn gọn để phù hợp giao diện.
   */
  const STUDY_QUOTES = [
    {
      text: "Giáo dục là vũ khí mạnh mẽ nhất mà bạn có thể dùng để thay đổi thế giới.",
      author: "Nelson Mandela"
    },
    {
      text: "Một đứa trẻ, một người thầy, một cuốn sách và một cây bút có thể thay đổi thế giới.",
      author: "Malala Yousafzai"
    },
    {
      text: "Học mà không suy nghĩ thì công sức uổng phí; suy nghĩ mà không học thì nguy hiểm.",
      author: "Khổng Tử"
    },
    {
      text: "Khi ta dạy người khác, chính ta cũng học.",
      author: "Seneca"
    },
    {
      text: "Đầu tư vào tri thức luôn mang lại lợi tức tốt nhất.",
      author: "Benjamin Franklin"
    }
  ];

  // Lần đầu: 2–4 phút. Các lần sau: 4–7 phút.
  const FIRST_QUOTE_MIN = 2 * 60 * 1000;
  const FIRST_QUOTE_MAX = 4 * 60 * 1000;
  const NEXT_QUOTE_MIN = 4 * 60 * 1000;
  const NEXT_QUOTE_MAX = 7 * 60 * 1000;
  const QUOTE_VISIBLE_MS = 11 * 1000;

  let lastScrollY = window.scrollY;
  let scrollTimer = 0;
  let speechTimer = 0;
  let helloTimer = 0;
  let quoteTimer = 0;
  let rafId = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;

  let quoteBag = [];
  let lastQuoteIndex = -1;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function refillQuoteBag() {
    quoteBag = shuffle(STUDY_QUOTES.map((_, index) => index));

    // Tránh lặp lại ngay câu vừa xuất hiện ở chu kỳ trước.
    if (
      quoteBag.length > 1 &&
      quoteBag[0] === lastQuoteIndex
    ) {
      [quoteBag[0], quoteBag[1]] = [quoteBag[1], quoteBag[0]];
    }
  }

  function setHidden(hidden) {
    pet.hidden = hidden;
    restoreButton.hidden = !hidden;

    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      // localStorage có thể bị chặn; app vẫn hoạt động bình thường.
    }
  }

  function clearSpeechClasses() {
    speech.classList.remove("is-quote");
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

  function showQuote() {
    if (
      pet.hidden ||
      document.hidden ||
      !STUDY_QUOTES.length
    ) {
      scheduleNextQuote();
      return;
    }

    if (!quoteBag.length) {
      refillQuoteBag();
    }

    const quoteIndex = quoteBag.shift();
    const quote = STUDY_QUOTES[quoteIndex];
    lastQuoteIndex = quoteIndex;

    speech.classList.add("is-quote", "is-visible");
    speech.replaceChildren();

    const text = document.createElement("span");
    text.className = "pet-quote-text";
    text.textContent = `“${quote.text}”`;

    const author = document.createElement("span");
    author.className = "pet-quote-author";
    author.textContent = `— ${quote.author}`;

    speech.append(text, author);

    pet.classList.remove("is-happy");
    void pet.offsetWidth;
    pet.classList.add("is-happy");

    window.clearTimeout(helloTimer);
    helloTimer = window.setTimeout(() => {
      pet.classList.remove("is-happy");
    }, 560);

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      speech.classList.remove("is-visible", "is-quote");
    }, QUOTE_VISIBLE_MS);

    scheduleNextQuote();
  }

  function scheduleFirstQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      showQuote,
      randomBetween(FIRST_QUOTE_MIN, FIRST_QUOTE_MAX)
    );
  }

  function scheduleNextQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(
      showQuote,
      randomBetween(NEXT_QUOTE_MIN, NEXT_QUOTE_MAX)
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

  function sayHello() {
    const messages = [
      "Minty chào bạn! 🌿",
      "Có thông báo mới không nhỉ? 👀",
      "Chúc bạn một tuần thật vui! ✨",
      "Mình đang trông bảng thông báo đây! 🐾"
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    showSpeech(message, 1650);

    pet.classList.remove("is-happy");
    void pet.offsetWidth;
    pet.classList.add("is-happy");

    window.clearTimeout(helloTimer);
    helloTimer = window.setTimeout(() => {
      pet.classList.remove("is-happy");
    }, 560);
  }

  character.addEventListener("click", sayHello);

  hideButton.addEventListener("click", (event) => {
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
      scheduleNextQuote();
    }
  });

  reduceMotion.addEventListener?.("change", schedulePointerRender);
  finePointer.addEventListener?.("change", schedulePointerRender);

  let initiallyHidden = false;

  try {
    initiallyHidden = localStorage.getItem(STORAGE_KEY) === "1";
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
