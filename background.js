const OFFSCREEN_PATH = 'offscreen/offscreen.html';

let currentMode = "audd";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_RECORDING') {
    currentMode = msg.mode || "audd";
    setupAndRecord().catch(err => {
      chrome.runtime.sendMessage({ type: 'MIC_ERROR', message: err.message });
    });
    return true;
  }
  if (msg.type === 'CANCEL_RECORDING') {
    chrome.runtime.sendMessage({ type: 'DO_STOP' });
  }
  if (msg.type === 'AUDIO_DATA') {
    chrome.runtime.sendMessage({ type: 'AUDIO_READY', dataUrl: msg.dataUrl, mode: currentMode });
  }
});

async function setupAndRecord() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });
  if (existing.length > 0) {
    await chrome.offscreen.closeDocument();
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification: 'Recording microphone audio for music identification',
  });

  await new Promise(r => setTimeout(r, 50));
  chrome.runtime.sendMessage({ type: 'DO_RECORD' });
}
