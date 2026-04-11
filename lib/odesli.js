const ODESLI_API = "https://api.song.link/v1-alpha.1/links";

const PLATFORMS = [
  { key: "spotify",      label: "Spotify",        icon: "🎵" },
  { key: "youtubeMusic", label: "YouTube Music",   icon: "▶" },
  { key: "appleMusic",   label: "Apple Music",     icon: "" },
  { key: "soundcloud",   label: "SoundCloud",      icon: "☁" },
  { key: "tidal",        label: "Tidal",           icon: "◎" },
  { key: "deezer",       label: "Deezer",          icon: "≋" },
  { key: "amazonMusic",  label: "Amazon Music",    icon: "♪" },
];

async function getLinksFromUrl(url) {
  const params = new URLSearchParams({ url, userCountry: "US" });
  const res = await fetch(`${ODESLI_API}?${params}`);
  if (!res.ok) throw new Error("Track not found");
  return res.json();
}

async function getLinksFromSearch(artist, title) {
  const query = `${artist} ${title}`;
  const params = new URLSearchParams({
    url: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
    userCountry: "US"
  });
  // Try a direct search via artist+title on Spotify search URL
  // Better approach: use title + artist to find Spotify track first
  const searchRes = await fetch(
    `https://api.song.link/v1-alpha.1/links?` +
    new URLSearchParams({ url: buildSpotifySearchUrl(artist, title), userCountry: "US" })
  );
  if (!searchRes.ok) throw new Error("Track not found");
  return searchRes.json();
}

function buildSpotifySearchUrl(artist, title) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;
}

function extractLinks(data) {
  const links = {};
  for (const platform of PLATFORMS) {
    const entry = data.linksByPlatform?.[platform.key];
    if (entry?.url) {
      links[platform.key] = {
        ...platform,
        url: entry.url
      };
    }
  }
  return links;
}
