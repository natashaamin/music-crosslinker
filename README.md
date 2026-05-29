# Music Crosslinker

A Chrome extension to find any song across all major music platforms — with Shazam-like mic detection and AI-powered song identification from descriptions or lyrics.

## Features

- **Auto-detect mode** — visit any track on Spotify, YouTube Music, Apple Music, SoundCloud, Tidal, Deezer, or Amazon Music and instantly see links to that same track on all other platforms
- **Listen & Identify** — let the extension listen via your mic for 8 seconds, identify the song using audio fingerprinting, and get links across all platforms
- **Speak a description** — describe a song out loud (lyrics, vibe, anything you remember), and Claude AI identifies it and finds the links
- **Type a description** — type lyrics or a description and let Claude AI identify the song

## Supported Platforms

- Spotify
- YouTube Music
- YouTube
- Apple Music
- SoundCloud
- Tidal
- Deezer
- Amazon Music

## Setup

### 1. Get your API keys

The extension uses an options page to manage API keys — no code editing required.

| Key | Required | Where to get it |
|-----|----------|-----------------|
| [Anthropic](https://console.anthropic.com) | **Required** | Powers AI song identification from text/voice descriptions |
| [ElevenLabs](https://elevenlabs.io) | **Required** | Powers voice transcription (Speak mode) |
| [AudD](https://audd.io) | Optional | Powers audio fingerprinting (Listen & Identify mode) |

> Without an AudD key, the "Listen & Identify" button is hidden. The other modes still work with just Anthropic + ElevenLabs.

### 2. Load the extension in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load Unpacked**
4. Select this project folder

### 3. Enter your API keys

1. Click the extension icon
2. Click **Open Settings** (shown on first launch if keys are missing)
3. Paste your API keys and save

## How it works

### Auto-detect
`content.js` runs on music platform pages, detects the current track URL, and calls the [Odesli API](https://odesli.co) to fetch links for all other platforms. A floating button appears on track pages — click it to open the link panel.

### Listen & Identify
Records 8 seconds of audio via the microphone (using Chrome's Offscreen Documents API), sends it to [AudD](https://audd.io) for audio fingerprinting, then passes the identified track to Odesli for cross-platform links.

### Speak / Type a description
Audio is recorded and transcribed via [ElevenLabs Scribe](https://elevenlabs.io), or you type directly. The text is sent to [Claude](https://anthropic.com) which returns the song title and artist. The result is looked up via the iTunes Search API to get a canonical track URL, then passed to Odesli for all platform links.

## APIs Used

| API | Purpose | Cost |
|-----|---------|------|
| [Odesli (song.link)](https://odesli.co/api/) | Cross-platform track links | Free |
| [AudD](https://audd.io) | Audio fingerprinting / music recognition | Free tier available |
| [ElevenLabs Scribe](https://elevenlabs.io/speech-to-text) | Voice-to-text transcription | Free tier available |
| [Anthropic Claude](https://anthropic.com) | AI song identification from descriptions | Pay-per-use |
| [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI) | Track URL lookup | Free |

API keys are stored locally in your browser via `chrome.storage.local` and are never sent anywhere except the respective APIs.
