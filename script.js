const canvas = document.querySelector("#sequence-canvas");
if (canvas) {
const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
const frameCount = 340;
const frames = new Array(frameCount);
let currentFrame = 0;
let targetFrame = 0;
let scrollFrameRequest = 0;

const frameSource = (index) =>
  `frames-hq/frame-${String(index + 1).padStart(3, "0")}.jpg`;

function sizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  drawFrame(currentFrame);
}

function drawFrame(index) {
  const image = frames[index];
  if (!image?.complete || !image.naturalWidth) return;

  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, x, y, width, height);
}

function updateTargetFrame() {
  scrollFrameRequest = 0;
  const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
  targetFrame = Math.round(progress * (frameCount - 1));
  const targetIndex = targetFrame;
  for (let offset = -8; offset <= 14; offset += 1) loadFrame(targetIndex + offset);
  frames.forEach((image, index) => {
    if (image && Math.abs(index - targetIndex) > 45 && index !== currentFrame) frames[index] = undefined;
  });
  if (frames[targetIndex]?.complete && frames[targetIndex].naturalWidth) {
    currentFrame = targetIndex;
    drawFrame(targetIndex);
  }
}

function requestScrollFrame() {
  if (!scrollFrameRequest) scrollFrameRequest = requestAnimationFrame(updateTargetFrame);
}

function loadFrame(index) {
  if (index < 0 || index >= frameCount || frames[index]) return;
  const image = new Image();
  image.decoding = "async";
  image.src = frameSource(index);
  image.onload = () => {
    if (index === 0 || index === targetFrame) {
      currentFrame = index;
      drawFrame(index);
    }
  };
  frames[index] = image;
}

window.addEventListener("resize", sizeCanvas);
window.addEventListener("resize", requestScrollFrame);
window.addEventListener("scroll", requestScrollFrame, { passive: true });
for (let index = 0; index < 18; index += 1) loadFrame(index);
sizeCanvas();
updateTargetFrame();
}
const voiceSessionId = crypto.randomUUID?.() || `voice-${Date.now()}-${Math.random()}`;
const voiceEchoTestMode = false;
let voiceInputMode = "general";

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const revealItems = document.querySelectorAll(".reveal:not(.hero-content)");

if (document.body.classList.contains("inner-page")) {
  requestAnimationFrame(() => document.body.classList.add("page-ready"));

  if (document.body.classList.contains("flights-page")) {
    const hero = document.querySelector(".inner-page-hero");
    hero?.insertAdjacentHTML("beforeend", `
      <div class="flight-route-scene" aria-hidden="true">
        <span class="flight-route-line"></span>
        <i class="flight-route-origin"></i>
        <i class="flight-route-destination"></i>
        <b class="flight-route-plane">✈</b>
        <small>LHE</small><small>YOUR NEXT DESTINATION</small>
      </div>`);
  }

  if (document.body.classList.contains("tracker-page")) {
    document.querySelector(".tracker-shell")?.insertAdjacentHTML("afterbegin", `
      <div class="radar-boot" aria-hidden="true">
        <span></span><strong>CONNECTING TO AIRSPACE</strong><small>ADS-B RADAR ONLINE</small>
      </div>`);
    window.setTimeout(() => document.querySelector(".radar-boot")?.classList.add("complete"), 1450);
  }

  if (document.body.classList.contains("destinations-page")) {
    document.querySelector(".standalone-destinations")?.insertAdjacentHTML("afterbegin", `
      <div class="destination-gallery-ui" aria-hidden="true">
        <span>Scroll to explore</span><i><b></b></i><strong>01 / 04</strong>
      </div>`);
  }

  if (document.body.classList.contains("about-page")) {
    document.querySelector(".about-journey-steps")?.insertAdjacentHTML("afterbegin", `<i class="about-route-line" aria-hidden="true"></i>`);
  }

  const staggerGroups = [
    ".flight-fields > *",
    ".destination-grid > *",
    ".about-beliefs > *",
    ".about-journey-steps > *",
    ".experience-grid > *",
    ".about-signature-grid > *",
    ".tracker-stats > *"
  ];

  staggerGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((item, index) => {
      item.style.setProperty("--stagger", `${Math.min(index, 8) * 85}ms`);
      item.classList.add("page-stagger-item");
    });
  });

  document.querySelectorAll(".about-belief-card, .about-signature-grid > div, .flight-search-card, .tracker-shell").forEach((panel) => {
    panel.addEventListener("pointermove", (event) => {
      const bounds = panel.getBoundingClientRect();
      panel.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      panel.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    });
  });

  let pageMotionFrame = 0;
  const updatePageMotion = () => {
    pageMotionFrame = 0;

    const routeScene = document.querySelector(".flight-route-scene");
    if (routeScene) {
      const hero = document.querySelector(".inner-page-hero");
      const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(hero?.offsetHeight || 1, 1)));
      routeScene.style.setProperty("--route-progress", progress.toFixed(3));
      routeScene.style.setProperty("--route-fill", `${progress * 100}%`);
      routeScene.style.setProperty("--plane-x", `${5 + progress * 82}%`);
      routeScene.style.setProperty("--plane-y", `${24 + Math.sin(progress * Math.PI) * 46}%`);
    }

    const gallerySection = document.querySelector(".standalone-destinations");
    const gallery = gallerySection?.querySelector(".destination-grid");
    if (gallerySection && gallery && window.innerWidth > 900) {
      const rect = gallerySection.getBoundingClientRect();
      const distance = Math.max(1, gallerySection.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / distance));
      gallery.style.setProperty("--gallery-progress", progress.toFixed(3));
      gallery.style.setProperty("--gallery-x", `${-progress * Math.max(0, gallery.scrollWidth - gallerySection.clientWidth + window.innerWidth * .12)}px`);
      gallerySection.style.setProperty("--gallery-progress", progress.toFixed(3));
      const current = Math.min(4, Math.floor(progress * 3.999) + 1);
      const counter = gallerySection.querySelector(".destination-gallery-ui strong");
      if (counter) counter.textContent = `0${current} / 04`;
    }

    const journey = document.querySelector(".about-journey-steps");
    if (journey) {
      const rect = journey.getBoundingClientRect();
      const start = window.innerHeight * .72;
      const distance = Math.max(1, rect.height + window.innerHeight * .2);
      const progress = Math.max(0, Math.min(1, (start - rect.top) / distance));
      journey.style.setProperty("--journey-progress", progress.toFixed(3));
      journey.style.setProperty("--journey-height", `${progress * 100}%`);
    }
  };

  const requestPageMotion = () => {
    if (!pageMotionFrame) pageMotionFrame = requestAnimationFrame(updatePageMotion);
  };
  window.addEventListener("scroll", requestPageMotion, { passive: true });
  window.addEventListener("resize", requestPageMotion);
  updatePageMotion();
  createInnerPageBackground(document.body.dataset.page || "");
}

