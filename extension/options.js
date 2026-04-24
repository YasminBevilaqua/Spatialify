// Spatialify Options Page - Focused Stereo Widening
// Corrigido com verificações de null, IDs consistentes e compatibilidade Firefox/Chrome

console.log("[Spatialify Options] Inicializando...");

// ===== COMPATIBILIDADE FIREFOX/CHROME =====
const api = typeof browser !== "undefined" ? browser : chrome;

// ===== PRESETS =====
// Enhanced for REAL room-like spaciousness
const PRESETS = {
  subtle: { width: 45, haas: 30, phase: 15, gain: 10, label: "Sutil" },      // Sala pequena
  wide:   { width: 85, haas: 75, phase: 40, gain: 30, label: "Amplo" },       // Sala grande / concert hall
  ultra:  { width: 100, haas: 90, phase: 55, gain: 40, label: "Ultra" }       // Stadium / arena feel
};

const DEFAULT_SETTINGS = {
  enabled: true,
  width: 65,
  haasDelay: 45,
  phaseInvert: 25,
  gainCompensation: 15,
  preset: "wide"
};

// ===== ESTADO GLOBAL =====
let settings = { ...DEFAULT_SETTINGS };
let customPresets = [];
let vizBars = [], animFrame, tick = 0;

// ===== ELEMENTOS DO DOM =====
let elements = {};

function cacheElements() {
  elements = {
    // Sliders e valores
    widthSlider: document.getElementById("width"),
    widthVal: document.getElementById("widthVal"),
    haasSlider: document.getElementById("haasDelay"),
    haasVal: document.getElementById("haasVal"),
    phaseSlider: document.getElementById("phaseInvert"),
    phaseVal: document.getElementById("phaseVal"),
    gainSlider: document.getElementById("gainCompensation"),
    gainVal: document.getElementById("gainVal"),
    
    // Presets
    presetItems: document.querySelectorAll(".preset-item"),
    customList: document.getElementById("customPresetsList"),
    
    // Botões e inputs
    saveBtn: document.getElementById("savePreset"),
    nameInput: document.getElementById("presetName"),
    resetBtn: document.getElementById("resetBtn"),
    
    // UI
    toast: document.getElementById("toast"),
    toastMsg: document.getElementById("toastMsg"),
    activeLabel: document.getElementById("activePresetName"),
    
    // Canvas
    canvas: document.getElementById("viz")
  };
  
  // Verificação de elementos críticos
  const criticalElements = ['widthSlider', 'haasSlider', 'phaseSlider', 'gainSlider', 
                           'customList', 'saveBtn', 'resetBtn', 'toast'];
  
  for (const key of criticalElements) {
    if (!elements[key]) {
      console.error(`[Spatialify Options] Elemento crítico não encontrado: ${key}`);
      return false;
    }
  }
  
  console.log("[Spatialify Options] Todos os elementos encontrados");
  return true;
}

// ===== STORAGE HELPERS =====
function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      api.storage.local.get(keys, resolve);
    } catch (e) {
      console.error("[Spatialify Options] Erro no storage.get:", e);
      resolve(keys);
    }
  });
}

