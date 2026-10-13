const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const PORT = Number(process.env.PORT) || 4173;
const root = __dirname;
const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const voicePort = Number(process.env.VOICE_PORT) || 8765;
let voiceProcess;
const travelSessions = new Map();
const liveFlightCache = new Map();
let openSkyAccessToken = null;
let openSkyTokenExpiresAt = 0;

function normalizeCity(value) {
  const city = String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  const aliases = {
    lahore: "Lahore", lahor: "Lahore", lahora: "Lahore", lahwr: "Lahore",
    karachi: "Karachi", karatshi: "Karachi", kratchi: "Karachi", kratytchi: "Karachi", krachi: "Karachi",
    islamabad: "Islamabad", islambad: "Islamabad", rawalpindi: "Rawalpindi",
    multan: "Multan", peshawar: "Peshawar", quetta: "Quetta", faisalabad: "Faisalabad",
    london: "London", landon: "London", landan: "London", langdan: "London", langdhan: "London", lundan: "London", lndn: "London", lndin: "London", indin: "London", landin: "London",
    dubai: "Dubai", dubayi: "Dubai", paris: "Paris", manchester: "Manchester", birmingham: "Birmingham",
    jeddah: "Jeddah", makkah: "Makkah", madinah: "Madinah", doha: "Doha", istanbul: "Istanbul",
    toronto: "Toronto", newyork: "New York", singapore: "Singapore", bangkok: "Bangkok"
  };
  return aliases[city] || (city ? city[0].toUpperCase() + city.slice(1) : "");
}

function cityToUrdu(city) {
  const names = {
    Lahore: "لاہور", Karachi: "کراچی", Islamabad: "اسلام آباد", Rawalpindi: "راولپنڈی",
    Multan: "ملتان", Peshawar: "پشاور", Quetta: "کوئٹہ", Faisalabad: "فیصل آباد",
    London: "لندن", Dubai: "دبئی", Paris: "پیرس", Manchester: "مانچسٹر",
    Birmingham: "برمنگھم", Jeddah: "جدہ", Makkah: "مکہ", Madinah: "مدینہ",
    Doha: "دوحہ", Istanbul: "استنبول", Toronto: "ٹورنٹو", "New York": "نیو یارک",
    Singapore: "سنگاپور", Bangkok: "بینکاک"
  };
  return names[city] || city;
}

function routeFromMessage(message) {
  const cleaned = message.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");
  const knownCities = new Set("lahore lahor lahora lahwr karachi karatshi kratchi kratytchi krachi islamabad islambad rawalpindi multan peshawar quetta faisalabad london landon landan langdan langdhan lundan lndn lndin indin landin dubai dubayi paris manchester birmingham jeddah makkah madinah doha istanbul toronto newyork singapore bangkok".split(" "));
  const cities = words.map((word, index) => ({ city: normalizeCity(word), raw: word, index }))
    .filter(item => knownCities.has(item.raw));
  if (cities.length >= 2) return { from: cities[0].city, to: cities[1].city };
  const match = cleaned.match(/(?:main|mai|mein|mi)?\s*([a-z]+)\s+(?:se|sa|say|sye|sri)\s+([a-z]+)\s+(?:jana|jaana|janna|janan|jan|ja)/);
  if (!match) return null;
  return { from: normalizeCity(match[1]), to: normalizeCity(match[2]) };
}

function isRecognizedTravelDate(message) {
  const text = String(message || "").toLowerCase().trim();
  const dayOnly = /^(?:date\s*)?([1-9]|[12]\d|3[01])(?:st|nd|rd|th)?$/;
  const month = "january|february|march|april|may|june|july|august|september|october|november|december";
  return dayOnly.test(text)
    || new RegExp(`\\b([1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(?:${month})(?:\\s+20\\d{2})?\\b`).test(text)
    || new RegExp(`\\b(?:${month})\\s+([1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?(?:\\s+20\\d{2})?\\b`).test(text);
}

function startVoiceServer() {
  const python = path.join(root, ".venv", "Scripts", "python.exe");
  if (!fs.existsSync(python)) return console.warn("Local voice environment is missing. Run the setup first.");
  voiceProcess = spawn(python, [path.join(root, "voice_server.py")], { cwd: root, stdio: "inherit", env: { ...process.env, VOICE_PORT: String(voicePort) } });
  voiceProcess.on("exit", (code) => { if (code) console.error(`Local voice server stopped with code ${code}`); });
}