function createInnerPageBackground(page) {
  if (!["flights", "tracker", "destinations", "about"].includes(page)) return;

  const canvas = document.createElement("canvas");
  canvas.className = `bits-background bits-background-${page}`;
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let animationFrame = 0;
  let lastTime = 0;
  let lastPaint = -40;

  const particles = Array.from({ length: page === "about" ? 34 : 24 }, (_, index) => ({
    seed: index * 1.618,
    x: Math.random(),
    y: Math.random(),
    speed: .05 + Math.random() * .14,
    size: .5 + Math.random() * 1.5
  }));

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawLightRays = (time) => {
    const glow = context.createRadialGradient(width * .72, height * .06, 0, width * .72, height * .06, width * .75);
    glow.addColorStop(0, "rgba(93,137,255,.16)");
    glow.addColorStop(.48, "rgba(33,70,168,.045)");
    glow.addColorStop(1, "rgba(2,7,18,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 9; index += 1) {
      const drift = Math.sin(time * .00022 + index * .9) * 55;
      const start = width * (.48 + index * .055) + drift;
      const ray = context.createLinearGradient(start, 0, start - width * .35, height);
      ray.addColorStop(0, "rgba(145,177,255,.12)");
      ray.addColorStop(.65, "rgba(69,112,226,.025)");
      ray.addColorStop(1, "rgba(69,112,226,0)");
      context.fillStyle = ray;
      context.beginPath();
      context.moveTo(start, -20);
      context.lineTo(start + 34 + index * 4, -20);
      context.lineTo(start - width * .18 + 135, height);
      context.lineTo(start - width * .18 - 55, height);
      context.closePath();
      context.fill();
    }
    context.restore();
  };

  const drawGridScan = (time) => {
    const gridSize = Math.max(46, Math.min(72, width / 22));
    context.strokeStyle = "rgba(91,132,230,.055)";
    context.lineWidth = 1;
    for (let x = (time * .008) % gridSize; x < width; x += gridSize) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    const scanY = (time * .065) % (height + 180) - 90;
    const scan = context.createLinearGradient(0, scanY - 90, 0, scanY + 30);
    scan.addColorStop(0, "rgba(70,119,255,0)");
    scan.addColorStop(.82, "rgba(70,119,255,.05)");
    scan.addColorStop(1, "rgba(131,172,255,.22)");
    context.fillStyle = scan;
    context.fillRect(0, scanY - 90, width, 120);
    particles.forEach((particle, index) => {
      const pulse = .25 + Math.max(0, Math.sin(time * .002 + index)) * .6;
      context.fillStyle = `rgba(105,154,255,${pulse})`;
      context.beginPath();
      context.arc(particle.x * width, particle.y * height, particle.size + pulse * 2, 0, Math.PI * 2);
      context.fill();
    });
  };

  const drawSilk = (time) => {
    context.save();
    context.globalCompositeOperation = "screen";
    for (let layer = 0; layer < 5; layer += 1) {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `rgba(35,72,178,${.015 + layer * .008})`);
      gradient.addColorStop(.55, `rgba(83,124,237,${.06 + layer * .008})`);
      gradient.addColorStop(1, `rgba(104,174,255,${.015 + layer * .006})`);
      context.strokeStyle = gradient;
      context.lineWidth = 50 + layer * 24;
      context.beginPath();
      for (let x = -80; x <= width + 80; x += 35) {
        const y = height * (.2 + layer * .14) + Math.sin(x * .0045 + time * (.00018 + layer * .000025)) * (75 + layer * 13);
        if (x === -80) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();
  };

  const drawConstellation = (time) => {
    const points = particles.map((particle, index) => {
      const driftX = Math.sin(time * .00011 * particle.speed + particle.seed) * 42;
      const driftY = Math.cos(time * .00009 * particle.speed + particle.seed * 1.7) * 34;
      return {
        x: particle.x * width + driftX,
        y: particle.y * height + driftY,
        size: particle.size,
        pulse: .35 + Math.max(0, Math.sin(time * .0012 + index)) * .65
      };
    });

    context.save();
    context.globalCompositeOperation = "screen";
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const dx = points[a].x - points[b].x;
        const dy = points[a].y - points[b].y;
        const distance = Math.hypot(dx, dy);
        if (distance < 155) {
          context.strokeStyle = `rgba(112,148,239,${(1 - distance / 155) * .11})`;
          context.lineWidth = .65;
          context.beginPath();
          context.moveTo(points[a].x, points[a].y);
          context.lineTo(points[b].x, points[b].y);
          context.stroke();
        }
      }
    }

    points.forEach((point, index) => {
      if (index % 7 === 0) {
        const halo = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 24);
        halo.addColorStop(0, `rgba(151,180,255,${point.pulse * .22})`);
        halo.addColorStop(1, "rgba(96,136,240,0)");
        context.fillStyle = halo;
        context.fillRect(point.x - 24, point.y - 24, 48, 48);
      }
      context.fillStyle = `rgba(190,208,255,${.25 + point.pulse * .6})`;
      context.beginPath();
      context.arc(point.x, point.y, point.size * point.pulse, 0, Math.PI * 2);
      context.fill();
    });

    const vignette = context.createRadialGradient(width * .55, height * .42, 0, width * .55, height * .42, width * .65);
    vignette.addColorStop(0, "rgba(56,91,183,.045)");
    vignette.addColorStop(1, "rgba(2,5,13,0)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
    context.restore();
  };

  const render = (time = 0) => {
    const frameInterval = page === "tracker" ? 66 : 50;
    if (!reducedMotion && time - lastPaint < frameInterval) {
      animationFrame = requestAnimationFrame(render);
      return;
    }
    lastPaint = time;
    context.clearRect(0, 0, width, height);
    if (page === "flights") drawLightRays(time);
    if (page === "tracker") drawGridScan(time);
    if (page === "destinations") drawSilk(time);
    if (page === "about") drawConstellation(time);
    lastTime = time;
    if (!reducedMotion && !document.hidden) animationFrame = requestAnimationFrame(render);
  };

  const handleVisibility = () => {
    cancelAnimationFrame(animationFrame);
    if (!document.hidden && !reducedMotion) animationFrame = requestAnimationFrame(render);
    if (reducedMotion) render(lastTime);
  };

  resize();
  render();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", handleVisibility);
}

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
  header.classList.toggle("header-hidden", window.scrollY > 70);
}, { passive: true });

