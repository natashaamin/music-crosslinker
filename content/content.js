// Detect which platform we're on and extract the current track URL
function getCurrentTrackUrl() {
  const url = window.location.href;

  if (url.includes("open.spotify.com/track/")) return url;
  if (url.includes("music.youtube.com/watch")) return url;
  if (url.includes("music.apple.com") && url.includes("/album/")) return url;
  if (url.includes("soundcloud.com") && url.split("/").length >= 5) return url;
  if (url.includes("tidal.com/track/")) return url;
  if (url.includes("deezer.com/track/")) return url;
  if (url.includes("music.amazon.com") && url.includes("/tracks/")) return url;

  return null;
}

function createWidget() {
  if (document.getElementById("mcl-widget")) return;

  const widget = document.createElement("div");
  widget.id = "mcl-widget";
  widget.innerHTML = `
    <button id="mcl-btn" title="Find this track on other platforms">🎵</button>
    <div id="mcl-panel" class="hidden">
      <div id="mcl-header">Find this track on...</div>
      <div id="mcl-links">
        <div id="mcl-loading">Fetching links...</div>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  document.getElementById("mcl-btn").addEventListener("click", togglePanel);
}

async function togglePanel() {
  const panel = document.getElementById("mcl-panel");
  const isHidden = panel.classList.contains("hidden");

  if (!isHidden) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  await fetchAndRenderLinks();
}

async function fetchAndRenderLinks() {
  const linksContainer = document.getElementById("mcl-links");
  linksContainer.innerHTML = `<div id="mcl-loading">Fetching links...</div>`;

  const trackUrl = getCurrentTrackUrl();
  if (!trackUrl) {
    linksContainer.innerHTML = `<div class="mcl-error">No track detected on this page.</div>`;
    return;
  }

  try {
    const params = new URLSearchParams({ url: trackUrl, userCountry: "US" });
    const res = await fetch(`https://api.song.link/v1-alpha.1/links?${params}`);
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();

    const platforms = [
      { key: "spotify",      label: "Spotify",       icon: "🎵" },
      { key: "youtubeMusic", label: "YouTube Music",  icon: "▶" },
      { key: "appleMusic",   label: "Apple Music",    icon: "" },
      { key: "soundcloud",   label: "SoundCloud",     icon: "☁" },
      { key: "tidal",        label: "Tidal",          icon: "◎" },
      { key: "deezer",       label: "Deezer",         icon: "≋" },
      { key: "amazonMusic",  label: "Amazon Music",   icon: "♪" },
    ];

    const currentHost = window.location.hostname;

    linksContainer.innerHTML = "";
    let found = false;

    for (const p of platforms) {
      const entry = data.linksByPlatform?.[p.key];
      if (!entry?.url) continue;

      // Skip the platform we're already on
      if (entry.url.includes(currentHost)) continue;

      found = true;
      const a = document.createElement("a");
      a.href = entry.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "mcl-link";
      a.innerHTML = `<span class="mcl-icon">${p.icon}</span> ${p.label}`;
      linksContainer.appendChild(a);
    }

    if (!found) {
      linksContainer.innerHTML = `<div class="mcl-error">No other platforms found.</div>`;
    }

  } catch (e) {
    linksContainer.innerHTML = `<div class="mcl-error">Could not find track links.</div>`;
  }
}

// Init: only show widget if we're on a track page
function init() {
  if (getCurrentTrackUrl()) {
    createWidget();
  }

  // Re-check on URL change (SPA navigation)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const existing = document.getElementById("mcl-widget");
      if (existing) existing.remove();
      if (getCurrentTrackUrl()) createWidget();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

init();
