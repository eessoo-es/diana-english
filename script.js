// ── Photo edge-stretch effect (MeshTransmission-style pixel smear) ──
const photoWrapEl = document.getElementById('photoWrap');
const stretchCanvas = document.getElementById('stretchCanvas');
const dianaImg = document.getElementById('dianaImg');

let edgeIntensity = 0;      // current smoothed intensity 0..1
let edgeTarget = 0;         // target intensity
let edgeSpeaking = false;   // audio playing → pulsing
let imgReady = false;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

if (stretchCanvas && dianaImg) {
  const ctx = stretchCanvas.getContext('2d');

  function sizeCanvas() {
    const r = photoWrapEl.getBoundingClientRect();
    stretchCanvas.width = Math.round(r.width * dpr);
    stretchCanvas.height = Math.round(r.height * dpr);
  }

  // Draw image "cover" into the canvas
  function drawCover() {
    const cw = stretchCanvas.width, ch = stretchCanvas.height;
    const iw = dianaImg.naturalWidth, ih = dianaImg.naturalHeight;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) * 0.15; // match object-position: center 15%
    ctx.drawImage(dianaImg, dx, dy, dw, dh);
  }

  function render() {
    if (!imgReady) { requestAnimationFrame(render); return; }
    // Keep canvas backing store in sync with its displayed size
    const r = photoWrapEl.getBoundingClientRect();
    const wantW = Math.max(1, Math.round(r.width * dpr));
    const wantH = Math.max(1, Math.round(r.height * dpr));
    if (stretchCanvas.width !== wantW || stretchCanvas.height !== wantH) {
      stretchCanvas.width = wantW;
      stretchCanvas.height = wantH;
    }
    const cw = stretchCanvas.width, ch = stretchCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    drawCover();

    // Smooth intensity toward target; add pulse while speaking
    edgeTarget = edgeSpeaking ? 1 : (edgeTarget);
    edgeIntensity += (edgeTarget - edgeIntensity) * 0.08;

    let s = edgeIntensity;
    if (edgeSpeaking) {
      // pulsing wave while audio plays
      const t = performance.now() / 1000;
      s = edgeIntensity * (0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 6)));
    }

    if (s > 0.004) {
      const strip = Math.max(2, Math.round(Math.min(cw, ch) * 0.06));
      const push = strip * s * 3.2;
      ctx.globalAlpha = Math.min(1, 0.55 + s * 0.45);
      // Left — smear leftmost strip outward
      ctx.drawImage(stretchCanvas, 0, 0, strip, ch, -push, 0, strip + push, ch);
      // Right
      ctx.drawImage(stretchCanvas, cw - strip, 0, strip, ch, cw - strip, 0, strip + push, ch);
      // Top
      ctx.drawImage(stretchCanvas, 0, 0, cw, strip, 0, -push, cw, strip + push);
      // Bottom
      ctx.drawImage(stretchCanvas, 0, ch - strip, cw, strip, 0, ch - strip, cw, strip + push);
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(render);
  }

  function onReady() {
    imgReady = true;
    sizeCanvas();
  }
  if (dianaImg.complete && dianaImg.naturalWidth) onReady();
  else dianaImg.addEventListener('load', onReady);

  window.addEventListener('resize', () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
  });

  photoWrapEl.addEventListener('mouseenter', () => { if (!edgeSpeaking) edgeTarget = 0.7; });
  photoWrapEl.addEventListener('mouseleave', () => { if (!edgeSpeaking) edgeTarget = 0; });

  render();
}

function startEdgeStretch() { edgeSpeaking = true; edgeTarget = 1; }
function stopEdgeStretch()  { edgeSpeaking = false; edgeTarget = 0; }

// ── Soft tactile click sound (WebAudio, no file) ──
let audioCtx = null;
function clickSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch (e) { /* ignore */ }
}

// Lighter, higher tick for hover
let lastHover = 0;
function hoverSound() {
  const t = performance.now();
  if (t - lastHover < 60) return; // throttle
  lastHover = t;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) { /* ignore */ }
}

// ── Per-card hover sounds ──
function playCardSound(index) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (index === 0) {
      // Жить — тёплый мажорный перезвон C-E-G с долгим затуханием
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const t = now + i * 0.13;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 1.2);
      });

    } else if (index === 1) {
      // Работать — два "дзинь" с долгим резонансом
      [880, 1108].forEach((freq, i) => {
        const t = now + i * 0.2;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 1.0);
      });

    } else if (index === 2) {
      // IELTS — "WOW!" широкий взлёт с эхом
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.9);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now + 1.1);

    } else if (index === 3) {
      // Исследовать — свист с вибрато и долгим угасанием
      const osc = ctx.createOscillator();
      const vibOsc = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.linearRampToValueAtTime(1680, now + 0.18);
      osc.frequency.linearRampToValueAtTime(1500, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1420, now + 1.0);
      vibOsc.frequency.value = 6;
      vibGain.gain.setValueAtTime(0, now);
      vibGain.gain.linearRampToValueAtTime(30, now + 0.1);
      vibGain.gain.setValueAtTime(30, now + 0.7);
      vibGain.gain.linearRampToValueAtTime(0, now + 1.1);
      vibOsc.connect(vibGain);
      vibGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.07);
      gain.gain.setValueAtTime(0.15, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain).connect(ctx.destination);
      [osc, vibOsc].forEach(o => { o.start(now); o.stop(now + 1.2); });
    }
  } catch(e) { /* ignore */ }
}

