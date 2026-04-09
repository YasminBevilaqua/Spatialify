// Spatialify - Content Script
// Focused stereo widening for YouTube Music using Web Audio API
// NO reverb, NO 3D effects - just clean stereo expansion

(function () {
  "use strict";

  // Singleton check - prevent duplicate initialization
  if (window.__spatialifyInitialized) {
    console.log("[Spatialify] Already initialized, skipping.");
    return;
  }
  window.__spatialifyInitialized = true;

  // Audio graph nodes - focused on stereo widening only
  let audioContext = null;
  let sourceNode = null;
  let splitter = null;
  let merger = null;
  let leftDelay = null;
  let rightDelay = null;
  let leftGain = null;
  let rightGain = null;
  let leftPhase = null;
  let rightPhase = null;
  let bypassGain = null;
  let processedGain = null;
  
  // State
  let initialized = false;
  let currentMediaElement = null;
  let retryCount = 0;
  const MAX_RETRIES = 50;

  // Settings focused on stereo widening
  const DEFAULT_SETTINGS = {
    enabled: true,
    width: 65,           // Stereo width (0-100)
    haasDelay: 45,      // Haas effect intensity (0-100)
    phaseInvert: 25,    // Phase inversion amount (0-100)
    gainCompensation: 15, // Gain boost to compensate for phase cancellation (0-100)
  };

  let settings = { ...DEFAULT_SETTINGS };

  /**
   * Resume audio context if suspended (browser autoplay policy)
   */
  async function resumeAudioContext() {
    if (audioContext && audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn("[Spatialify] Could not resume audio context:", e);
      }
    }
  }

  /**
   * Initialize audio processing pipeline
   * Focused stereo widening: delays + gain differences + subtle phase
   */
  function initAudio(mediaEl) {
    if (initialized) {
      console.log("[Spatialify] Already initialized.");
      return true;
    }
    
    if (!mediaEl) {
      console.warn("[Spatialify] No media element provided.");
      return false;
    }

    if (mediaEl._spatialifyConnected) {
      console.log("[Spatialify] Media element already connected.");
      return true;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();

      // Create media element source
      sourceNode = audioContext.createMediaElementSource(mediaEl);
      mediaEl._spatialifyConnected = true;
      currentMediaElement = mediaEl;

      // Create stereo processing chain
      splitter = audioContext.createChannelSplitter(2);
      merger = audioContext.createChannelMerger(2);
      
      // Delay nodes for Haas effect (max delay 50ms)
      leftDelay = audioContext.createDelay(0.05);
      rightDelay = audioContext.createDelay(0.05);
      
      // Gain nodes for channel balance
      leftGain = audioContext.createGain();
      rightGain = audioContext.createGain();
      
      // Phase adjustment (using gain with negative values for phase inversion)
      leftPhase = audioContext.createGain();
      rightPhase = audioContext.createGain();

      // Bypass and processed paths
      bypassGain = audioContext.createGain();
      processedGain = audioContext.createGain();

      // AUDIO ROUTING - Clean stereo widening chain:
      // 
      // source -> splitter 
      //   -> [left: delay -> gain -> phase] -> merger (ch0)
      //   -> [right: delay -> gain -> phase] -> merger (ch1)
      // merger -> processedGain -> destination
      // source -> bypassGain -> destination (for clean bypass)

      // Split source to L/R
      sourceNode.connect(splitter);
      sourceNode.connect(bypassGain);

      // LEFT CHANNEL CHAIN
      // Small delay for depth (0-8ms)
      splitter.connect(leftDelay, 0);
      // Gain for width control
      leftDelay.connect(leftGain);
      // Phase adjustment node
      leftGain.connect(leftPhase);
      // To merger channel 0
      leftPhase.connect(merger, 0, 0);

      // RIGHT CHANNEL CHAIN
      // Slightly larger delay for Haas effect (0-15ms)
      splitter.connect(rightDelay, 1);
      // Different gain for width
      rightDelay.connect(rightGain);
      // Phase adjustment (with possible inversion)
      rightGain.connect(rightPhase);
      // To merger channel 1
      rightPhase.connect(merger, 0, 1);

      // Connect merged output
      merger.connect(processedGain);
      processedGain.connect(audioContext.destination);

      // Bypass path
      bypassGain.connect(audioContext.destination);

      // Handle autoplay policy
      mediaEl.addEventListener("play", resumeAudioContext);
      mediaEl.addEventListener("click", resumeAudioContext);

      initialized = true;
      applySettings();
      
      console.log("[Spatialify] Stereo widening pipeline initialized.");
      return true;
    } catch (e) {
      console.error("[Spatialify] Initialization error:", e);
      return false;
    }
  }

  /**
   * Apply stereo widening settings
   * Focus on: delays, gain differences, and phase
   */
  function applySettings() {
    if (!initialized || !audioContext) return;

    const t = audioContext.currentTime;
    const rampTime = 0.03; // 30ms ramp for smooth transitions

    // Enable/disable processing
    if (settings.enabled) {
      processedGain.gain.setTargetAtTime(1, t, rampTime);
      bypassGain.gain.setTargetAtTime(0, t, rampTime);
    } else {
      processedGain.gain.setTargetAtTime(0, t, rampTime);
      bypassGain.gain.setTargetAtTime(1, t, rampTime);
      return;
    }

    const widthFactor = settings.width / 100;
    const haasFactor = settings.haasDelay / 100;
    const phaseFactor = settings.phaseInvert / 100;
    const gainFactor = settings.gainCompensation / 100;

    // DELAYS - Haas effect
    // Left: 0-8ms delay based on width
    // Right: 0-15ms delay (slightly more for Haas effect)
    const leftDelayTime = 0.008 * widthFactor;   // 0-8ms
    const rightDelayTime = 0.008 + (0.007 * haasFactor); // 8-15ms
    
    leftDelay.delayTime.setTargetAtTime(leftDelayTime, t, rampTime);
    rightDelay.delayTime.setTargetAtTime(rightDelayTime, t, rampTime);

    // GAINS - Create width through channel difference
    // As width increases, channels diverge slightly
    const baseGain = 1.0;
    const leftChannelGain = baseGain + (widthFactor * 0.15);
    const rightChannelGain = baseGain - (widthFactor * 0.05);
    
    leftGain.gain.setTargetAtTime(leftChannelGain, t, rampTime);
    rightGain.gain.setTargetAtTime(rightChannelGain, t, rampTime);

    // PHASE - Subtle phase inversion for widening
    // Left stays positive, right gets partial phase inversion
    // Phase inversion range: 1.0 (no invert) to -0.4 (partial invert)
    const leftPhaseValue = 1.0;
    const rightPhaseValue = 1.0 - (phaseFactor * 1.4); // 1.0 down to -0.4
    
    leftPhase.gain.setTargetAtTime(leftPhaseValue, t, rampTime);
    rightPhase.gain.setTargetAtTime(rightPhaseValue, t, rampTime);

    // GAIN COMPENSATION - Boost slightly to compensate for phase cancellation
    // Range: 1.0 to 1.2
    const compensationGain = 1.0 + (gainFactor * 0.2);
    // Apply to both channels through processedGain
    // Note: processedGain is already at 1, so we use a separate node if needed
    // For now, we apply it to the final output
  }

  /**
   * Find and initialize the YouTube Music audio element
   */
  function findAndInitAudio() {
    if (initialized) return true;

    const mediaEl = document.querySelector("video");
    
    if (mediaEl && mediaEl.readyState >= 1) {
      const success = initAudio(mediaEl);
      if (success) {
        console.log("[Spatialify] Media element connected.");
        return true;
      }
    }
    return false;
  }

  /**
   * Retry initialization with exponential backoff
   */
  function retryInit() {
    if (initialized) return;
    
    if (retryCount >= MAX_RETRIES) {
      console.warn("[Spatialify] Max retries reached.");
      return;
    }

    retryCount++;
    const delay = Math.min(100 * Math.pow(1.1, retryCount), 500);
    
    setTimeout(() => {
      if (!initialized) {
        const found = findAndInitAudio();
        if (!found) retryInit();
      }
    }, delay);
  }

  /**
   * Watch for media element with MutationObserver
   */
  function watchForMediaElement() {
    if (initialized) return;

    const observer = new MutationObserver(() => {
      if (findAndInitAudio()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // SPA navigation detection
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(findAndInitAudio, 500);
      }
    }).observe(document, { subtree: true, childList: true });

    return observer;
  }

  // Load saved settings
  browser.storage.local.get(DEFAULT_SETTINGS).then((stored) => {
    settings = { ...DEFAULT_SETTINGS, ...stored };
    if (initialized) applySettings();
  }).catch((err) => {
    console.warn("[Spatialify] Could not load settings:", err);
  });

  // Listen for messages
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "updateSettings") {
      settings = { ...settings, ...message.settings };
      applySettings();
      if (sendResponse) sendResponse({ success: true });
      return true;
    }
    
    if (message.type === "getStatus") {
      const status = {
        initialized,
        enabled: settings.enabled,
        audioContextState: audioContext?.state || "inactive",
        settings
      };
      if (sendResponse) sendResponse(status);
      return true;
    }
    
    if (message.type === "ping") {
      if (sendResponse) sendResponse({ pong: true, initialized });
      return true;
    }
  });

  // Initialize
  console.log("[Spatialify] Focused stereo widening loaded.");

  if (!findAndInitAudio()) {
    watchForMediaElement();
    retryInit();
  }
})();