async function readBody(request, limit = 15 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function getOpenSkyAccessToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (openSkyAccessToken && Date.now() < openSkyTokenExpiresAt) return openSkyAccessToken;

  const tokenResponse = await fetch("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!tokenResponse.ok) throw new Error(`OpenSky authentication returned ${tokenResponse.status}`);
  const tokenData = await tokenResponse.json();
  openSkyAccessToken = tokenData.access_token;
  openSkyTokenExpiresAt = Date.now() + Math.max(60, Number(tokenData.expires_in || 300) - 60) * 1000;
  return openSkyAccessToken;
}

async function handleLiveFlights(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const callsign = String(requestUrl.searchParams.get("callsign") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const parseCoordinate = (name, fallback, min, max) => {
    const value = Number(requestUrl.searchParams.get(name));
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  let lamin = parseCoordinate("lamin", 20, -90, 90);
  let lamax = parseCoordinate("lamax", 55, -90, 90);
  let lomin = parseCoordinate("lomin", -15, -180, 180);
  let lomax = parseCoordinate("lomax", 65, -180, 180);
  if (lamin > lamax) [lamin, lamax] = [lamax, lamin];
  if (lomin > lomax) [lomin, lomax] = [lomax, lomin];
  const bboxKey = [lamin, lamax, lomin, lomax].map(value => value.toFixed(1)).join(":");
  const cacheKey = callsign ? `callsign:${callsign}` : `bbox:${bboxKey}`;
  const cached = liveFlightCache.get(cacheKey);

  if (cached && Date.now() - cached.savedAt < 12000) {
    return sendJson(response, 200, { ...cached.payload, cached: true });
  }

  const params = new URLSearchParams();
  if (!callsign) {
    params.set("lamin", lamin.toFixed(4));
    params.set("lamax", lamax.toFixed(4));
    params.set("lomin", lomin.toFixed(4));
    params.set("lomax", lomax.toFixed(4));
  }

  try {
    const accessToken = await getOpenSkyAccessToken();
    const upstream = await fetch(`https://opensky-network.org/api/states/all?${params}`, {
      headers: {
        "User-Agent": "Connect-A-Flight/1.0",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) throw new Error(`OpenSky returned ${upstream.status}`);
    const data = await upstream.json();
    let states = Array.isArray(data.states) ? data.states : [];

    if (callsign) {
      states = states.filter(state => String(state[1] || "").trim().toUpperCase().replace(/\s/g, "") === callsign);
    }

    const aircraft = states
      .filter(state => Number.isFinite(state[5]) && Number.isFinite(state[6]))
      .sort((a, b) => Number(b[4] || 0) - Number(a[4] || 0))
      .slice(0, callsign ? 8 : 700)
      .map(state => ({
        icao24: state[0],
        callsign: String(state[1] || "").trim() || String(state[0] || "").toUpperCase(),
        country: state[2] || "Unknown",
        lastContact: state[4] || null,
        longitude: state[5],
        latitude: state[6],
        altitudeFeet: Math.round(Number(state[13] ?? state[7] ?? 0) * 3.28084),
        onGround: Boolean(state[8]),
        speedKnots: Math.round(Number(state[9] || 0) * 1.94384),
        heading: Math.round(Number(state[10] || 0)),
        verticalRateFpm: Math.round(Number(state[11] || 0) * 196.85),
        squawk: state[14] || null
      }));

    const payload = {
      live: true,
      source: "OpenSky Network",
      timestamp: data.time || Math.floor(Date.now() / 1000),
      query: callsign || null,
      bounds: callsign ? null : { lamin, lamax, lomin, lomax },
      aircraft
    };
    liveFlightCache.set(cacheKey, { savedAt: Date.now(), payload });
    if (liveFlightCache.size > 120) {
      const oldestKey = [...liveFlightCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)[0]?.[0];
      if (oldestKey) liveFlightCache.delete(oldestKey);
    }
    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 502, {
      live: false,
      error: "Live radar is temporarily unavailable",
      detail: error.message
    });
  }
}

async function handleAssistant(request, response) {
  const raw = (await readBody(request, 64 * 1024)).toString("utf8");
  let message;
  let sessionId;
  try {
    const payload = JSON.parse(raw);
    message = payload.message?.trim();
    sessionId = String(payload.sessionId || "default").slice(0, 100);
  } catch { return sendJson(response, 400, { error: "Invalid request" }); }
  if (!message || message.length > 1000) return sendJson(response, 400, { error: "Message is required" });

  const normalizedMessage = message.toLowerCase();
  const compactMessage = normalizedMessage.replace(/[^a-z]/g, "");
  const isGreeting = /\b(ass?alam|aslam|salam|slam|hello|hi)\b/.test(normalizedMessage)
    || (/(?:aslam|asslam|salam|slam|asma)/.test(compactMessage) && /(?:alaikum|alikum|laikum|likum|alekum)/.test(compactMessage));
  if (isGreeting) {
    travelSessions.set(sessionId, { stage: "route" });
    return sendJson(response, 200, {
      roman_urdu: "Walaikum assalam! Aap kahan se kahan jana chahtay hain?",
      speech_roman: "Walaikum assalam, aap kahan se kahan jana chahtay hain?",
      speech_urdu: "وعلیکم السلام، آپ کہاں سے کہاں جانا چاہتے ہیں؟",
      tts_mixed: "وعلیکم السلام! میں بالکل ٹھیک ہوں۔ آپ بتائیں، میں آپ کی travel planning میں کیا help کروں؟"
    });
  }

  const session = travelSessions.get(sessionId) || { stage: "route" };
  const route = routeFromMessage(normalizedMessage);
  if (route) {
    travelSessions.set(sessionId, { stage: "tripType", from: route.from, to: route.to });
    return sendJson(response, 200, {
      roman_urdu: "One-way ya round-trip flight chahiye?",
      speech_urdu: "صرف جانے کی یا آنے جانے کی فلائٹ چاہیے؟",
      expectedInput: "tripType",
      booking: { from: route.from, to: route.to }
    });
  }
  if (session.stage === "tripType") {
    const isOneWay = /\b(one[ -]?way|single|sirf\s+ja+na|only\s+ja+na|bas\s+ja+na|aik taraf|ek taraf|1 taraf)\b/.test(normalizedMessage)
      || /^\s*ja+na\s+(?:ki|hai)\s*$/.test(normalizedMessage)
      || /(?:oneway|sirfjana|onlyjana|basjana)/.test(compactMessage);
    const isReturn = !isOneWay && (/\b(return|round|wapasi|wapsi|dono|a+na\s+ja+na|anna\s+ja+na|ane\s+jane|aane\s+jaane|anye\s+janye|aany\s+jany)\b/.test(normalizedMessage)
      || /(?:roundtrip|aanajana|annajana|anajana|aanejane|anyejanye|aanyjany|anyejanyeki|anyeianiki|anyeianiki|anyeyaniki)/.test(compactMessage));
    if (!isReturn && !isOneWay) return sendJson(response, 200, { roman_urdu: "One-way ya round-trip flight chahiye?", speech_urdu: "صرف جانے کی یا آنے جانے کی فلائٹ چاہیے؟", expectedInput: "tripType" });
    travelSessions.set(sessionId, { ...session, stage: "departureDate", tripType: isReturn ? "return" : "one-way" });
    return sendJson(response, 200, { roman_urdu: "Aap kis tareekh ko safar karna chahte hain?", speech_urdu: "آپ کس تاریخ کو سفر کرنا چاہتے ہیں؟", expectedInput: "date", booking: { from: session.from, to: session.to, tripType: isReturn ? "round" : "oneway" } });
  }
  if (session.stage === "departureDate") {
    if (!isRecognizedTravelDate(message)) {
      return sendJson(response, 200, { roman_urdu: "Aap kis tareekh ko safar karna chahte hain? Misal: 25 July.", speech_urdu: "آپ کس تاریخ کو سفر کرنا چاہتے ہیں؟ مثال کے طور پر، پچیس جولائی۔", expectedInput: "date" });
    }
    const nextStage = session.tripType === "return" ? "returnDate" : "travellers";
    travelSessions.set(sessionId, { ...session, stage: nextStage, departureDate: message });
    return sendJson(response, 200, { roman_urdu: session.tripType === "return" ? "Wapsi kis tareekh ko hai?" : "Kitne log safar karenge?", speech_urdu: session.tripType === "return" ? "واپسی کس تاریخ کو ہے؟" : "کتنے لوگ سفر کریں گے؟", expectedInput: session.tripType === "return" ? "date" : "travellers", booking: { from: session.from, to: session.to, tripType: session.tripType === "return" ? "round" : "oneway", departure: message } });
  }
  if (session.stage === "returnDate") {
    if (!isRecognizedTravelDate(message)) {
      return sendJson(response, 200, { roman_urdu: "Wapsi kis tareekh ko hai? Misal: 30 July.", speech_urdu: "واپسی کس تاریخ کو ہے؟ مثال کے طور پر، تیس جولائی۔", expectedInput: "date" });
    }
    travelSessions.set(sessionId, { ...session, stage: "travellers", returnDate: message });
    return sendJson(response, 200, { roman_urdu: "Kitne log safar karenge?", speech_urdu: "کتنے لوگ سفر کریں گے؟", expectedInput: "travellers", booking: { from: session.from, to: session.to, tripType: "round", departure: session.departureDate, return: message } });
  }
  if (session.stage === "travellers") {
    const normalizedTravellerMessage = normalizedMessage.replace(/\b(?:paanch|panch|panchh|pantch|paantch|punch|punsh)\b/g, "5");
    const travellerMatch = normalizedTravellerMessage.match(/\b([1-9]|1\d|20)\b/);
    if (!travellerMatch) return sendJson(response, 200, { roman_urdu: "Kitne log safar karenge? Sirf number batayein, jaise 2.", speech_urdu: "کتنے لوگ سفر کریں گے؟ صرف تعداد بتائیں، جیسے دو۔", expectedInput: "travellers" });
    const travellerCount = travellerMatch[1];
    travelSessions.set(sessionId, { ...session, stage: "cabin", travellers: travellerCount });
    return sendJson(response, 200, { roman_urdu: "Kaunsi class mein safar karna hai — Economy ya Business?", speech_urdu: "کون سی کلاس میں سفر کرنا ہے، اکانومی یا بزنس؟", expectedInput: "cabin", booking: { from: session.from, to: session.to, tripType: session.tripType === "return" ? "round" : "oneway", departure: session.departureDate, return: session.returnDate, travellers: travellerCount } });
  }
  if (session.stage === "cabin") {
    const cabin = /\bbusiness\b/.test(normalizedMessage) ? "Business" : /\beconomy\b/.test(normalizedMessage) ? "Economy" : null;
    if (!cabin) return sendJson(response, 200, { roman_urdu: "Economy ya Business? Sirf ek class batayein.", speech_urdu: "اکانومی یا بزنس؟ صرف ایک کلاس بتائیں۔", expectedInput: "cabin" });
    travelSessions.set(sessionId, { ...session, stage: "complete", cabin });
    return sendJson(response, 200, { roman_urdu: "Done! Aap ki flight details complete hain. Flights screen par aa gayi hain.", speech_urdu: "ہو گیا۔ آپ کی فلائٹ کی معلومات مکمل ہیں۔ فلائٹس سکرین پر آ گئی ہیں۔", searchReady: true, booking: { from: session.from, to: session.to, tripType: session.tripType === "return" ? "round" : "oneway", departure: session.departureDate, return: session.returnDate, travellers: session.travellers, cabin } });
  }
  if (/\bdubai\b/.test(normalizedMessage) && /\b(best|season|time|weather|mausam)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Dubai ke liye November se March best season hai. Weather pleasant hota hai, jabke June se September bohat zyada garmi hoti hai.",
      tts_mixed: "Dubai کے لیے November سے March best season ہے۔ Weather خوشگوار ہوتا ہے، جبکہ June سے September بہت زیادہ گرمی ہوتی ہے۔"
    });
  }
  if (/\bparis\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Paris romance, art aur history ke liye famous hai. April se June ya September se October visit karna best rehta hai.",
      tts_mixed: "Paris romance، art اور history کے لیے مشہور ہے۔ April سے June یا September سے October visit کرنا best رہتا ہے۔"
    });
  }
  if (/\b(swiss|switzerland|alps)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Swiss Alps hiking ke liye June se September aur skiing ke liye December se March best hain.",
      tts_mixed: "Swiss Alps hiking کے لیے June سے September اور skiing کے لیے December سے March best ہیں۔"
    });
  }
  if (/\bbali\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Bali ke liye April se October dry season best hai. Beaches, temples aur nature bohat khoobsurat hain.",
      tts_mixed: "Bali کے لیے April سے October dry season best ہے۔ Beaches، temples اور nature بہت خوبصورت ہیں۔"
    });
  }
  if (/\b(flight|flights|ticket|tickets|airline)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Ji, flight options compare karne ke liye departure city, destination aur travel dates bata dein.",
      tts_mixed: "جی، flight options compare کرنے کے لیے departure city، destination اور travel dates بتا دیں۔"
    });
  }
  if (/\b(hotel|hotels|stay|resort)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Bilkul, hotel suggest karne ke liye destination, dates aur per-night budget bata dein.",
      tts_mixed: "بالکل، hotel suggest کرنے کے لیے destination، dates اور per-night budget بتا دیں۔"
    });
  }
  if (/\b(visa|passport)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Visa requirements nationality aur destination par depend karti hain. Dono countries ke naam bata dein.",
      tts_mixed: "Visa requirements nationality اور destination پر depend کرتی ہیں۔ دونوں countries کے نام بتا دیں۔"
    });
  }
  if (/\b(budget|cost|price|cheap|sasta|kharcha)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Main budget plan bana sakti hoon. Destination, travellers ki tadaad aur total budget bata dein.",
      tts_mixed: "میں budget plan بنا سکتی ہوں۔ Destination، travellers کی تعداد اور total budget بتا دیں۔"
    });
  }
  if (/\b(weather|mausam|season|time|kab)\b/.test(normalizedMessage)) {
    return sendJson(response, 200, {
      roman_urdu: "Best travel time destination par depend karta hai. Aap kis city ya country jana chahte hain?",
      tts_mixed: "Best travel time destination پر depend کرتا ہے۔ آپ کس city یا country جانا چاہتے ہیں؟"
    });
  }

  return sendJson(response, 200, {
    roman_urdu: "Aap kahan se kahan jana chahtay hain?",
    speech_urdu: "آپ کہاں سے کہاں جانا چاہتے ہیں؟"
  });

  const systemPrompt = `You are a knowledgeable, friendly female Pakistani travel assistant. Answer the user's actual message directly and accurately in casual Pakistani Roman Urdu using Latin letters only. Never use Urdu script, never invent a destination, and never repeat the question. Keep the useful answer under 30 words.`;
  try {
    const apiResponse = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "qwen3:4b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        format: {
          type: "object",
          properties: {
            roman_urdu: { type: "string", description: "Pakistani Roman Urdu in Latin letters only" }
          },
          required: ["roman_urdu"]
        },
        stream: false,
        think: false,
        keep_alive: "30m",
        options: { temperature: 0.1, num_ctx: 1024, num_predict: 180 }
      }),
      signal: AbortSignal.timeout(120000)
    });
    const result = await apiResponse.json();
    if (!apiResponse.ok) return sendJson(response, 502, { error: result.error || "Local Ollama request failed" });
    const answer = JSON.parse(result.message.content);
    const rawRoman = String(answer.roman_urdu || "").trim();
    answer.roman_urdu = rawRoman.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
    if (!answer.roman_urdu || answer.roman_urdu.length < 4) {
      const romanResponse = await fetch(`http://127.0.0.1:${voicePort}/romanize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawRoman })
      });
      const romanized = await romanResponse.json();
      answer.roman_urdu = String(romanized.roman_text || "").replace(/[^\x20-\x7e]/g, "").trim();
    }
    if (!answer.roman_urdu) throw new Error("The model returned an incomplete answer");

    const speechResponse = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        messages: [
          { role: "system", content: "You are an Urdu-script transliterator. Convert every Roman Urdu word into Pakistani Urdu Arabic script without changing meaning. The tts_mixed value MUST contain Urdu-script characters. Keep genuine English travel terms in Latin letters. Return JSON only." },
          { role: "user", content: answer.roman_urdu }
        ],
        format: { type: "object", properties: { tts_mixed: { type: "string" } }, required: ["tts_mixed"] },
        stream: false,
        keep_alive: "30m",
        options: { temperature: 0, num_ctx: 512, num_predict: 120 }
      }),
      signal: AbortSignal.timeout(60000)
    });
    const speechResult = await speechResponse.json();
    answer.tts_mixed = JSON.parse(speechResult.message.content).tts_mixed;
    const pronunciationTerms = {
      "دبئی": "Dubai", "پیرس": "Paris", "بالی": "Bali", "لندن": "London",
      "ہوٹل": "hotel", "ہوٹلز": "hotels", "فلائٹ": "flight", "فلائٹس": "flights",
      "ائیرپورٹ": "airport", "ایئرپورٹ": "airport", "ویزا": "visa", "پاسپورٹ": "passport",
      "بکنگ": "booking", "ویدر": "weather", "سیزن": "season", "ونٹر": "winter",
      "سمر": "summer", "ٹریول": "travel", "ٹرپ": "trip", "ٹور": "tour", "ریزورٹ": "resort",
      "نومبر": "November", "دسمبر": "December", "جنوری": "January", "فروری": "February",
      "مارچ": "March", "اپریل": "April", "مئی": "May", "جون": "June", "جولائی": "July",
      "اگست": "August", "ستمبر": "September", "اکتوبر": "October"
    };
    for (const [urdu, english] of Object.entries(pronunciationTerms)) answer.tts_mixed = answer.tts_mixed.replaceAll(urdu, english);
    sendJson(response, 200, answer);
  } catch (error) {
    console.error("Assistant error:", error.message);
    sendJson(response, 503, { error: "Local Ollama is not running or the model is not installed" });
  }
}

async function proxyVoice(request, response, endpoint) {
  try {
    const body = await readBody(request);
    const voiceResponse = await fetch(`http://127.0.0.1:${voicePort}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers["content-type"] || "application/octet-stream",
        "X-Voice-Context": request.headers["x-voice-context"] || "general"
      },
      body
    });
    const data = Buffer.from(await voiceResponse.arrayBuffer());
    response.writeHead(voiceResponse.status, { "Content-Type": voiceResponse.headers.get("content-type") || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    sendJson(response, 503, { error: "Local voice service is still loading or unavailable" });
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/assistant") return handleAssistant(request, response);
  if (request.method === "POST" && request.url === "/api/transcribe") return proxyVoice(request, response, "/transcribe");
  if (request.method === "POST" && request.url === "/api/speak") return proxyVoice(request, response, "/speak");
  if (request.method === "GET" && request.url.startsWith("/api/flights/live")) return handleLiveFlights(request, response);
  const pathname = decodeURIComponent(request.url.split("?")[0]).replace(/\/+$/, "") || "/";
  const pageRoutes = {
    "/": "/index.html",
    "/flights": "/flights.html",
    "/tracker": "/tracker.html",
    "/destinations": "/destinations.html",
    "/about": "/about.html",
    "/about-us": "/about.html"
  };
  const urlPath = pageRoutes[pathname] || pathname;
  const filePath = path.resolve(root, `.${urlPath}`);
  if (!filePath.startsWith(root)) return sendJson(response, 403, { error: "Forbidden" });
  fs.readFile(filePath, (error, data) => {
     if (error) {   console.error("Failed to serve:", filePath, error.code);   response.writeHead(404);   return response.end("Not found"); }
    const extension = path.extname(filePath).toLowerCase();
    const longCache = /\.(?:jpg|jpeg|png|webp|svg|ico)$/i.test(extension);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": longCache ? "public, max-age=31536000, immutable" : "no-cache"
    });
    response.end(data);
  });
});

startVoiceServer();
server.listen(PORT, () => console.log(`Connect A Flight: http://localhost:${PORT}`));
process.on("exit", () => voiceProcess?.kill());
process.on("SIGINT", () => { voiceProcess?.kill(); process.exit(0); });