menuButton.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mobileNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => observer.observe(item));

document.querySelectorAll(".destination-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    card.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  });

  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "30%");
  });
});

const voiceLauncher = document.querySelector(".voice-launcher");
const voicePanel = document.querySelector(".voice-panel");
const voiceClose = document.querySelector(".voice-close");
const voiceMic = document.querySelector(".voice-mic");
const voiceStop = document.querySelector(".voice-stop");
const voiceStatus = document.querySelector(".voice-status");
const voiceConversation = document.querySelector(".voice-conversation");
window.speechSynthesis?.getVoices();
let mediaRecorder;
let mediaStream;
let audioChunks = [];
let recordingTimer;
let currentVoiceAudio;
let voiceAudioContext;
let currentVoiceSource;

function toggleVoicePanel(open) {
  voicePanel.classList.toggle("open", open);
  voicePanel.setAttribute("aria-hidden", String(!open));
  voiceLauncher.setAttribute("aria-expanded", String(open));
}

function addVoiceMessage(role, text) {
  const message = document.createElement("div");
  message.className = `voice-message ${role} message-entering`;
  const badge = document.createElement("span");
  badge.className = "voice-avatar";
  badge.innerHTML = role === "user"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.2-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></svg>'
    : '<img src="favicon.svg" alt="" aria-hidden="true" />';
  const copy = document.createElement("p");
  copy.textContent = text;
  message.append(badge, copy);
  voiceConversation.append(message);
  message.addEventListener("animationend", () => message.classList.remove("message-entering"), { once: true });
  requestAnimationFrame(() => voiceConversation.scrollTo({ top: voiceConversation.scrollHeight, behavior: "smooth" }));
}

