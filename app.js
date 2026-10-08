/* ==========================================================================
   Poof — a tiny stress-release ritual
   Plain JS, no dependencies.
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Content
     ------------------------------------------------------------------------ */

  const AFFIRMATIONS = [
    "You are allowed to take up space and take your time.",
    "You’ve survived every hard day so far. That’s a perfect record.",
    "Rest is not a reward. It’s something you deserve right now.",
    "You don’t have to have it all figured out today.",
    "Your worth isn’t measured by how much you get done.",
    "This feeling is a visitor. It won’t stay forever.",
    "You are doing better than you think you are.",
    "It’s okay to go slowly. Slow is still moving.",
    "You are worthy of the same kindness you give to others.",
    "One breath at a time is more than enough.",
    "You are not behind. You are exactly where you are, and that’s okay.",
    "Small steps still carry you somewhere new.",
    "You’ve handled hard things before, and you’ll handle this too.",
    "Your feelings are valid, even the messy ones.",
    "Today, being gentle with yourself counts as progress.",
    "You are allowed to set things down for a while.",
    "There is softness waiting for you on the other side of this.",
    "You don’t need to earn a break. You can just take one.",
    "The world is a little brighter because you’re in it.",
    "Mistakes are proof that you’re trying.",
    "You can do hard things, and you can do them softly.",
    "Breathe in courage. Breathe out what you can’t control.",
    "It’s okay to ask for help. Strong people do it all the time.",
    "You are more than the thoughts that are worrying you.",
    "Peace doesn’t have to be loud. It can start very small.",
    "Your best today is enough, even if it looks different from yesterday.",
    "You’re allowed to change your mind, your pace, and your plans.",
    "Somewhere, a future you is grateful you didn’t give up.",
    "The stars took a long time to shine, too.",
    "You are a work in progress and a masterpiece at the same time.",
    "Even the moon has phases. You’re allowed to as well.",
    "You don’t have to carry everything at once.",
    "Your heart has been working hard. Let it rest a moment.",
    "Not every day has to be productive to be meaningful.",
    "You bring something to this world that no one else can.",
    "Let this moment be simple. Nothing else is needed right now.",
    "You are safe to slow down here.",
    "The hard parts are shaping you, not breaking you.",
    "You deserve to feel light again, and you will.",
    "Whatever happens next, you’ll meet it with more strength than you know.",
    "You’re allowed to be proud of yourself for small things.",
    "Your calm is still in there. You’re finding your way back to it.",
    "Being kind to yourself is never a waste of time.",
    "Tomorrow is a fresh page, and so is the next minute.",
    "You are loved in more ways than you can see right now.",
  ];

  const MOODS = [
    {
      id: "peaceful",
      emoji: "😌",
      label: "Peaceful",
      reply: "Look at you, all soft and glowy. Hold onto this calm — you made it yourself, and you can find your way back to it anytime.",
    },
    {
      id: "lighter",
      emoji: "🙂",
      label: "Lighter",
      reply: "A little lighter is a lot. Be proud of that shift — you gave yourself a minute, and it mattered.",
    },
    {
      id: "same",
      emoji: "😐",
      label: "About the same",
      reply: "That’s completely okay. Showing up for yourself still counts, even when the feeling hasn’t moved yet. It might, quietly, later.",
    },
    {
      id: "heavy",
      emoji: "😔",
      label: "Still heavy",
      reply: "Some weights take more than one breath, and that’s not your fault. Be extra gentle with yourself today — you can come back as often as you need.",
    },
    {
      id: "overwhelmed",
      emoji: "😣",
      label: "Overwhelmed",
      reply: "That sounds really hard, and I’m glad you’re being honest about it. You don’t have to carry this alone — reaching out to someone you trust can help.",
      note: "If you ever feel unsafe or in crisis, please contact your local emergency number or a crisis line right away. You deserve support.",
    },
  ];

  const FALLBACK_WORRY = "all the little things I’ve been carrying";

  const BREATH = { inhale: 4000, hold: 4000, exhale: 6000, rounds: 3 };
  const HOLD_MS = 1600;
  const HISTORY_LIMIT = 60;
  const HISTORY_SHOWN = 7;

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  const rand = (min, max) => min + Math.random() * (max - min);

  /** setTimeout as a promise that rejects when the signal aborts. */
  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
      const id = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  }

  /** Local calendar date as YYYY-MM-DD. */
  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function daysBetween(fromKey, toKey) {
    const [y1, m1, d1] = fromKey.split("-").map(Number);
    const [y2, m2, d2] = toKey.split("-").map(Number);
    // Date.UTC avoids DST shifts
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }

  /* ------------------------------------------------------------------------
     Storage (always fails soft — private mode, blocked storage, etc.)
     ------------------------------------------------------------------------ */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(`poof:${key}`);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`poof:${key}`, JSON.stringify(value));
      } catch {
        /* storage unavailable — the ritual still works */
      }
    },
  };

  /* Streak ------------------------------------------------------------------ */

  function readStreak() {
    const s = store.get("streak", null);
    if (!s || typeof s.last !== "string" || typeof s.count !== "number") {
      return { count: 0, best: 0, last: null };
    }
    return { count: s.count, best: s.best || s.count, last: s.last };
  }

  /** The streak as it stands today (0 if a day was missed). */
  function currentStreak() {
    const s = readStreak();
    if (!s.last) return { ...s, count: 0, doneToday: false };
    const gap = daysBetween(s.last, dayKey());
    if (gap === 0) return { ...s, doneToday: true };
    if (gap === 1) return { ...s, doneToday: false };
    return { ...s, count: 0, doneToday: false };
  }

  /** Record a completed ritual for today. Returns the updated streak. */
  function bumpStreak() {
    const s = readStreak();
    const today = dayKey();
    let count;
    if (!s.last) count = 1;
    else {
      const gap = daysBetween(s.last, today);
      if (gap === 0) count = s.count;
      else if (gap === 1) count = s.count + 1;
      else count = 1;
    }
    const next = { count, best: Math.max(count, s.best || 0), last: today };
    store.set("streak", next);
    return next;
  }

  /* Mood history ------------------------------------------------------------- */

  function readHistory() {
    const h = store.get("moods", []);
    return Array.isArray(h) ? h.filter((e) => e && MOODS.some((m) => m.id === e.mood)) : [];
  }

  function addMood(moodId) {
    const history = readHistory();
    history.push({ mood: moodId, at: new Date().toISOString() });
    store.set("moods", history.slice(-HISTORY_LIMIT));
  }

  /* Affirmations ------------------------------------------------------------- */

  function pickAffirmation() {
    const last = store.get("lastAffirmation", -1);
    let i;
    do {
      i = Math.floor(Math.random() * AFFIRMATIONS.length);
    } while (i === last && AFFIRMATIONS.length > 1);
    store.set("lastAffirmation", i);
    return AFFIRMATIONS[i];
  }

  /* ------------------------------------------------------------------------
     Elements & state
     ------------------------------------------------------------------------ */

  const el = {
    screens: $$(".screen"),
    steps: $$(".steps li"),
    stepLabel: $("#step-label"),

    streak: $("#streak"),
    streakText: $("#streak-text"),
    form: $("#worry-form"),
    worry: $("#worry"),
    worryCount: $("#worry-count"),
    skip: $("#skip-btn"),
    history: $("#history"),
    historyList: $("#history-list"),

    orb: $("#orb"),
    orbTimer: $("#orb-timer"),
    cue: $("#cue"),
    breathCount: $("#breath-count"),
    breathDots: $$(".breath-dots li"),
    breatheSkip: $("#breathe-skip"),

    affirmation: $("#affirmation"),
    affirmActions: $("#affirm-actions"),
    affirmNext: $("#affirm-next"),
    affirmAnother: $("#affirm-another"),

    releaseTitle: $("#release-title"),
    worryCard: $("#worry-card"),
    worryText: $("#worry-text"),
    releaseZone: $("#release-zone"),
    holdBtn: $("#hold-btn"),
    released: $("#released"),
    releaseNext: $("#release-next"),

    moods: $("#moods"),
    reply: $("#reply"),
    replyText: $("#reply-text"),
    replyNote: $("#reply-note"),
    replyStreak: $("#reply-streak"),
    again: $("#again-btn"),
  };

  const ORDER = ["welcome", "breathe", "affirm", "release", "checkin"];
  const STEP_NAMES = ["Share", "Breathe", "Affirmation", "Release", "Check in"];

  const state = {
    screen: "welcome",
    worry: "",
    breathing: null, // AbortController for the current breathing run
    affirmTimer: 0,
    released: false,
  };

  /* ------------------------------------------------------------------------
     Screen navigation
     ------------------------------------------------------------------------ */

  function go(name) {
    if (name === state.screen) return;
    const prev = el.screens.find((s) => s.dataset.screen === state.screen);
    const next = el.screens.find((s) => s.dataset.screen === name);

    leave(state.screen);

    prev.classList.add("is-leaving");
    prev.classList.remove("is-active");
    prev.setAttribute("inert", "");
    setTimeout(() => prev.classList.remove("is-leaving"), 800);

    next.removeAttribute("inert");
    next.classList.add("is-active");
    state.screen = name;

    const idx = ORDER.indexOf(name);
    el.steps.forEach((li, i) => {
      li.classList.toggle("is-current", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    el.stepLabel.textContent = `Step ${idx + 1} of ${ORDER.length}: ${STEP_NAMES[idx]}`;

    // Move focus to the new screen's heading for keyboard & screen-reader users
    const heading = next.querySelector("[tabindex='-1']");
    setTimeout(() => heading?.focus({ preventScroll: true }), reducedMotion ? 60 : 260);
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });

    enter(name);
  }

  function enter(name) {
    switch (name) {
      case "welcome": renderWelcome(); break;
      case "breathe": startBreathing(); break;
      case "affirm": showAffirmation(); break;
      case "release": prepareRelease(); break;
      case "checkin": renderMoods(); break;
    }
  }

  function leave(name) {
    if (name === "breathe") stopBreathing();
    if (name === "affirm") clearTimeout(state.affirmTimer);
    if (name === "release") cancelHold();
  }

  /* ------------------------------------------------------------------------
     1. Welcome
     ------------------------------------------------------------------------ */

  function renderWelcome() {
    const s = currentStreak();
    el.streak.classList.toggle("is-hot", s.count > 0);
    if (s.count === 0) {
      el.streakText.textContent = s.best > 0 ? "Start a new streak today" : "Start your streak today";
    } else {
      const days = `${s.count}-day streak`;
      el.streakText.textContent = s.doneToday ? `${days} · done today ✓` : `${days} · keep it glowing`;
    }

    const recent = readHistory().slice(-HISTORY_SHOWN);
    el.history.hidden = recent.length === 0;
    el.historyList.replaceChildren(
      ...recent.map((entry, i) => {
        const mood = MOODS.find((m) => m.id === entry.mood);
        const when = new Date(entry.at);
        const label = `${mood.label}, ${when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
        const li = document.createElement("li");
        li.className = "history__item";
        li.style.setProperty("--i", i);
        li.title = label;
        li.setAttribute("aria-label", label);
        li.textContent = mood.emoji;
        return li;
      })
    );
  }

  function updateCount() {
    const n = el.worry.value.length;
    const max = Number(el.worry.maxLength);
    el.worryCount.textContent = `${n} / ${max}`;
    el.worryCount.classList.toggle("is-near", n > max * 0.85);
  }

  el.worry.addEventListener("input", updateCount);
  el.worry.addEventListener("keydown", (e) => {
    // Enter submits; Shift+Enter makes a new line
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      el.form.requestSubmit();
    }
  });

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.worry = el.worry.value.trim().replace(/\s+/g, " ");
    go("breathe");
  });

  el.skip.addEventListener("click", () => {
    state.worry = "";
    go("breathe");
  });

  /* ------------------------------------------------------------------------
     2. Breathe
     ------------------------------------------------------------------------ */

  function setCue(text) {
    if (el.cue.textContent === text) return;
    if (reducedMotion) {
      el.cue.textContent = text;
      return;
    }
    el.cue.classList.add("is-swapping");
    setTimeout(() => {
      el.cue.textContent = text;
      el.cue.classList.remove("is-swapping");
    }, 260);
  }

  function setPhase(phase, ms) {
    el.orb.style.setProperty("--dur", `${ms}ms`);
    el.orb.dataset.phase = phase;
  }

  async function countdown(ms, signal) {
    const secs = Math.round(ms / 1000);
    for (let s = secs; s > 0; s--) {
      el.orbTimer.textContent = s;
      await wait(1000, signal);
    }
  }

  async function runBreathing(signal) {
    el.breathDots.forEach((d) => d.classList.remove("is-current", "is-done"));
    el.orbTimer.textContent = "";
    setPhase("rest", 600);
    el.breathCount.textContent = "Three slow breaths";
    setCue("Get comfortable…");
    await wait(2200, signal);

    for (let round = 0; round < BREATH.rounds; round++) {
      el.breathCount.textContent = `Breath ${round + 1} of ${BREATH.rounds}`;
      el.breathDots[round].classList.add("is-current");

      setPhase("inhale", BREATH.inhale);
      setCue("Breathe in…");
      await countdown(BREATH.inhale, signal);

      setPhase("hold", BREATH.hold);
      setCue("Hold gently…");
      await countdown(BREATH.hold, signal);

      setPhase("exhale", BREATH.exhale);
      setCue("And let it out…");
      await countdown(BREATH.exhale, signal);

      el.breathDots[round].classList.replace("is-current", "is-done");
    }

    el.orbTimer.textContent = "";
    el.breathCount.textContent = "Beautifully done";
    setCue("Well done ✦");
    await wait(1600, signal);
    go("affirm");
  }

  function startBreathing() {
    stopBreathing();
    const ctrl = new AbortController();
    state.breathing = ctrl;
    runBreathing(ctrl.signal).catch((err) => {
      if (err.name !== "AbortError") throw err;
    });
  }

  function stopBreathing() {
    state.breathing?.abort();
    state.breathing = null;
  }

  el.breatheSkip.addEventListener("click", () => go("affirm"));

  /* ------------------------------------------------------------------------
     3. Affirmation
     ------------------------------------------------------------------------ */

  function showAffirmation() {
    clearTimeout(state.affirmTimer);
    el.affirmActions.classList.remove("is-visible");
    el.affirmation.classList.remove("is-fading");

    const text = pickAffirmation();
    const words = text.split(" ");
    const inner = document.createElement("span");
    inner.className = "affirmation__inner";
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.style.setProperty("--i", i);
      span.textContent = word;
      inner.append(span);
      if (i < words.length - 1) inner.append(" ");
    });
    el.affirmation.replaceChildren(inner);

    // reveal the buttons once the words have settled
    const settle = reducedMotion ? 1200 : 250 + words.length * 170 + 900;
    state.affirmTimer = setTimeout(() => el.affirmActions.classList.add("is-visible"), settle);
  }

  el.affirmNext.addEventListener("click", () => go("release"));
  el.affirmAnother.addEventListener("click", () => {
    el.affirmActions.classList.remove("is-visible");
    el.affirmation.classList.add("is-fading");
    setTimeout(showAffirmation, reducedMotion ? 150 : 500);
  });

  /* ------------------------------------------------------------------------
     4. Release
     ------------------------------------------------------------------------ */

  const hold = { raf: 0, start: 0, progress: 0, active: false, pointerId: null };

  function prepareRelease() {
    state.released = false;
    const text = state.worry || FALLBACK_WORRY;

    // Each character gets its own span so it can dissolve individually;
    // characters are grouped per word so lines only wrap between words.
    let j = 0;
    const frag = document.createDocumentFragment();
    text.split(" ").forEach((word, wi, all) => {
      const w = document.createElement("span");
      w.className = "w";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "ch";
        c.style.setProperty("--j", j++);
        c.textContent = ch;
        w.append(c);
      }
      frag.append(w);
      if (wi < all.length - 1) frag.append(" ");
    });
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    visual.append(frag);
    const spoken = document.createElement("span");
    spoken.className = "sr-only";
    spoken.textContent = text;
    el.worryText.replaceChildren(spoken, visual);

    el.releaseTitle.classList.remove("is-faded");
    el.releaseTitle.hidden = false;
    el.worryCard.hidden = false;
    el.releaseZone.hidden = false;
    el.worryCard.classList.remove("is-gone", "is-holding");
    el.worryCard.style.setProperty("--p", 0);
    el.releaseZone.classList.remove("is-done");
    el.released.hidden = true;
    setHoldProgress(0);
  }

  function setHoldProgress(p) {
    hold.progress = p;
    el.holdBtn.style.setProperty("--p", p.toFixed(3));
    el.worryCard.style.setProperty("--p", p.toFixed(3));
    el.holdBtn.classList.toggle("is-past-half", p > 0.5);
  }

  function startHold() {
    if (state.released || hold.active) return;
    hold.active = true;
    hold.start = performance.now() - hold.progress * HOLD_MS;
    el.holdBtn.classList.add("is-holding");
    el.worryCard.classList.add("is-holding");
    cancelAnimationFrame(hold.raf);

    const tick = (now) => {
      const p = Math.min(1, (now - hold.start) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) {
        hold.active = false;
        release();
        return;
      }
      hold.raf = requestAnimationFrame(tick);
    };
    hold.raf = requestAnimationFrame(tick);
  }

  /** Let go early: the fill eases back to empty. */
  function cancelHold() {
    if (!hold.active && hold.progress === 0) return;
    hold.active = false;
    hold.pointerId = null;
    cancelAnimationFrame(hold.raf);
    el.holdBtn.classList.remove("is-holding");
    el.worryCard.classList.remove("is-holding");
    if (state.released) return;

    const from = hold.progress;
    const t0 = performance.now();
    const back = (now) => {
      const t = Math.min(1, (now - t0) / 350);
      setHoldProgress(from * (1 - t) * (1 - t));
      if (t < 1) hold.raf = requestAnimationFrame(back);
    };
    hold.raf = requestAnimationFrame(back);
  }

  el.holdBtn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    hold.pointerId = e.pointerId;
    try { el.holdBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    startHold();
  });
  el.holdBtn.addEventListener("pointerup", cancelHold);
  el.holdBtn.addEventListener("pointercancel", cancelHold);
  el.holdBtn.addEventListener("lostpointercapture", () => { if (hold.active) cancelHold(); });
  el.holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());
  el.holdBtn.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      startHold();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
    }
  });
  el.holdBtn.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault(); // stops Space from also firing a click
      cancelHold();
    }
  });
  el.holdBtn.addEventListener("blur", cancelHold);
  // Assistive tech often sends a bare click with no press/hold. Treat it as a
  // full hold so the ritual is still reachable.
  el.holdBtn.addEventListener("click", (e) => {
    if (e.detail === 0 && !state.released && !hold.active) startHold();
  });

  function release() {
    state.released = true;
    el.holdBtn.classList.remove("is-holding");
    el.worryCard.classList.remove("is-holding");
    el.releaseZone.classList.add("is-done");
    if (navigator.vibrate) {
      try { navigator.vibrate(18); } catch { /* ignore */ }
    }

    bumpStreak();

    const chars = $$(".ch", el.worryText);
    let duration;
    if (reducedMotion) {
      chars.forEach((c) => c.classList.add("is-gone"));
      duration = 1200;
    } else {
      duration = dissolve(el.worryText, chars);
    }
    el.worryCard.classList.add("is-gone");
    el.releaseTitle.classList.add("is-faded");

    setTimeout(() => {
      // the words are stardust now — collapse the empty space they left
      el.releaseTitle.hidden = true;
      el.worryCard.hidden = true;
      el.releaseZone.hidden = true;
      el.released.hidden = false;
      el.releaseNext.focus({ preventScroll: true });
    }, Math.min(duration, 2200));
  }

  el.releaseNext.addEventListener("click", () => go("checkin"));

  /* ------------------------------------------------------------------------
     Particles — the words become drifting stardust
     ------------------------------------------------------------------------ */

  const fx = {
    canvas: $("#fx"),
    ctx: null,
    particles: [],
    sprites: [],
    raf: 0,
    last: 0,
  };
  fx.ctx = fx.canvas.getContext("2d");

  const PASTELS = ["#e2d8ff", "#ffcde6", "#c4f5ea", "#ffe0c9", "#cbe6ff", "#ffffff"];

  function makeSprites() {
    fx.sprites = PASTELS.map((color) => {
      const size = 64;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.18, color);
      grad.addColorStop(0.45, hexA(color, 0.35));
      grad.addColorStop(1, hexA(color, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    });
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function sizeCanvas(canvas, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Rasterise the text, sample its pixels and turn each sample into a particle.
   * Returns roughly how long the effect takes (ms).
   */
  function dissolve(textEl, chars) {
    const box = textEl.getBoundingClientRect();
    const w = Math.ceil(box.width);
    const h = Math.ceil(box.height);
    if (!w || !h || !chars.length) return 0;

    const cs = getComputedStyle(textEl);
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    octx.textBaseline = "middle";
    octx.fillStyle = "#fff";

    const sweep = 900; // left-to-right dissolve over this many ms
    chars.forEach((c) => {
      const r = c.getBoundingClientRect();
      const x = r.left - box.left;
      octx.fillText(c.textContent, x, r.top - box.top + r.height / 2);
      // fade the real glyph in step with its particles
      const d = (x / w) * sweep * 0.9 + rand(0, 80);
      c.style.transitionDelay = `${d}ms`;
      c.classList.add("is-gone");
    });

    const data = octx.getImageData(0, 0, w, h).data;
    let filled = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 128) filled++;
    const budget = window.innerWidth < 600 ? 1400 : 2400;
    const step = Math.max(2, Math.ceil(Math.sqrt(filled / budget)));

    const now = performance.now();
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] <= 128) continue;
        const life = rand(2200, 4400);
        fx.particles.push({
          x: box.left + x + rand(-0.5, 0.5),
          y: box.top + y + rand(-0.5, 0.5),
          vx: rand(-0.025, 0.025),
          vy: rand(-0.06, -0.015),
          ay: rand(-0.00006, -0.00002),
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.0015, 0.004),
          wobbleAmp: rand(0.01, 0.04),
          size: rand(4, 10),
          born: now + (x / w) * sweep + rand(0, 160),
          life,
          sprite: fx.sprites[(Math.random() * fx.sprites.length) | 0],
          twinkle: Math.random() < 0.15,
        });
      }
    }

    // a handful of brighter sparks for whimsy
    for (let i = 0; i < 26; i++) {
      fx.particles.push({
        x: box.left + rand(0, w),
        y: box.top + rand(0, h),
        vx: rand(-0.05, 0.05),
        vy: rand(-0.12, -0.05),
        ay: -0.00003,
        wobble: 0, wobbleSpeed: 0.002, wobbleAmp: 0.02,
        size: rand(14, 24),
        born: now + rand(0, sweep),
        life: rand(2600, 4200),
        sprite: fx.sprites[(Math.random() * fx.sprites.length) | 0],
        twinkle: true,
      });
    }

    if (!fx.raf) {
      fx.last = now;
      fx.raf = requestAnimationFrame(fxLoop);
    }
    return sweep + 1400;
  }

  function fxLoop(now) {
    const dt = Math.min(48, now - fx.last);
    fx.last = now;
    const ctx = fx.ctx;
    ctx.clearRect(0, 0, fx.canvas.width, fx.canvas.height);
    ctx.globalCompositeOperation = "lighter";

    let alive = 0;
    for (const p of fx.particles) {
      const age = now - p.born;
      if (age > p.life) continue;
      alive++;
      if (age < 0) continue;

      p.vy += p.ay * dt;
      p.wobble += p.wobbleSpeed * dt;
      p.x += (p.vx + Math.sin(p.wobble) * p.wobbleAmp) * dt;
      p.y += p.vy * dt;

      const t = age / p.life;
      let a = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.6);
      if (p.twinkle) a *= 0.6 + 0.4 * Math.sin(age * 0.012);
      const s = p.size * (1 - t * 0.45);

      ctx.globalAlpha = Math.max(0, a);
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (alive) {
      fx.raf = requestAnimationFrame(fxLoop);
    } else {
      fx.particles = [];
      fx.raf = 0;
      ctx.clearRect(0, 0, fx.canvas.width, fx.canvas.height);
    }
  }

  /* ------------------------------------------------------------------------
     5. Check-in
     ------------------------------------------------------------------------ */

  function renderMoods() {
    el.reply.hidden = true;
    el.moods.classList.remove("has-choice");
    el.moods.replaceChildren(
      ...MOODS.map((m, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mood";
        b.dataset.mood = m.id;
        b.style.setProperty("--i", i);
        b.setAttribute("aria-pressed", "false");
        b.innerHTML = `<span class="mood__emoji" aria-hidden="true">${m.emoji}</span><span class="mood__label">${m.label}</span>`;
        return b;
      })
    );
  }

  el.moods.addEventListener("click", (e) => {
    const btn = e.target.closest(".mood");
    if (!btn) return;
    const mood = MOODS.find((m) => m.id === btn.dataset.mood);
    const wasChosen = el.moods.classList.contains("has-choice");

    $$(".mood", el.moods).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    el.moods.classList.add("has-choice");

    // Only the first answer is logged; changing your mind replaces it.
    const history = readHistory();
    if (wasChosen && history.length) {
      history[history.length - 1] = { mood: mood.id, at: new Date().toISOString() };
      store.set("moods", history);
    } else {
      addMood(mood.id);
    }

    el.replyText.textContent = mood.reply;
    el.replyNote.hidden = !mood.note;
    el.replyNote.textContent = mood.note || "";

    const s = currentStreak();
    el.replyStreak.textContent = s.count > 0
      ? `🌙 ${s.count}-day streak${s.count > 1 ? " — keep it glowing" : " — see you tomorrow"}`
      : "";

    // restart the reveal animation if the reply is already showing
    el.reply.hidden = true;
    void el.reply.offsetWidth;
    el.reply.hidden = false;
  });

  el.again.addEventListener("click", () => {
    el.worry.value = "";
    updateCount();
    state.worry = "";
    go("welcome");
  });

  /* ------------------------------------------------------------------------
     Starry sky
     ------------------------------------------------------------------------ */

  const sky = {
    canvas: $("#stars"),
    ctx: null,
    stars: [],
    shooting: null,
    nextShoot: 0,
    raf: 0,
    w: 0,
    h: 0,
  };
  sky.ctx = sky.canvas.getContext("2d");

  const STAR_TINTS = ["255,255,255", "255,255,255", "255,255,255", "226,216,255", "255,214,236", "205,240,255"];

  function seedStars() {
    sky.w = window.innerWidth;
    sky.h = window.innerHeight;
    const count = Math.min(380, Math.round((sky.w * sky.h) / 3800));
    sky.stars = Array.from({ length: count }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * sky.w,
        // denser toward the top, thinning near the horizon
        y: Math.pow(Math.random(), 1.35) * sky.h,
        r: big ? rand(1.1, 1.8) : rand(0.35, 1.05),
        a: rand(0.35, 0.95),
        speed: rand(0.0004, 0.0016),
        phase: rand(0, Math.PI * 2),
        tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0],
        big,
      };
    });
  }

  function drawSky(now) {
    const { ctx, w, h } = sky;
    ctx.clearRect(0, 0, w, h);

    for (const s of sky.stars) {
      const tw = reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(now * s.speed + s.phase);
      const alpha = s.a * tw * (1 - (s.y / h) * 0.45);
      ctx.fillStyle = `rgba(${s.tint},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.big) {
        // soft glow + tiny cross flare on the brightest stars
        ctx.fillStyle = `rgba(${s.tint},${(alpha * 0.12).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${s.tint},${(alpha * 0.35).toFixed(3)})`;
        ctx.fillRect(s.x - s.r * 5, s.y - 0.35, s.r * 10, 0.7);
        ctx.fillRect(s.x - 0.35, s.y - s.r * 5, 0.7, s.r * 10);
      }
    }

    if (!reducedMotion) drawShootingStar(now);
  }

  function drawShootingStar(now) {
    if (!sky.shooting && now > sky.nextShoot) {
      if (sky.nextShoot) {
        const fromLeft = Math.random() < 0.5;
        sky.shooting = {
          x: fromLeft ? rand(0, sky.w * 0.5) : rand(sky.w * 0.5, sky.w),
          y: rand(0, sky.h * 0.35),
          dir: fromLeft ? 1 : -1,
          born: now,
          life: 1100,
        };
      }
      sky.nextShoot = now + rand(9000, 18000);
    }
    const s = sky.shooting;
    if (!s) return;
    const t = (now - s.born) / s.life;
    if (t >= 1) {
      sky.shooting = null;
      return;
    }
    const dist = 260 * t;
    const hx = s.x + dist * s.dir;
    const hy = s.y + dist * 0.45;
    const tail = 90;
    const alpha = Math.sin(t * Math.PI);
    const grad = sky.ctx.createLinearGradient(hx, hy, hx - tail * s.dir, hy - tail * 0.45);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(255,220,240,0)");
    sky.ctx.strokeStyle = grad;
    sky.ctx.lineWidth = 1.4;
    sky.ctx.lineCap = "round";
    sky.ctx.beginPath();
    sky.ctx.moveTo(hx, hy);
    sky.ctx.lineTo(hx - tail * s.dir, hy - tail * 0.45);
    sky.ctx.stroke();
  }

  let skyLast = 0;
  function skyLoop(now) {
    // ~30fps is plenty for a slow twinkle and kinder to batteries
    if (now - skyLast > 32) {
      skyLast = now;
      drawSky(now);
    }
    sky.raf = requestAnimationFrame(skyLoop);
  }

  function startSky() {
    cancelAnimationFrame(sky.raf);
    sky.raf = 0;
    if (reducedMotion) drawSky(performance.now()); // a still, quiet sky
    else sky.raf = requestAnimationFrame(skyLoop);
  }

  function resize() {
    sizeCanvas(sky.canvas, sky.ctx);
    sizeCanvas(fx.canvas, fx.ctx);
    seedStars();
    if (reducedMotion) drawSky(performance.now());
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  motionQuery.addEventListener?.("change", (e) => {
    reducedMotion = e.matches;
    startSky();
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  makeSprites();
  resize();
  startSky();
  updateCount();
  renderWelcome();
  el.steps[0].classList.add("is-current");
  el.stepLabel.textContent = `Step 1 of ${ORDER.length}: ${STEP_NAMES[0]}`;
})();