// Attach hover sound to interactive elements + emoji explosions
function attachHoverSounds() {
  const sel = ".place-item, #listenBtn, #randomBtn, .start-tg";
  document.querySelectorAll(sel).forEach((el) => {
    el.addEventListener("mouseenter", hoverSound);
  });
  document.querySelectorAll(".service-card").forEach((card, cardIndex) => {
    card.addEventListener("mouseenter", () => playCardSound(cardIndex));
  });
  document.querySelectorAll(".service-card").forEach((card) => {
    let emojiTimer = null;
    card.addEventListener("mouseenter", () => {
      for (let i = 0; i < 3; i++) spawnOneEmoji(card);
      emojiTimer = setInterval(() => {
        spawnOneEmoji(card);
        spawnOneEmoji(card);
      }, 80);
    });
    card.addEventListener("mouseleave", () => {
      clearInterval(emojiTimer);
      emojiTimer = null;
    });
  });
}

// ── Intro: cycle ALL page text through random languages for 2s ──
const NAME_VARIANTS = [
  "Диана Терещенко", "Diana Tereshchenko", "戴安娜·捷列先科",
  "ダイアナ・テレシチェンコ", "다이애나 테레셴코", "ديانا تيريشينكو",
  "Ντιάνα Τερεστσένκο", "Diana Tereszczenko", "Дыяна Церашчэнка",
];
const ROLE_RU = [
  "Преподаватель английского языка · Языковой коуч",
  "Profesora de inglés · Coach de idiomas",
  "Professeure d'anglais · Coach linguistique",
  "Englischlehrerin · Sprachcoach",
  "英语教师 · 语言教练",
  "英語の先生 · ランゲージコーチ",
  "Insegnante di inglese · Language coach",
  "Professora de inglês · Coach de idiomas",
];
const ROLE_EN = [
  "English Teacher · Language Coach",
  "Profesora de inglés · Coach de idiomas",
  "Enseignante d'anglais · Coach linguistique",
  "Englischlehrerin · Sprachcoach",
  "英语教师 · 语言教练",
  "英語の先生 · ランゲージコーチ",
  "Insegnante di inglese · Coach linguistico",
  "Professora de inglês · Coach de idiomas",
];

// Unicode ranges for visual scramble
const UNICODE_RANGES = [
  [0x4E00, 0x9FFF],  // CJK
  [0x0600, 0x06FF],  // Arabic
  [0x3040, 0x309F],  // Hiragana
  [0xAC00, 0xD7AF],  // Korean
  [0x0400, 0x044F],  // Cyrillic
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function scrambleText(text) {
  const [lo, hi] = UNICODE_RANGES[Math.floor(Math.random() * UNICODE_RANGES.length)];
  return Array.from(text).map(c =>
    c === ' ' || c === '\n' || c === '·' ? c :
    String.fromCodePoint(lo + Math.floor(Math.random() * (hi - lo)))
  ).join('');
}

// Scramble all text nodes inside an element (handles <br> etc.)
function scrambleEl(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim().length > 0) {
      node.nodeValue = scrambleText(node.nodeValue);
    }
  }
}

function runIntro() {
  const cols = document.querySelectorAll(".site-header .header-col");
  if (cols.length < 2) return;
  const leftName  = cols[0].querySelector(".header-name");
  const leftRole  = cols[0].querySelector(".header-title");
  const rightName = cols[1].querySelector(".header-name");
  const rightRole = cols[1].querySelector(".header-title");

  // Collect extra elements across the page (including those with <br>)
  const extraSelectors = [
    ".about .col p",
    ".current .col",
    ".services-intro",
    ".service-card h3",
    ".service-card > p",
    ".start-title", ".start-sub",
  ];
  const extraEls = [];
  const extraOriginals = []; // store innerHTML to restore exactly
  extraSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      extraEls.push(el);
      extraOriginals.push(el.innerHTML);
    });
  });

  const finals = {
    leftName: leftName.textContent,
    leftRole: leftRole.textContent,
    rightName: rightName.textContent,
    rightRole: rightRole.textContent,
  };

  const headerTargets = [leftName, leftRole, rightName, rightRole];
  headerTargets.forEach((el) => { el.style.transition = "opacity 0.12s ease"; });

  const DURATION = 1600;
  const STEP = 110;
  const start = performance.now();

  const timer = setInterval(() => {
    const elapsed = performance.now() - start;
    if (elapsed >= DURATION) {
      clearInterval(timer);
      leftName.textContent  = finals.leftName;
      leftRole.textContent  = finals.leftRole;
      rightName.textContent = finals.rightName;
      rightRole.textContent = finals.rightRole;
      headerTargets.forEach((el) => { el.style.opacity = "1"; });
      extraEls.forEach((el, i) => { el.innerHTML = extraOriginals[i]; el.style.opacity = "1"; });
      return;
    }
    leftName.textContent  = pick(NAME_VARIANTS);
    rightName.textContent = pick(NAME_VARIANTS);
    leftRole.textContent  = pick(ROLE_RU);
    rightRole.textContent = pick(ROLE_EN);
    headerTargets.forEach((el) => { el.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2); });

    extraEls.forEach((el, i) => {
      el.innerHTML = extraOriginals[i]; // restore structure first
      scrambleEl(el);                   // then scramble text nodes in-place
      el.style.opacity = (0.3 + Math.random() * 0.5).toFixed(2);
    });
  }, STEP);
}