async function speakUrdu(text) {
  if (currentVoiceAudio) {
    currentVoiceAudio.pause();
    URL.revokeObjectURL(currentVoiceAudio.src);
  }
  voiceStatus.textContent = "Local awaaz tayyar ho rahi hai…";
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error("Local TTS unavailable");
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentVoiceAudio = new Audio(audioUrl);
    currentVoiceAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      voiceStatus.textContent = "Dobara poochne ke liye mic dabayein";
    };
    await currentVoiceAudio.play();
  } catch (error) {
    voiceStatus.textContent = "Local Urdu voice service check karein";
  }
}

function selectRomanUrduVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return voices.find((voice) => voice.localService && /Microsoft (Aria|Zira|Jenny|Sonia|Hazel)/i.test(voice.name))
    || voices.find((voice) => voice.localService && /^en-(GB|US)/i.test(voice.lang))
    || voices.find((voice) => /^en-(GB|US)/i.test(voice.lang))
    || voices[0];
}

function speakRomanUrdu(text) {
  if (!window.speechSynthesis) {
    voiceStatus.textContent = "Browser voice available nahin hai";
    return;
  }
  window.speechSynthesis.cancel();
  voiceStatus.textContent = "Jawab bola ja raha hai...";
  const speech = new SpeechSynthesisUtterance(text);
  speech.voice = selectRomanUrduVoice();
  speech.lang = speech.voice?.lang || "en-GB";
  speech.rate = 0.86;
  speech.pitch = 1.02;
  speech.volume = 1;
  speech.onend = () => { voiceStatus.textContent = "Dobara poochne ke liye mic dabayein"; };
  speech.onerror = () => { voiceStatus.textContent = "Speaker volume check karein"; };
  window.speechSynthesis.speak(speech);
}

async function speakClearUrdu(text) {
  window.speechSynthesis?.cancel();
  voiceStatus.textContent = "Jawab ki awaaz tayyar ho rahi hai...";
  try {
    voiceAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    await voiceAudioContext.resume();
    currentVoiceSource?.stop();

    const fetchChunk = async chunk => {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk })
      });
      if (!response.ok) throw new Error("Kokoro voice unavailable");
      return voiceAudioContext.decodeAudioData(await response.arrayBuffer());
    };
    const audioBuffer = await fetchChunk(text);
    voiceStatus.textContent = "Jawab bola ja raha hai...";
    await new Promise(resolve => {
      currentVoiceSource = voiceAudioContext.createBufferSource();
      currentVoiceSource.buffer = audioBuffer;
      currentVoiceSource.connect(voiceAudioContext.destination);
      currentVoiceSource.onended = resolve;
      currentVoiceSource.start();
    });
    voiceStatus.textContent = "Dobara poochne ke liye mic dabayein";
  } catch (error) {
    voiceStatus.textContent = "Audio play karne ke liye speaker check karein";
  }
}

async function askTravelAssistant(transcript) {
  voiceStatus.textContent = "Jawab tayyar ho raha hai…";
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: transcript, sessionId: voiceSessionId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Assistant unavailable");
    voiceInputMode = data.expectedInput || "general";
    addVoiceMessage("assistant", data.roman_urdu);
    if (data.booking) applyVoiceBooking(data.booking, data.searchReady);
    await speakClearUrdu(data.speech_urdu || data.tts_mixed || data.speech_roman || data.roman_urdu);
  } catch (error) {
    const errorMessage = "Maazrat, local assistant connect nahin ho saka. Ollama aur local model check karein.";
    addVoiceMessage("assistant", errorMessage);
    speakRomanUrdu(errorMessage);
    voiceStatus.textContent = "Ollama connection check karein";
  }
}

async function handleVoiceNavigation(transcript) {
  const text = String(transcript || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const commands = [
    { match: /\b(track|tracker|radar|flight radar|track flight|live flight)\b/, url: "tracker.html", reply: "Live flight tracker khol diya.", speech: "فلائٹ ٹریکر کھول دیا۔" },
    { match: /\b(about|abaut|ab out|about us|hamare bare|company)\b/, url: "about.html", reply: "About page khol diya.", speech: "اباؤٹ پیج کھول دیا۔" },
    { match: /\b(flight|flights|booking|book flight|search flight|search screen)\b/, url: "flights.html", reply: "Flight search khol diya.", speech: "فلائٹ سرچ کھول دیا۔" },
    { match: /\b(destination|destinations|places)\b/, url: "destinations.html", reply: "Destinations khol diye.", speech: "ڈیسٹینیشنز کھول دیے۔" },
    { match: /\b(experience|experiences|plan|contact|travel expert)\b/, url: "about.html", reply: "About page khol diya.", speech: "اباؤٹ پیج کھول دیا۔" },
    { match: /\b(home|top|homepage)\b/, url: "index.html", reply: "Home khol diya.", speech: "ہوم کھول دیا۔" }
  ];
  const command = commands.find(item => item.match.test(text));
  if (!command || (!/\b(open|show|go|khol|kholo|dikhao|le chalo|navigate)\b/.test(text) && text.split(" ").length > 2)) return false;
  addVoiceMessage("assistant", command.reply);
  window.setTimeout(() => { window.location.href = command.url; }, 420);
  speakClearUrdu(command.speech);
  return true;
}

async function transcribeRecording(audioBlob) {
  voiceStatus.textContent = "Local Whisper awaaz samajh raha hai…";
  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": audioBlob.type || "audio/webm", "X-Voice-Context": voiceInputMode },
      body: audioBlob
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Transcription failed");
    const recognizedText = data.roman_text || data.text;
    addVoiceMessage("user", recognizedText || "Awaaz samajh nahin aayi.");
    if (await handleVoiceNavigation(recognizedText)) return;
    if (voiceEchoTestMode) {
      addVoiceMessage("assistant", recognizedText);
      await speakClearUrdu(data.text || recognizedText);
    } else {
      await askTravelAssistant(recognizedText || data.text);
    }
  } catch (error) {
    voiceStatus.textContent = "Local Whisper tayyar nahin hai ya awaaz samajh nahin aayi";
  }
}

