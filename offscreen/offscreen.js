let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'DO_RECORD') await startRecording();
  if (msg.type === 'DO_STOP') stopRecording();
});

async function startRecording() {
  audioChunks = [];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({ type: 'AUDIO_DATA', dataUrl: reader.result });
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    setTimeout(() => stopRecording(), 8000);

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      chrome.runtime.sendMessage({ type: 'MIC_DENIED' });
    } else {
      chrome.runtime.sendMessage({ type: 'MIC_ERROR', message: 'Could not access microphone.' });
    }
  }
}

function stopRecording() {
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
}
