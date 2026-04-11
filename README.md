# Music Crosslinker

A Chrome extension to find any song across all major music platforms — with Shazam-like mic detection.

## Features

- **Auto-detect mode** — visit any track on Spotify, YouTube Music, Apple Music, SoundCloud, Tidal, Deezer, or Amazon Music and instantly see links to that same track on all other platforms
- **Listen mode** — click the extension icon anywhere, let it listen via your mic, identify the song, and get links across all platforms

## Supported Platforms

- Spotify
- YouTube Music
- Apple Music
- SoundCloud
- Tidal
- Deezer
- Amazon Music

## Setup

### 1. Get your AudD API key
- Sign up at [audd.io](https://audd.io)
- Copy your API key
- Paste it into `popup/popup.js` replacing `YOUR_AUDD_API_KEY`

### 2. Load the extension in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load Unpacked**
4. Select this project folder

### 3. Add icons
Place PNG icons in the `icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## How it works

- **Auto-detect**: `content.js` runs on music platform pages, detects the track URL, and calls the [Odesli API](https://odesli.co) to get links for all platforms
- **Listen mode**: Records 8 seconds of audio via mic, sends to [AudD API](https://audd.io) for identification, then passes the result to Odesli for platform links

## APIs Used

| API | Purpose | Cost |
|-----|---------|------|
| [Odesli (song.link)](https://odesli.co/api/) | Cross-platform track links | Free |
| [AudD](https://audd.io) | Music recognition from audio | Free tier available |