function storageSet(items) {
  return new Promise((resolve, reject) => {
    try {
      api.storage.local.set(items, () => {
        if (api.runtime.lastError) {
          reject(api.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (e) {
      console.error("[Spatialify Options] Erro no storage.set:", e);
      reject(e);
    }
  });
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  if (!elements.toast || !elements.toastMsg) {
    console.error("[Spatialify Options] Toast elements não encontrados");
    return;
  }
  
  elements.toastMsg.textContent = msg;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (elements.toast) {
      elements.toast.classList.remove("show");
    }
  }, 2400);
}

// ===== VISUALIZADOR =====
function initViz() {
  if (!elements.canvas) {
    console.log("[Spatialify Options] Canvas não encontrado, pulando visualizador");
    return;
  }
  
  const n = 60;
  vizBars = Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const base = 0.2 + Math.pow(Math.sin(x * Math.PI), 1.2) * 0.4;
    return {
      current: base,
      target: base,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.025,
      noiseSeed: Math.random() * 100
    };
  });
}

function updateVizTargets() {
  if (!elements.widthSlider || !vizBars.length) return;
  
  const w = parseInt(elements.widthSlider.value) / 100;
  const h = parseInt(elements.haasSlider.value) / 100;
  const p = parseInt(elements.phaseSlider.value) / 100;
  const g = parseInt(elements.gainSlider.value) / 100;
  
  vizBars.forEach((bar, i) => {
    const x = i / (vizBars.length - 1);
    const shape = Math.pow(Math.sin(x * Math.PI), 1.1);
    const stereoBoost = (Math.abs(x - 0.5) * 2) * w * 0.55;
    const haasBoost = Math.sin(x * Math.PI * 2 + h * 3) * h * 0.25;
    const phaseRipple = Math.cos(x * Math.PI * 3 + p * 2) * p * 0.18;
    const gainLift = g * 0.25;
    
    bar.target = Math.max(0.05, Math.min(0.95,
      0.12 + shape * (0.4 + w * 0.3) + stereoBoost + haasBoost + phaseRipple + gainLift
    ));
  });
}

function drawViz() {
  if (!elements.canvas) return;
  
  const ctx = elements.canvas.getContext('2d');
  if (!ctx) return;
  
  const W = elements.canvas.offsetWidth;
  const H = elements.canvas.offsetHeight;
  
  if (elements.canvas.width !== W || elements.canvas.height !== H) {
    elements.canvas.width = W;
    elements.canvas.height = H;
  }
  
  if (!W || !H) {
    animFrame = requestAnimationFrame(drawViz);
    return;
  }
  
  ctx.clearRect(0, 0, W, H);
  tick += 0.01;
  
  const bw = W / vizBars.length;
  
  vizBars.forEach((bar, i) => {
    const noise = Math.sin(tick * bar.speed * 60 + bar.phase) * 0.06 +
                  Math.sin(tick * bar.speed * 37 + bar.noiseSeed) * 0.035;
    
    bar.current += (bar.target + noise - bar.current) * 0.06;
    bar.current = Math.max(0.03, Math.min(0.97, bar.current));
    
    const bh = bar.current * H;
    const x = i * bw;
    const t = i / (vizBars.length - 1);
    
    const r = Math.round(255 - t * 30);
    const g = Math.round(153 - t * 50);
    const b = Math.round(204 + t * 51);
    const alpha = 0.55 + bar.current * 0.40;
    
    const grad = ctx.createLinearGradient(0, H - bh, 0, H);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.55})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0.03)`);
    
    const gap = 1.5;
    const bwI = bw - gap;
    const rx = 2;
    const bx = x + gap / 2;
    const by = H - bh;
    
    ctx.beginPath();
    ctx.moveTo(bx + rx, by);
    ctx.lineTo(bx + bwI - rx, by);
    ctx.quadraticCurveTo(bx + bwI, by, bx + bwI, by + rx);
    ctx.lineTo(bx + bwI, H);
    ctx.lineTo(bx, H);
    ctx.lineTo(bx, by + rx);
    ctx.quadraticCurveTo(bx, by, bx + rx, by);
    
    ctx.fillStyle = grad;
    ctx.fill();
  });
  
  animFrame = requestAnimationFrame(drawViz);
}

// ===== UI UPDATES =====
function updateSliderBackgrounds() {
  const sliders = [
    { el: elements.widthSlider, val: elements.widthVal },
    { el: elements.haasSlider, val: elements.haasVal },
    { el: elements.phaseSlider, val: elements.phaseVal },
    { el: elements.gainSlider, val: elements.gainVal }
  ];
  
  sliders.forEach(({ el, val }) => {
    if (!el) return;
    const p = el.value;
    el.style.background = `linear-gradient(to right, #ff99cc 0%, #b366ff ${p}%, rgba(255,255,255,0.08) ${p}%, rgba(255,255,255,0.08) 100%)`;
    if (val) {
      val.textContent = p + "%";
    }
  });
}

function updateUI() {
  // Atualizar valores dos sliders
  if (elements.widthSlider) elements.widthSlider.value = settings.width;
  if (elements.haasSlider) elements.haasSlider.value = settings.haasDelay;
  if (elements.phaseSlider) elements.phaseSlider.value = settings.phaseInvert;
  if (elements.gainSlider) elements.gainSlider.value = settings.gainCompensation;
  
  // Atualizar backgrounds e textos
  updateSliderBackgrounds();
  
  // Atualizar preset ativo
  if (elements.presetItems) {
    elements.presetItems.forEach(item => {
      const presetKey = item.dataset.preset;
      item.classList.toggle("active", presetKey === settings.preset);
    });
  }
  
  // Atualizar label ativo
  if (elements.activeLabel) {
    const preset = PRESETS[settings.preset];
    elements.activeLabel.textContent = preset ? preset.label : "Custom";
  }
  
  // Atualizar visualizador
  updateVizTargets();
}

