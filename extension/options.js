// Spatialify Options Page - Focused Stereo Widening

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
let customPresets = {};

const sliders = {
  width: { el: null, val: null },
  haasDelay: { el: null, val: null },
  phaseInvert: { el: null, val: null },
  gainCompensation: { el: null, val: null },
};

function init() {
  sliders.width.el = document.getElementById("width");
  sliders.width.val = document.getElementById("widthVal");
  sliders.haasDelay.el = document.getElementById("haasDelay");
  sliders.haasDelay.val = document.getElementById("haasVal");
  sliders.phaseInvert.el = document.getElementById("phaseInvert");
  sliders.phaseInvert.val = document.getElementById("phaseVal");
  sliders.gainCompensation.el = document.getElementById("gainCompensation");
  sliders.gainCompensation.val = document.getElementById("gainVal");

  // Load settings
  browser.storage.local.get({ ...DEFAULT_SETTINGS, customPresets: {} }).then((stored) => {
    settings = { ...DEFAULT_SETTINGS, ...stored };
    customPresets = stored.customPresets || {};
    delete settings.customPresets;
    updateUI();
    renderCustomPresets();
  });

  // Slider events
  Object.keys(sliders).forEach((key) => {
    sliders[key].el.addEventListener("input", (e) => {
      settings[key] = parseInt(e.target.value);
      settings.preset = "none";
      updateUI();
      saveAndSend();
    });
  });

  // Preset cards
  document.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.dataset.preset;
      if (PRESETS[name]) {
        Object.assign(settings, PRESETS[name]);
        settings.preset = name;
        settings.enabled = true;
        updateUI();
        saveAndSend();
        showToast("Preset '" + card.querySelector(".name").textContent + "' aplicado!");
      }
    });
  });

  // Save custom preset
  document.getElementById("savePreset").addEventListener("click", () => {
    const name = document.getElementById("presetName").value.trim();
    if (!name) return;
    customPresets[name] = {
      width: settings.width,
      haasDelay: settings.haasDelay,
      phaseInvert: settings.phaseInvert,
      gainCompensation: settings.gainCompensation,
    };
    browser.storage.local.set({ customPresets });
    document.getElementById("presetName").value = "";
    renderCustomPresets();
    showToast("Preset '" + name + "' salvo!");
  });

  // Reset
  document.getElementById("resetBtn").addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    updateUI();
    saveAndSend();
    showToast("Configurações resetadas!");
  });
}

function updateUI() {
  Object.keys(sliders).forEach((key) => {
    sliders[key].el.value = settings[key];
    sliders[key].val.textContent = settings[key] + "%";
  });

  document.querySelectorAll(".preset-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.preset === settings.preset);
  });
}

function renderCustomPresets() {
  const container = document.getElementById("customPresets");
  const names = Object.keys(customPresets);
  if (!names.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = names.map((name) => `
    <div class="custom-preset-item">
      <span style="cursor:pointer" data-load="${name}">🎵 ${name}</span>
      <button data-delete="${name}">✕</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-load]").forEach((el) => {
    el.addEventListener("click", () => {
      const p = customPresets[el.dataset.load];
      if (p) {
        Object.assign(settings, p);
        settings.preset = "custom";
        updateUI();
        saveAndSend();
        showToast("Preset '" + el.dataset.load + "' aplicado!");
      }
    });
  });

  container.querySelectorAll("[data-delete]").forEach((el) => {
    el.addEventListener("click", () => {
      delete customPresets[el.dataset.delete];
      browser.storage.local.set({ customPresets });
      renderCustomPresets();
      showToast("Preset removido");
    });
  });
}

function saveAndSend() {
  browser.storage.local.set(settings);
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]?.id) {
      browser.tabs.sendMessage(tabs[0].id, { type: "updateSettings", settings }).catch(() => {});
    }
  });
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

document.addEventListener("DOMContentLoaded", init);