// ── Emoji continuous emission on service card hover ──
function spawnOneEmoji(card) {
  const raw = card.dataset.emojis || "";
  const emojis = [...new Intl.Segmenter().segment(raw)].map(s => s.segment);
  if (!emojis.length) return;
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const rect = card.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const el = document.createElement("span");
  el.className = "emoji-particle";
  el.textContent = emoji;
  el.style.left = cx + "px";
  el.style.top  = cy + "px";
  el.style.setProperty("--dx", ((Math.random() - 0.5) * 180) + "px");
  el.style.setProperty("--dy", -(80 + Math.random() * 120) + "px");
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// Bootstrap (works whether or not DOMContentLoaded already fired)
function boot() {
  attachHoverSounds();
  runIntro();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// ── Random quotes ──
const QUOTES = [
  "Curiosity is one of the best reasons to learn a language.",
  "The limits of my language are the limits of my world.",
  "To learn a language is to have one more window from which to look at the world.",
  "Language is the road map of a culture.",
  "One language sets you in a corridor for life. Two languages open every door along the way.",
  "Learning another language is like becoming another person.",
  "You live a new life for every new language you speak.",
  "A different language is a different vision of life.",
  "The more languages you know, the more you are human.",
  "With languages you are at home anywhere.",
  "Language is not a genetic gift, it is a social gift.",
  "Every language is a different way of looking at the world.",
];

let lastQuoteIndex = -1;

function speakRandom() {
  let idx;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === lastQuoteIndex);
  lastQuoteIndex = idx;
  const input = document.getElementById("phraseInput");
  input.value = QUOTES[idx];
  speakPhrase();
}

// ── Pronunciation ──
let currentAudio = null;
let isGenerating = false;

async function speakPhrase() {
  if (isGenerating) return;

  const input     = document.getElementById("phraseInput");
  const listenBtn = document.getElementById("listenBtn");
  const randomBtn = document.getElementById("randomBtn");
  const photoWrap = document.getElementById("photoWrap");
  const translation = document.getElementById("resultTranslation");
  const status    = document.getElementById("resultStatus");

  const text = input.value.trim();
  if (!text) { input.focus(); return; }

  clickSound();

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  photoWrap.classList.remove("speaking");

  isGenerating = true;
  listenBtn.disabled = true;
  randomBtn.disabled = true;
  translation.textContent = "";
  status.textContent = "…";

  try {
    const [blob, translated] = await Promise.all([
      generateAudio(text),
      translateToRussian(text),
    ]);

    if (translated) translation.textContent = translated;
    status.textContent = "";

    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);

    currentAudio.addEventListener("play", () => {
      photoWrap.classList.add("speaking");
      startEdgeStretch();
      status.textContent = "▶";
    });

    currentAudio.addEventListener("ended", () => {
      photoWrap.classList.remove("speaking");
      stopEdgeStretch();
      status.textContent = "";
      URL.revokeObjectURL(url);
      currentAudio = null;
      listenBtn.disabled = false;
      randomBtn.disabled = false;
      isGenerating = false;
    });

    currentAudio.addEventListener("error", () => {
      photoWrap.classList.remove("speaking");
      stopEdgeStretch();
      listenBtn.disabled = false;
      randomBtn.disabled = false;
      isGenerating = false;
    });

    await currentAudio.play();

  } catch (err) {
    console.error(err);
    status.textContent = "Ошибка: " + err.message;
    listenBtn.disabled = false;
    randomBtn.disabled = false;
    isGenerating = false;
  }
}

async function generateAudio(text) {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true },
      }),
    }
  );
  if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}`);
  return resp.blob();
}

async function translateToRussian(text) {
  try {
    const resp = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await resp.json();
    return data?.[0]?.[0]?.[0] || null;
  } catch { return null; }
}

// Enter to submit
document.getElementById("phraseInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); speakPhrase(); }
});