function applyPreset(key) {
  const v = PRESETS[key];
  if (!v) {
    console.error("[Spatialify Options] Preset não encontrado:", key);
    return;
  }
  
  settings.width = v.width;
  settings.haasDelay = v.haas;
  settings.phaseInvert = v.phase;
  settings.gainCompensation = v.gain;
  settings.preset = key;
  
  updateUI();
  saveSettings();
  showToast(`Preset "${v.label}" aplicado`);
}

// ===== CUSTOM PRESETS =====
function renderCustomPresets() {
  if (!elements.customList) {
    console.error("[Spatialify Options] customPresetsList não encontrado");
    return;
  }
  
  if (!customPresets || !customPresets.length) {
    elements.customList.innerHTML = '<div class="c-empty">— nenhum salvo —</div>';
    return;
  }
  
  elements.customList.innerHTML = customPresets.map((p, i) => `
    <div class="c-item" data-index="${i}">
      <span class="c-item-name">${p.name}</span>
      <button class="c-del delete-preset" data-index="${i}">
        <svg><use href="#i-trash"/></svg>
      </button>
    </div>
  `).join("");
  
  // Event listeners para carregar
  elements.customList.querySelectorAll(".c-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".delete-preset")) return;
      
      const index = parseInt(item.dataset.index);
      const p = customPresets[index];
      
      if (!p) return;
      
      settings.width = p.width;
      settings.haasDelay = p.haas;
      settings.phaseInvert = p.phase;
      settings.gainCompensation = p.gain;
      settings.preset = "custom";
      
      updateUI();
      saveSettings();
      
      // Remover active dos presets padrão
      if (elements.presetItems) {
        elements.presetItems.forEach(r => r.classList.remove("active"));
      }
      if (elements.activeLabel) {
        elements.activeLabel.textContent = p.name;
      }
      
      showToast(`"${p.name}" carregado`);
    });
  });
  
  // Event listeners para deletar
  elements.customList.querySelectorAll(".delete-preset").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      
      const index = parseInt(btn.dataset.index);
      const name = customPresets[index]?.name || "Preset";
      
      customPresets.splice(index, 1);
      
      // Salvar no localStorage
      try {
        localStorage.setItem("spatialify_custom_presets", JSON.stringify(customPresets));
      } catch (e) {
        console.error("[Spatialify Options] Erro ao salvar custom presets:", e);
      }
      
      renderCustomPresets();
      showToast(`"${name}" removido`);
    });
  });
}

function saveCustomPreset() {
  if (!elements.nameInput || !elements.saveBtn) return;
  
  const name = elements.nameInput.value.trim();
  if (!name) {
    showToast("Digite um nome");
    return;
  }
  
  const newPreset = {
    name,
    width: settings.width,
    haas: settings.haasDelay,
    phase: settings.phaseInvert,
    gain: settings.gainCompensation
  };
  
  customPresets.push(newPreset);
  
  // Salvar no localStorage
  try {
    localStorage.setItem("spatialify_custom_presets", JSON.stringify(customPresets));
  } catch (e) {
    console.error("[Spatialify Options] Erro ao salvar no localStorage:", e);
  }
  
  elements.nameInput.value = "";
  renderCustomPresets();
  showToast(`"${name}" salvo`);
}

// ===== SAVE/LOAD =====
async function saveSettings() {
  try {
    await storageSet({
      enabled: settings.enabled,
      width: settings.width,
      haasDelay: settings.haasDelay,
      phaseInvert: settings.phaseInvert,
      gainCompensation: settings.gainCompensation,
      preset: settings.preset
    });
    console.log("[Spatialify Options] Configurações salvas");
  } catch (e) {
    console.error("[Spatialify Options] Erro ao salvar:", e);
  }
  
  // Também salvar no localStorage como backup
  try {
    localStorage.setItem("spatialify_settings", JSON.stringify(settings));
  } catch (e) {
    console.error("[Spatialify Options] Erro no localStorage:", e);
  }
}

