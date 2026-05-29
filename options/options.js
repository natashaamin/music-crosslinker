const elevenLabsInput = document.getElementById("elevenlabs-key");
const anthropicInput  = document.getElementById("anthropic-key");
const auddInput       = document.getElementById("audd-key");
const saveBtn         = document.getElementById("btn-save");
const saveStatus      = document.getElementById("save-status");

// Load saved keys into fields
chrome.storage.local.get(["elevenLabsKey", "anthropicKey", "auddKey"], (keys) => {
  if (keys.elevenLabsKey) elevenLabsInput.value = keys.elevenLabsKey;
  if (keys.anthropicKey)  anthropicInput.value  = keys.anthropicKey;
  if (keys.auddKey)       auddInput.value       = keys.auddKey;
});

saveBtn.addEventListener("click", () => {
  const elevenLabsKey = elevenLabsInput.value.trim();
  const anthropicKey  = anthropicInput.value.trim();
  const auddKey       = auddInput.value.trim();

  if (!elevenLabsKey || !anthropicKey) {
    saveStatus.textContent = "ElevenLabs and Anthropic keys are required.";
    saveStatus.className = "error";
    return;
  }

  chrome.storage.local.set({ elevenLabsKey, anthropicKey, auddKey }, () => {
    saveStatus.textContent = "Saved!";
    saveStatus.className = "success";
    setTimeout(() => { saveStatus.textContent = ""; }, 2000);
  });
});
