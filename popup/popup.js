let AUDD_API_KEY       = "";
let ANTHROPIC_API_KEY  = "";
let ELEVENLABS_API_KEY = "";

const ODESLI_API         = "https://api.song.link/v1-alpha.1/links";
const ANTHROPIC_API      = "https://api.anthropic.com/v1/messages";
const ELEVENLABS_STT_API = "https://api.elevenlabs.io/v1/speech-to-text";

const PLATFORMS = [
  { key: "spotify",      label: "Spotify",       icon: "🎵" },
  { key: "youtubeMusic", label: "YouTube Music",  icon: "▶" },
  { key: "appleMusic",   label: "Apple Music",    icon: "" },
  { key: "soundcloud",   label: "SoundCloud",     icon: "☁" },
  { key: "tidal",        label: "Tidal",          icon: "◎" },
  { key: "deezer",       label: "Deezer",         icon: "≋" },
  { key: "amazonMusic",  label: "Amazon Music",   icon: "♪" },
];

const views = {
  setup:     document.getElementById("view-setup"),
  home:      document.getElementById("view-home"),
  listening: document.getElementById("view-listening"),
  results:   document.getElementById("view-results"),
  error:     document.getElementById("view-error"),
  denied:    document.getElementById("view-denied"),
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

// Load API keys from storage, then initialise the UI
chrome.storage.local.get(["elevenLabsKey", "anthropicKey", "auddKey"], (keys) => {
  ELEVENLABS_API_KEY = keys.elevenLabsKey || "";
  ANTHROPIC_API_KEY  = keys.anthropicKey  || "";
  AUDD_API_KEY       = keys.auddKey       || "";

  if (!ELEVENLABS_API_KEY || !ANTHROPIC_API_KEY) {
    showView("setup");
  } else {
    if (!AUDD_API_KEY) {
      document.getElementById("btn-listen").classList.add("hidden");
      document.getElementById("listen-hint").classList.add("hidden");
      document.getElementById("listen-divider").classList.add("hidden");
    }
    showView("home");
  }
});

// Buttons
document.getElementById("btn-open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById("btn-listen").addEventListener("click", () => startListening("audd"));
document.getElementById("btn-speak").addEventListener("click", () => startListening("scribe"));
document.getElementById("btn-find").addEventListener("click", () => {
  const input = document.getElementById("ai-input").value.trim();
  if (input) identifyWithAI(input);
});
document.getElementById("btn-cancel").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" });
  showView("home");
});
document.getElementById("btn-retry").addEventListener("click", () => showView("home"));
document.getElementById("btn-retry-error").addEventListener("click", () => showView("home"));
document.getElementById("btn-copy-url").addEventListener("click", (e) => {
  const url = `chrome://settings/content/siteDetails?site=chrome-extension://${chrome.runtime.id}`;
  navigator.clipboard.writeText(url);
  e.target.textContent = "Copied!";
  setTimeout(() => { e.target.textContent = "Copy Link"; }, 2000);
});

function startListening(mode) {
  showView("listening");
  document.getElementById("listen-status").textContent = "Listening...";
  chrome.runtime.sendMessage({ type: "START_RECORDING", mode });
}

// Messages from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AUDIO_READY") {
    const blob = dataURLtoBlob(msg.dataUrl);
    if (msg.mode === "scribe") {
      document.getElementById("listen-status").textContent = "Transcribing...";
      transcribeAndIdentify(blob);
    } else {
      document.getElementById("listen-status").textContent = "Identifying...";
      identifyTrack(blob);
    }
  } else if (msg.type === "MIC_DENIED") {
    const url = `chrome://settings/content/siteDetails?site=chrome-extension://${chrome.runtime.id}`;
    document.getElementById("perm-url-text").textContent = url;
    showView("denied");
  } else if (msg.type === "MIC_ERROR") {
    showError(msg.message || "Could not access microphone. Please try again.");
  }
});

window.addEventListener("beforeunload", () => {
  chrome.runtime.sendMessage({ type: "CANCEL_RECORDING" });
});

function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function transcribeAndIdentify(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech.webm");
    formData.append("model_id", "scribe_v1");

    const res = await fetch(ELEVENLABS_STT_API, {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    const data = await res.json();

    const spokenWords = (data.words || [])
      .filter(w => w.type === "word")
      .map(w => w.text)
      .join(" ")
      .trim();

    if (!spokenWords) {
      showError("We didn't hear you speaking. Try speaking clearly near your microphone.");
      return;
    }

    await identifyWithAI(spokenWords);

  } catch (err) {
    console.error("Transcription error:", err);
    showError("Transcription failed. Please try again.");
  }
}

async function identifyTrack(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "clip.webm");
    formData.append("api_token", AUDD_API_KEY);
    formData.append("return", "spotify,apple_music,deezer");

    const res = await fetch("https://api.audd.io/", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.status !== "success" || !data.result) {
      showError("Could not identify the track. Try again.");
      return;
    }

    const { title, artist, spotify, apple_music, deezer } = data.result;
    const trackUrl = spotify?.external_urls?.spotify
      || apple_music?.url
      || (deezer?.id ? `https://www.deezer.com/track/${deezer.id}` : null);

    if (!trackUrl) {
      showError("Track identified but no streaming link found.");
      return;
    }

    await fetchAndShowLinks(title, artist, trackUrl);

  } catch {
    showError("Something went wrong. Please try again.");
  }
}

async function identifyWithAI(description) {
  showView("listening");
  document.getElementById("listen-status").textContent = "Asking AI...";

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Identify the song from this description or lyrics. Reply with ONLY this format: TITLE|||ARTIST\nNo other text, no punctuation around it.\n\nInput: ${description}`,
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text || !text.includes("|||")) {
      showError("Couldn't identify the song. Try adding more details.");
      return;
    }

    const [title, artist] = text.split("|||").map(s => s.trim());

    document.getElementById("listen-status").textContent = "Finding links...";

    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&media=music&limit=1`
    );
    const itunesData = await itunesRes.json();

    if (!itunesData.results?.length) {
      showError(`Found: "${title}" by ${artist}, but no streaming link.`);
      return;
    }

    const trackUrl = itunesData.results[0].trackViewUrl;
    await fetchAndShowLinks(title, artist, trackUrl);

  } catch {
    showError("Something went wrong. Please try again.");
  }
}

async function fetchAndShowLinks(title, artist, trackUrl) {
  try {
    const params = new URLSearchParams({ url: trackUrl, userCountry: "US" });
    const res = await fetch(`${ODESLI_API}?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.code || `HTTP ${res.status}`);
    }
    const data = await res.json();

    document.getElementById("track-title").textContent = title;
    document.getElementById("track-artist").textContent = artist;

    const linksContainer = document.getElementById("results-links");
    linksContainer.innerHTML = "";

    for (const p of PLATFORMS) {
      const entry = data.linksByPlatform?.[p.key];
      if (!entry?.url) continue;

      const a = document.createElement("a");
      a.href = entry.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "result-link";
      a.innerHTML = `<span class="result-icon">${p.icon}</span> ${p.label}`;
      linksContainer.appendChild(a);
    }

    if (linksContainer.children.length === 0) {
      showError("No platform links found for this track.");
      return;
    }

    showView("results");

  } catch (err) {
    showError(`Could not fetch platform links${err.message ? `: ${err.message}` : "."}`);
  }
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  showView("error");
}