function stopLocalRecording() {
  clearTimeout(recordingTimer);
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
}

async function startLocalRecording() {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error("Recording is unsupported");
    }
    if (currentVoiceAudio) currentVoiceAudio.pause();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    audioChunks = [];
    const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
    mediaRecorder = new MediaRecorder(mediaStream, preferredType ? { mimeType: preferredType } : undefined);
    mediaRecorder.ondataavailable = (event) => { if (event.data.size) audioChunks.push(event.data); };
    mediaRecorder.onstop = async () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      voiceMic.classList.remove("listening");
      voiceMic.querySelector("span").textContent = "Bolain";
      if (audioBlob.size > 1000) await transcribeRecording(audioBlob);
    };
    mediaRecorder.start();
    voiceMic.classList.add("listening");
    voiceMic.querySelector("span").textContent = "Rokain";
    voiceStatus.textContent = "Urdu mein bolain — dobara dabakar rokain";
    recordingTimer = setTimeout(stopLocalRecording, 12000);
  } catch (error) {
    voiceStatus.textContent = "Microphone permission dein aur dobara koshish karein";
  }
}

voiceMic.addEventListener("click", () => {
  voiceAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  voiceAudioContext.resume();
  if (mediaRecorder?.state === "recording") stopLocalRecording();
  else startLocalRecording();
});

voiceLauncher.addEventListener("click", () => toggleVoicePanel(!voicePanel.classList.contains("open")));
voiceClose.addEventListener("click", () => toggleVoicePanel(false));
voiceStop.addEventListener("click", () => {
  stopLocalRecording();
  if (currentVoiceAudio) currentVoiceAudio.pause();
  try { currentVoiceSource?.stop(); } catch {}
  window.speechSynthesis?.cancel();
});

