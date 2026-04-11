const AUDD_API_KEY = "YOUR_AUDD_API_KEY"; // Replace with your key from audd.io
const ODESLI_API  = "https://api.song.link/v1-alpha.1/links";

const PLATFORMS = [
  { key: "spotify",      label: "Spotify",       icon: "🎵" },
  { key: "youtubeMusic", label: "YouTube Music",  icon: "▶" },
  { key: "appleMusic",   label: "Apple Music",    icon: "" },
  { key: "soundcloud",   label: "SoundCloud",     icon: "☁" },
  { key: "tidal",        label: "Tidal",          icon: "◎" },
  { key: "deezer",       label: "Deezer",         icon: "≋" },
  { key: "amazonMusic",  label: "Amazon Music",   icon: "♪" },
];

// Views
const views = {
  default:    document.getElementById("view-default"),
  listening:  document.getElementById("view-listening"),
  results:    document.getElementById("view-results"),
  error:      document.getElementById("view-error"),
  permission: document.getElementById("view-permission"),
  denied:     document.getElementById("view-denied"),
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

// Buttons
document.getElementById("btn-listen").addEventListener("click", checkMicAndListen);
document.getElementById("btn-grant").addEventListener("click", requestMicPermission);
document.getElementById("btn-cancel").addEventListener("click", () => showView("default"));
document.getElementById("btn-retry").addEventListener("click", checkMicAndListen);
document.getElementById("btn-retry-error").addEventListener("click", checkMicAndListen);

async function checkMicAndListen() {
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    if (result.state === "granted") {
      startListening();
    } else if (result.state === "denied") {
      showView("denied");
    } else {
      // "prompt" state — show permission request screen
      showView("permission");
    }
  } catch {
    // permissions API not supported, try directly
    startListening();
  }
}

async function requestMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop()); // stop immediately, just needed for permission
    startListening();
  } catch (err) {
    if (err.name === "NotAllowedError") {
      showView("denied");
    } else {
      showError("Could not access microphone. Please try again.");
    }
  }
}

let mediaRecorder = null;
let audioChunks = [];

async function startListening() {
  showView("listening");
  document.getElementById("listen-status").textContent = "Listening...";
  audioChunks = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      document.getElementById("listen-status").textContent = "Identifying...";
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      await identifyTrack(blob);
    };

    mediaRecorder.start();

    // Record for 8 seconds
    setTimeout(() => {
      if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    }, 8000);

  } catch (err) {
    if (err.name === "NotAllowedError") {
      showView("denied");
    } else {
      showError("Could not access microphone. Please try again.");
    }
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

    const { title, artist, spotify } = data.result;

    // Use Spotify URL if available, otherwise search by name
    const trackUrl = spotify?.external_urls?.spotify
      || `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;

    await fetchAndShowLinks(title, artist, trackUrl);

  } catch (err) {
    showError("Something went wrong. Please try again.");
  }
}

async function fetchAndShowLinks(title, artist, trackUrl) {
  try {
    const params = new URLSearchParams({ url: trackUrl, userCountry: "US" });
    const res = await fetch(`${ODESLI_API}?${params}`);
    if (!res.ok) throw new Error();
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

    showView("results");

  } catch {
    showError("Could not fetch platform links.");
  }
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  showView("error");
}
