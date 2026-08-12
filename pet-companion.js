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
  /*
   * Bộ câu ngắn dùng cục bộ để website không phải scrape nguồn bên ngoài.
   * Nội dung được diễn ý ngắn gọn từ các mục “Học hỏi” trên Từ điển danh ngôn,
   * tránh sao chép hàng loạt nguyên văn.
   */
  const STUDY_QUOTES = [
    {
      text: "Học từ hôm qua, sống trọn hôm nay và luôn tiếp tục đặt câu hỏi.",
      author: "Albert Einstein"
    },
    {
      text: "Hãy dành thời gian học khi người khác đang nghỉ và chuẩn bị khi người khác đang chơi.",
      author: "William Arthur Ward"
    },
    {
      text: "Tri thức là một khoản đầu tư có thể mang lại giá trị lâu dài.",
      author: "Benjamin Franklin"
    },
    {
      text: "Trong việc học, tự học phải là phần cốt lõi.",
      author: "Hồ Chí Minh"
    },
    {
      text: "Hãy sống hết mình mỗi ngày và học như thể hành trình ấy không có điểm cuối.",
      author: "Mahatma Gandhi"
    },
    {
      text: "Biết học từ sai lầm của người khác giúp ta tránh phải tự trải qua mọi sai lầm.",
      author: "Groucho Marx"
    },
    {
      text: "Người thầy chân chính cũng luôn là một người học.",
      author: "Elbert Hubbard"
    },
    {
      text: "Học hỏi là hành trình mà trí óc không nên ngừng nghỉ.",
      author: "Leonardo da Vinci"
    },
    {
      text: "Mỗi bước học đọc giống như thắp thêm một tia lửa cho trí tuệ.",
      author: "Victor Hugo"
    },
    {
      text: "Tri thức đến từ học hỏi, còn kỹ năng lớn lên qua rèn luyện.",
      author: "Thomas Szasz"
    },
    {
      text: "Không biết chưa đáng ngại bằng việc không muốn học thêm.",
      author: "Benjamin Franklin"
    },
    {
      text: "Học chậm vẫn là học; điều quan trọng là đừng ngừng tiến về phía trước.",
      author: "James Agee"
    }
  ];

  const QUOTE_SOURCE_URL =
    "https://www.tudiendanhngon.vn/danhngon/ds/strcats/180";

  // Minty hiện một câu mỗi 60 giây khi tab đang hoạt động.
  const QUOTE_INTERVAL_MS = 60 * 1000;
  const QUOTE_VISIBLE_MS = 12 * 1000;

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

  function showQuote({ reschedule = true } = {}) {
    if (
      pet.hidden ||
      document.hidden ||
      !STUDY_QUOTES.length
    ) {
      if (reschedule) scheduleNextQuote();
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

    const source = document.createElement("a");
    source.className = "pet-quote-source";
    source.href = QUOTE_SOURCE_URL;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "Nguồn tham khảo";

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
      speech.classList.remove("is-visible", "is-quote");
    }, QUOTE_VISIBLE_MS);

    if (reschedule) {
      scheduleNextQuote();
    }
  }

  function scheduleFirstQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(showQuote, QUOTE_INTERVAL_MS);
  }

  function scheduleNextQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(showQuote, QUOTE_INTERVAL_MS);
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

  character.addEventListener("click", () => {
    window.clearTimeout(quoteTimer);
    showQuote({ reschedule: false });
    scheduleNextQuote();
  });

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
      scheduleFirstQuote();
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
