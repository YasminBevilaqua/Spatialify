// Spatialify Popup - Focused Stereo Widening

const PRESETS = {
  subtle:  { width: 40, haasDelay: 25, phaseInvert: 15, gainCompensation: 10 },
  wide:    { width: 70, haasDelay: 50, phaseInvert: 30, gainCompensation: 15 },
  ultra:   { width: 90, haasDelay: 75, phaseInvert: 45, gainCompensation: 20 },
};

const DEFAULT_SETTINGS = {
  enabled: true,
  width: 65,
  haasDelay: 45,
  phaseInvert: 25,
  gainCompensation: 15,
  preset: "none",
};

let settings = { ...DEFAULT_SETTINGS };

// DOM elements
const toggleEl = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const intensityEl = document.getElementById("intensity");
const intensityVal = document.getElementById("intensityVal");
const presetBtns = document.querySelectorAll(".btn-preset");
const contentEl = document.getElementById("content");
const notYoutubeEl = document.getElementById("not-youtube");

/**
 * Update UI based on current settings
 */
function updateUI() {
  if (settings.enabled) {
    toggleEl.classList.add("active");
    statusEl.textContent = "ON";
    statusEl.className = "status on";
  } else {
    toggleEl.classList.remove("active");
    statusEl.textContent = "OFF";
    statusEl.className = "status off";
  }
  
  // Use width as the main intensity slider
  intensityEl.value = settings.width;
  intensityVal.textContent = settings.width + "%";

  presetBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === settings.preset);
  });
}

/**
 * Save settings and send to content script
 */
async function saveAndSend() {
  await browser.storage.local.set(settings);
  
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id && isYouTubeMusic(tabs[0].url)) {
      await browser.tabs.sendMessage(tabs[0].id, { 
        type: "updateSettings", 
        settings 
      });
    }
  } catch (err) {
    console.debug("[Spatialify] Could not send to content script:", err);
  }
}

/**
 * Check if URL is YouTube Music
 */
function isYouTubeMusic(url) {
  return url && url.includes("music.youtube.com");
}

/**
 * Check if current tab is YouTube Music
 */
async function checkYouTubeMusic() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0]?.url || "";
    
    if (isYouTubeMusic(currentUrl)) {
      contentEl.style.display = "block";
      notYoutubeEl.style.display = "none";
      
      try {
        await browser.tabs.sendMessage(tabs[0].id, { type: "ping" });
      } catch (e) {
        console.debug("[Spatialify] Content script not ready yet");
      }
    } else {
      contentEl.style.display = "none";
      notYoutubeEl.style.display = "block";
    }
  } catch (err) {
    console.error("[Spatialify] Error checking tab:", err);
  }
}

// Event Listeners

// Toggle
toggleEl.addEventListener("click", () => {
  settings.enabled = !settings.enabled;
  updateUI();
  saveAndSend();
});

// Width slider (labeled as intensity in UI)
intensityEl.addEventListener("input", (e) => {
  settings.width = parseInt(e.target.value);
  settings.preset = "none";
  intensityVal.textContent = settings.width + "%";
  updateUI();
  saveAndSend();
});

// Preset buttons
presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.preset;
    if (PRESETS[name]) {
      Object.assign(settings, PRESETS[name]);
      settings.preset = name;
      settings.enabled = true;
      updateUI();
      saveAndSend();
    }
  });
});

// Open options page
document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
  window.close();
});

// Initialize
async function init() {
  await checkYouTubeMusic();
  
  const stored = await browser.storage.local.get(DEFAULT_SETTINGS);
  settings = { ...DEFAULT_SETTINGS, ...stored };
  updateUI();
}

init();