async function loadSettings() {
  try {
    // Tentar carregar do chrome.storage
    const stored = await storageGet({
      enabled: true,
      width: 65,
      haasDelay: 45,
      phaseInvert: 25,
      gainCompensation: 15,
      preset: "wide"
    });
    
    settings = { ...DEFAULT_SETTINGS, ...stored };
    console.log("[Spatialify Options] Configurações carregadas do storage");
  } catch (e) {
    console.error("[Spatialify Options] Erro ao carregar do storage:", e);
    
    // Fallback para localStorage
    try {
      const local = localStorage.getItem("spatialify_settings");
      if (local) {
        const parsed = JSON.parse(local);
        settings = { ...DEFAULT_SETTINGS, ...parsed };
        console.log("[Spatialify Options] Configurações carregadas do localStorage");
      }
    } catch (e2) {
      console.error("[Spatialify Options] Erro no localStorage fallback:", e2);
    }
  }
  
  // Carregar custom presets
  try {
    const localCustom = localStorage.getItem("spatialify_custom_presets");
    if (localCustom) {
      customPresets = JSON.parse(localCustom);
      console.log("[Spatialify Options] Custom presets carregados:", customPresets.length);
    }
  } catch (e) {
    console.error("[Spatialify Options] Erro ao carregar custom presets:", e);
    customPresets = [];
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Sliders
  if (elements.widthSlider) {
    elements.widthSlider.addEventListener("input", (e) => {
      settings.width = parseInt(e.target.value);
      settings.preset = "custom";
      updateSliderBackgrounds();
      updateVizTargets();
      saveSettings();
      if (elements.activeLabel) elements.activeLabel.textContent = "Custom";
      if (elements.presetItems) {
        elements.presetItems.forEach(r => r.classList.remove("active"));
      }
    });
  }
  
  if (elements.haasSlider) {
    elements.haasSlider.addEventListener("input", (e) => {
      settings.haasDelay = parseInt(e.target.value);
      settings.preset = "custom";
      updateSliderBackgrounds();
      updateVizTargets();
      saveSettings();
      if (elements.activeLabel) elements.activeLabel.textContent = "Custom";
      if (elements.presetItems) {
        elements.presetItems.forEach(r => r.classList.remove("active"));
      }
    });
  }
  
  if (elements.phaseSlider) {
    elements.phaseSlider.addEventListener("input", (e) => {
      settings.phaseInvert = parseInt(e.target.value);
      settings.preset = "custom";
      updateSliderBackgrounds();
      updateVizTargets();
      saveSettings();
      if (elements.activeLabel) elements.activeLabel.textContent = "Custom";
      if (elements.presetItems) {
        elements.presetItems.forEach(r => r.classList.remove("active"));
      }
    });
  }
  
  if (elements.gainSlider) {
    elements.gainSlider.addEventListener("input", (e) => {
      settings.gainCompensation = parseInt(e.target.value);
      settings.preset = "custom";
      updateSliderBackgrounds();
      updateVizTargets();
      saveSettings();
      if (elements.activeLabel) elements.activeLabel.textContent = "Custom";
      if (elements.presetItems) {
        elements.presetItems.forEach(r => r.classList.remove("active"));
      }
    });
  }
  
  // Presets
  if (elements.presetItems) {
    elements.presetItems.forEach(item => {
      item.addEventListener("click", () => {
        const preset = item.dataset.preset;
        if (preset && PRESETS[preset]) {
          applyPreset(preset);
        }
      });
    });
  }
  
  // Save preset
  if (elements.saveBtn) {
    elements.saveBtn.addEventListener("click", saveCustomPreset);
  }
  
  // Reset
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener("click", () => {
      settings = { ...DEFAULT_SETTINGS };
      updateUI();
      saveSettings();
      showToast("Padrões restaurados");
    });
  }
}

// ===== INICIALIZAÇÃO =====
async function init() {
  console.log("[Spatialify Options] DOM carregado, inicializando...");
  
  // Cachear elementos
  if (!cacheElements()) {
    console.error("[Spatialify Options] Falha ao encontrar elementos críticos");
    return;
  }
  
  // Carregar configurações
  await loadSettings();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Renderizar UI
  updateUI();
  renderCustomPresets();
  
  // Iniciar visualizador
  initViz();
  if (elements.canvas) {
    drawViz();
  }
  
  console.log("[Spatialify Options] Inicialização completa");
}

// Aguardar DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