// Flight search UI: a complete, local booking-search prototype. Live ticketing
// can later replace these sample results without changing the interface.
const flightForm = document.querySelector("#flight-search-form");
function voiceDateToISO(value) {
  if (!value) return "";
  const cleaned = String(value).toLowerCase()
    .replace(/\b(sikn|siksteen)\b/g, "16")
    .replace(/\b(sbtmbr|sptmbr|septembr|sitambar|setambar)\b/g, "september")
    .replace(/\b(oktabr|aktubar)\b/g, "october")
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/\s+/g, " ").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  if (/^(?:date\s*)?([1-9]|[12]\d|3[01])$/.test(cleaned)) {
    const day = Number(cleaned.match(/\d+/)[0]);
    const now = new Date();
    let candidate = new Date(now.getFullYear(), now.getMonth(), day);
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidate = new Date(now.getFullYear(), now.getMonth() + 1, day);
    return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}`;
  }
  const months = { january:0, jan:0, february:1, feb:1, march:2, mar:2, april:3, apr:3, may:4, june:5, jun:5, july:6, jul:6, august:7, aug:7, september:8, sep:8, october:9, oct:9, november:10, nov:10, december:11, dec:11 };
  const match = cleaned.match(/\b([1-9]|[12]\d|3[01])\s+([a-z]+)(?:\s+(20\d{2}))?\b/) || cleaned.match(/\b([a-z]+)\s+([1-9]|[12]\d|3[01])(?:\s+(20\d{2}))?\b/);
  if (!match) return "";
  const monthFirst = Number.isNaN(Number(match[1]));
  const day = Number(monthFirst ? match[2] : match[1]);
  const month = months[monthFirst ? match[1] : match[2]];
  const year = Number(match[3] || new Date().getFullYear());
  if (month === undefined) return "";
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function applyVoiceBooking(booking, searchReady = false) {
  const form = document.querySelector("#flight-search-form");
  if (!form) return;
  const airportCodes = { Lahore:"Lahore (LHE)", Karachi:"Karachi (KHI)", Islamabad:"Islamabad (ISB)", Dubai:"Dubai (DXB)", London:"London Heathrow (LHR)", Doha:"Doha (DOH)", Istanbul:"Istanbul (IST)" };
  if (booking.from) document.querySelector("#flight-from").value = airportCodes[booking.from] || booking.from;
  if (booking.to) document.querySelector("#flight-to").value = airportCodes[booking.to] || booking.to;
  if (booking.tripType) document.querySelector(`.trip-toggle button[data-trip="${booking.tripType}"]`)?.click();
  const departure = voiceDateToISO(booking.departure);
  let returning = voiceDateToISO(booking.return);
  if (departure && returning && returning <= departure) {
    const next = new Date(`${returning}T12:00:00`);
    next.setMonth(next.getMonth() + 1);
    returning = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  }
  if (departure) document.querySelector("#flight-departure").value = departure;
  if (returning) document.querySelector("#flight-return").value = returning;
  if (booking.travellers) {
    const count = Math.min(20, Math.max(1, Number(String(booking.travellers).match(/\d+/)?.[0] || 1)));
    const travellerSelect = document.querySelector("#flight-travellers");
    const travellerLabel = `${count} Traveller${count === 1 ? "" : "s"}`;
    if (![...travellerSelect.options].some(option => option.value === travellerLabel)) travellerSelect.add(new Option(travellerLabel, travellerLabel));
    travellerSelect.value = travellerLabel;
  }
  if (booking.cabin) {
    const cabin = String(booking.cabin).toLowerCase();
    document.querySelector("#flight-cabin").value = cabin.includes("business") ? "Business" : "Economy";
  }
  form.classList.remove("voice-updated");
  requestAnimationFrame(() => form.classList.add("voice-updated"));
  if (searchReady) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const toISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const departureInput = document.querySelector("#flight-departure");
    const returnInput = document.querySelector("#flight-return");
    if (!departureInput.value) departureInput.value = toISO(tomorrow);
    if (returnInput.required && !returnInput.value) {
      const weekLater = new Date(`${departureInput.value}T12:00:00`);
      weekLater.setDate(weekLater.getDate() + 7);
      returnInput.value = toISO(weekLater);
    }
    document.querySelectorAll("#book-flight .reveal").forEach(item => item.classList.add("visible"));
    document.querySelector("#book-flight").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => form.requestSubmit(), 650);
  }
}

if (flightForm) {
  const fromInput = document.querySelector("#flight-from");
  const toInput = document.querySelector("#flight-to");
  const departureInput = document.querySelector("#flight-departure");
  const returnInput = document.querySelector("#flight-return");
  const returnField = document.querySelector("#return-field");
  const results = document.querySelector("#flight-results");
  const today = new Date().toISOString().slice(0, 10);
  departureInput.min = today;
  returnInput.min = today;
  departureInput.addEventListener("change", () => {
    returnInput.min = departureInput.value || today;
    if (returnInput.value && returnInput.value < returnInput.min) returnInput.value = "";
  });
  document.querySelector(".swap-airports").addEventListener("click", () => {
    [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  });
  document.querySelectorAll(".trip-toggle button").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".trip-toggle button").forEach(item => item.classList.toggle("selected", item === button));
    const oneWay = button.dataset.trip === "oneway";
    returnField.hidden = oneWay;
    returnInput.required = !oneWay;
  }));
  flightForm.addEventListener("submit", event => {
    event.preventDefault();
    const from = fromInput.value.trim();
    const to = toInput.value.trim();
    const cabin = document.querySelector("#flight-cabin").value;
    const fares = cabin === "Economy" ? [48500, 52750, 58900] : [148500, 164000, 179900];
    const airlines = [
      ["PK", "Pakistan International", "09:10", "11:00", "Non-stop", "assets/airlines/pia.png"],
      ["EK", "Emirates", "13:35", "17:20", "1 stop", "assets/airlines/emirates.jpg"],
      ["QR", "Qatar Airways", "20:15", "00:40", "1 stop", "assets/airlines/qatar-airways.jpg"]
    ];
    results.innerHTML = `<div class="flight-searching"><span></span><div><strong>Searching available flights</strong><small>${from} → ${to}</small></div></div>`;
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      results.innerHTML = `<div class="results-heading"><div><span>Available flights</span><strong>${from} <i>→</i> ${to}</strong></div><small>${departureInput.value}${returnInput.required ? ` — ${returnInput.value}` : ""} · ${document.querySelector("#flight-travellers").value}</small></div>` + airlines.map((flight, index) => `<article class="flight-result" style="animation-delay:${index * 80}ms"><div class="flight-airline"><b class="airline-mark airline-logo airline-${flight[0].toLowerCase()}"><img src="${flight[5]}" alt="${flight[1]} official logo" loading="lazy" onerror="this.style.display='none'" /><span>${flight[0]}</span></b><div><strong>${flight[1]}</strong><span>${cabin} · ${document.querySelector("#flight-travellers").value}</span></div></div><div class="flight-time"><strong>${flight[2]}</strong><span>${from}</span></div><div class="flight-path"><span class="flight-meta">${flight[4]}</span><i></i><span class="flight-meta">${to} · ${flight[3]}</span></div><div class="flight-price"><strong>PKR ${fares[index].toLocaleString()}</strong><span class="flight-meta">per traveller</span><button class="select-flight" type="button">Select flight</button></div></article>`).join("");
    }, 850);
  });
}

// Live flight radar powered by OpenSky state vectors.
const trackerSection = document.querySelector("#track-flight");
const trackerForm = document.querySelector("#flight-tracker-form");
const trackerInput = document.querySelector("#tracker-callsign");
const trackerSelected = document.querySelector("#tracker-selected");
const trackerUpdated = document.querySelector("#tracker-updated");
const trackerSource = document.querySelector("#tracker-source");
const trackerLoading = document.querySelector("#tracker-loading");
const trackerRefresh = document.querySelector("#tracker-refresh");
let flightRadarMap;
let trackerAircraftLayer;
let trackerCanvasRenderer;
let trackerLastCallsign = "";
let trackerMoveTimer;
let trackerRequestController;

function trackerEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character]);
}

function formatTrackerTime(timestamp) {
  const date = timestamp ? new Date(timestamp * 1000) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function trackerPlaneIcon(aircraft) {
  const heading = Number(aircraft.heading || 0);
  const callsign = trackerEscape(aircraft.callsign);
  return L.divIcon({
    className: "radar-aircraft-icon",
    html: `<span class="radar-plane" style="--heading:${heading}deg">✈</span><b>${callsign}</b>`,
    iconSize: [74, 42],
    iconAnchor: [20, 20]
  });
}

function showTrackedAircraft(aircraft) {
  if (!trackerSelected || !aircraft) return;
  const altitude = aircraft.onGround ? "On ground" : `${Number(aircraft.altitudeFeet || 0).toLocaleString()} ft`;
  trackerSelected.innerHTML = `
    <p>${aircraft.demo ? "Preview aircraft" : "Live aircraft"} · ${trackerEscape(aircraft.icao24).toUpperCase()}</p>
    <h3>${trackerEscape(aircraft.callsign)}</h3>
    <div class="tracker-stats">
      <span><small>Altitude</small><strong>${altitude}</strong></span>
      <span><small>Speed</small><strong>${Number(aircraft.speedKnots || 0).toLocaleString()} kt</strong></span>
      <span><small>Heading</small><strong>${Math.round(Number(aircraft.heading || 0))}°</strong></span>
      <span><small>Country</small><strong>${trackerEscape(aircraft.country || "Unknown")}</strong></span>
    </div>`;
}

function renderRadarAircraft(aircraft, focusCallsign = "", preserveView = false) {
  trackerAircraftLayer.clearLayers();
  const positions = [];

  aircraft.forEach(item => {
    const marker = L.marker([item.latitude, item.longitude], {
      icon: trackerPlaneIcon(item),
      keyboard: true,
      title: `${item.callsign} — ${item.altitudeFeet || 0} ft`
    }).addTo(trackerAircraftLayer);
    marker.on("click", () => showTrackedAircraft(item));
    positions.push([item.latitude, item.longitude]);
  });

  if (focusCallsign && aircraft.length) {
    showTrackedAircraft(aircraft[0]);
    flightRadarMap.setView([aircraft[0].latitude, aircraft[0].longitude], 8, { animate: true });
  } else if (positions.length && !preserveView) {
    flightRadarMap.fitBounds(positions, { padding: [42, 42], maxZoom: 6, animate: true });
  }
}

function renderWorldwideAircraft(aircraft, focusCallsign = "") {
  if (focusCallsign || flightRadarMap.getZoom() >= 5) {
    renderRadarAircraft(aircraft.slice(0, 260), focusCallsign, !focusCallsign);
    return;
  }

  trackerAircraftLayer.clearLayers();
  aircraft.forEach(item => {
    const marker = L.circleMarker([item.latitude, item.longitude], {
      renderer: trackerCanvasRenderer,
      radius: item.onGround ? 2 : 3.2,
      weight: 1,
      color: item.onGround ? "#71809f" : "#c6d5ff",
      fillColor: item.onGround ? "#65718a" : "#3974ff",
      fillOpacity: item.onGround ? .45 : .88
    }).addTo(trackerAircraftLayer);
    marker.bindTooltip(`${item.callsign} · ${Number(item.altitudeFeet || 0).toLocaleString()} ft`, {
      direction: "top",
      opacity: .9
    });
    marker.on("click", () => showTrackedAircraft(item));
  });
}

async function loadFlightRadar(callsign = "") {
  return loadWorldwideRadar(callsign);
  /*
  if (!flightRadarMap) return;
  trackerLastCallsign = callsign.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  trackerLoading.classList.add("active");
  trackerSource.textContent = trackerLastCallsign ? `Locating ${trackerLastCallsign}…` : "Scanning Pakistan airspace…";

  try {
    const response = await fetch(`/api/flights/live${trackerLastCallsign ? `?callsign=${encodeURIComponent(trackerLastCallsign)}` : ""}`);
    const data = await response.json();
    if (!response.ok || !data.live) throw new Error(data.error || "Live data unavailable");

    renderRadarAircraft(data.aircraft, trackerLastCallsign);
    trackerUpdated.textContent = `Updated ${formatTrackerTime(data.timestamp)}`;
    trackerSource.textContent = data.aircraft.length
      ? `${data.aircraft.length} live aircraft · OpenSky ADS-B`
      : trackerLastCallsign
        ? `No live signal found for ${trackerLastCallsign}`
        : "No aircraft currently visible";

    if (trackerLastCallsign && !data.aircraft.length) {
      trackerSelected.innerHTML = `<p>Callsign not found</p><h3>${trackerEscape(trackerLastCallsign)}</h3><div class="tracker-empty">The aircraft may be outside ADS-B coverage, on the ground, or using another operational callsign.</div>`;
    }
  } catch (error) {
    const fallback = trackerLastCallsign
      ? trackerFallbackAircraft.filter(item => item.callsign === trackerLastCallsign)
      : trackerFallbackAircraft;
    renderRadarAircraft(fallback.length ? fallback : trackerFallbackAircraft, trackerLastCallsign && fallback.length ? trackerLastCallsign : "");
    trackerUpdated.textContent = "Preview mode";
    trackerSource.textContent = "Live network unavailable · showing radar preview";
  } finally {
    trackerLoading.classList.remove("active");
  }
  */
}

async function loadWorldwideRadar(callsign = "") {
  if (!flightRadarMap) return;
  trackerLastCallsign = callsign.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  trackerRequestController?.abort();
  const controller = new AbortController();
  trackerRequestController = controller;
  trackerLoading.classList.add("active");
  trackerSource.textContent = trackerLastCallsign ? `Locating ${trackerLastCallsign}…` : "Scanning visible worldwide airspace…";

  try {
    const params = new URLSearchParams();
    if (trackerLastCallsign) {
      params.set("callsign", trackerLastCallsign);
    } else {
      const bounds = flightRadarMap.getBounds();
      params.set("lamin", Math.max(-90, bounds.getSouth()).toFixed(4));
      params.set("lamax", Math.min(90, bounds.getNorth()).toFixed(4));
      params.set("lomin", Math.max(-180, bounds.getWest()).toFixed(4));
      params.set("lomax", Math.min(180, bounds.getEast()).toFixed(4));
    }

    const response = await fetch(`/api/flights/live?${params}`, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok || !data.live) throw new Error(data.error || "Live data unavailable");

    renderWorldwideAircraft(data.aircraft, trackerLastCallsign);
    trackerUpdated.textContent = `Updated ${formatTrackerTime(data.timestamp)}`;
    trackerSource.textContent = data.aircraft.length
      ? `${data.aircraft.length} real aircraft · OpenSky worldwide ADS-B`
      : trackerLastCallsign
        ? `No live signal found for ${trackerLastCallsign}`
        : "No live aircraft currently visible in this map area";

    if (trackerLastCallsign && !data.aircraft.length) {
      trackerSelected.innerHTML = `<p>Callsign not found</p><h3>${trackerEscape(trackerLastCallsign)}</h3><div class="tracker-empty">The aircraft may be outside ADS-B coverage, on the ground, or using another operational callsign.</div>`;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    trackerAircraftLayer.clearLayers();
    trackerUpdated.textContent = "Live feed unavailable";
    trackerSource.textContent = "OpenSky live network unavailable · no demo aircraft shown";
    trackerSelected.innerHTML = `<p>Real data only</p><h3>Connection paused</h3><div class="tracker-empty">No generated aircraft are displayed. Refresh shortly or configure OpenSky credentials for higher API availability.</div>`;
  } finally {
    if (trackerRequestController === controller) trackerLoading.classList.remove("active");
  }
}

function initializeFlightRadar() {
  if (!trackerSection || flightRadarMap || typeof L === "undefined") {
    if (trackerSection && typeof L === "undefined") {
      trackerSource.textContent = "Map library could not load";
      trackerLoading.classList.remove("active");
    }
    return;
  }

  flightRadarMap = L.map("flight-radar-map", {
    zoomControl: false,
    attributionControl: true,
    minZoom: 2,
    worldCopyJump: true
  }).setView([28, 20], 3);
  L.control.zoom({ position: "bottomright" }).addTo(flightRadarMap);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(flightRadarMap);
  trackerCanvasRenderer = L.canvas({ padding: .5 });
  trackerAircraftLayer = L.layerGroup().addTo(flightRadarMap);
  flightRadarMap.on("moveend", () => {
    if (trackerLastCallsign) return;
    clearTimeout(trackerMoveTimer);
    trackerMoveTimer = setTimeout(() => loadWorldwideRadar(), 650);
  });
  loadWorldwideRadar();
}

if (trackerSection) {
  initializeFlightRadar();
  trackerForm.addEventListener("submit", event => {
    event.preventDefault();
    loadWorldwideRadar(trackerInput.value);
  });
  document.querySelectorAll(".tracker-quick button").forEach(button => button.addEventListener("click", () => {
    trackerInput.value = button.dataset.callsign;
    loadWorldwideRadar(button.dataset.callsign);
  }));
  trackerRefresh.addEventListener("click", () => loadWorldwideRadar(trackerLastCallsign));
  window.setInterval(() => {
    const bounds = trackerSection.getBoundingClientRect();
    if (!document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight) loadWorldwideRadar(trackerLastCallsign);
  }, 30000);
}
