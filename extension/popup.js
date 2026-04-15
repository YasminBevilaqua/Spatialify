(function(){
  'use strict';
  
  console.log('[Spatialify Popup] Starting...');
  
  // Elements
  const toggle = document.getElementById('toggle');
  const statusBadge = document.getElementById('status');
  const intensitySlider = document.getElementById('intensity');
  const intensityVal = document.getElementById('intensityVal');
  const presetButtons = document.querySelectorAll('.btn-preset');
  const content = document.getElementById('content');
  const notYoutube = document.getElementById('not-youtube');
  const openOptionsBtn = document.getElementById('openOptionsHeader');
  
  // API compatibility
  const api = (typeof browser !== 'undefined') ? browser : chrome;
  
  // Promisify storage get
  const storageGet = (keys) => new Promise((resolve) => {
    api.storage.local.get(keys, resolve);
  });
  
  const storageSet = (items) => new Promise((resolve) => {
    api.storage.local.set(items, resolve);
  });
  
  // Settings
  let settings = {
    enabled: true,
    width: 65,
    haasDelay: 45,
    phaseInvert: 25,
    gainCompensation: 15,
    preset: 'wide'
  };
  
  const PRESETS = {
    subtle: { width: 35, haasDelay: 25, phaseInvert: 15, gainCompensation: 10, preset: 'subtle' },
    wide:   { width: 65, haasDelay: 45, phaseInvert: 25, gainCompensation: 15, preset: 'wide' },
    ultra:  { width: 90, haasDelay: 70, phaseInvert: 40, gainCompensation: 20, preset: 'ultra' }
  };
  
  // UI Updates
  function updateUI() {
    toggle.classList.toggle('active', settings.enabled);
    statusBadge.textContent = settings.enabled ? 'ON' : 'OFF';
    statusBadge.classList.toggle('on', settings.enabled);
    statusBadge.classList.toggle('off', !settings.enabled);
    
    intensitySlider.value = settings.width;
    updateSliderTrack();
    
    presetButtons.forEach(btn => {
      const preset = btn.dataset.preset;
      btn.classList.toggle('active', preset === settings.preset);
    });
  }
  
  function updateSliderTrack() {
    const val = settings.width;
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff99cc';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#b366ff';
    intensitySlider.style.background = 
      `linear-gradient(to right, ${primary} 0%, ${secondary} ${val}%, rgba(255,255,255,0.1) ${val}%, rgba(255,255,255,0.1) 100%)`;
    intensityVal.textContent = val + '%';
  }
  
  // Check if on YouTube Music
  function isYouTubeMusic(url) {
    return url && url.includes('music.youtube.com');
  }
  
  async function checkYouTubeMusic() {
    try {
      const tabs = await new Promise((resolve) => {
        api.tabs.query({ active: true, currentWindow: true }, resolve);
      });
      const currentUrl = tabs[0]?.url || '';
      
      if (isYouTubeMusic(currentUrl)) {
        content.style.display = 'block';
        notYoutube.style.display = 'none';
        return tabs[0];
      } else {
        content.style.display = 'none';
        notYoutube.style.display = 'block';
        return null;
      }
    } catch (err) {
      console.error('[Spatialify] Error checking tab:', err);
      return null;
    }
  }
  
  // Send settings to content script
  async function sendToContentScript(tabId) {
    return new Promise((resolve, reject) => {
      const msg = { 
        type: 'updateSettings', 
        settings: {
          enabled: settings.enabled,
          width: settings.width,
          haasDelay: settings.haasDelay,
          phaseInvert: settings.phaseInvert,
          gainCompensation: settings.gainCompensation,
          preset: settings.preset
        }
      };
      
      console.log('[Spatialify Popup] Sending to tab', tabId, ':', msg);
      
      api.tabs.sendMessage(tabId, msg, (response) => {
        if (api.runtime.lastError) {
          console.warn('[Spatialify Popup] Send failed:', api.runtime.lastError.message);
          reject(api.runtime.lastError);
        } else {
          console.log('[Spatialify Popup] Response:', response);
          resolve(response);
        }
      });
    });
  }
  
  async function saveAndSend() {
    console.log('[Spatialify Popup] Saving settings:', settings);
    
    // Save to storage
    try {
      await storageSet(settings);
      console.log('[Spatialify Popup] Saved to storage');
    } catch(e) {
      console.error('[Spatialify Popup] Storage save error:', e);
    }
    
    // Send to active tab
    try {
      const tabs = await new Promise((resolve) => {
        api.tabs.query({ active: true, currentWindow: true }, resolve);
      });
      if (tabs[0]?.id && isYouTubeMusic(tabs[0].url)) {
        await sendToContentScript(tabs[0].id);
      }
    } catch (err) {
      console.error('[Spatialify Popup] Failed to send:', err);
    }
  }
  
  // Event Listeners
  toggle.addEventListener('click', () => {
    settings.enabled = !settings.enabled;
    updateUI();
    saveAndSend();
  });
  
  intensitySlider.addEventListener('input', (e) => {
    settings.width = parseInt(e.target.value);
    settings.preset = 'custom';
    updateSliderTrack();
    updateUI();
    saveAndSend();
  });
  
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      const preset = PRESETS[presetName];
      if (preset) {
        Object.assign(settings, preset);
        settings.enabled = true;
        updateUI();
        saveAndSend();
      }
    });
  });
  
  openOptionsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    api.runtime.openOptionsPage();
    window.close();
  });
  
  // Initialize
  async function init() {
    const tab = await checkYouTubeMusic();
    
    // Load settings from storage
    try {
      const stored = await storageGet({
        enabled: true,
        width: 65,
        haasDelay: 45,
        phaseInvert: 25,
        gainCompensation: 15,
        preset: 'wide'
      });
      
      settings = { ...settings, ...stored };
      console.log('[Spatialify Popup] Loaded settings:', settings);
      updateUI();
    } catch(e) {
      console.error('[Spatialify Popup] Storage load error:', e);
      updateUI();
    }
    
    // Ping content script to check connection
    if (tab?.id) {
      try {
        await new Promise((resolve) => {
          api.tabs.sendMessage(tab.id, { type: 'ping' }, (resp) => {
            console.log('[Spatialify Popup] Content script ping:', resp || 'no response');
            resolve(resp);
          });
        });
      } catch (e) {
        console.log('[Spatialify Popup] Content script not responding:', e);
      }
    }
    
    console.log('[Spatialify Popup] Ready');
  }
  
  init();
})();