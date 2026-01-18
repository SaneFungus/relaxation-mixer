// ================================================================
// PRZESTRZEŃ RELAKSU - BINAURAL MIXER
// ================================================================
// Aplikacja do medytacji z dźwiękiem przestrzennym 3D (HRTF)
// Format: WebM (Opus) z fallbackiem MP3
// Naprawione problemy: Race conditions, async validation, smooth panning, UI sync
// ================================================================

'use strict';

// ================================================================
// === SEKCJA: CONFIGURATION ===
// ================================================================

/**
 * Główna konfiguracja aplikacji
 * Zawiera definicje wszystkich dostępnych sesji, scen i obiektów audio
 */
const CONFIG = {
  // Sesje medytacji prowadzonej
  sessions: [
    { 
      id: 'body-scan', 
      name: 'Podróż przez ciało', 
      icon: '🧘', 
      file: 'assets/audio/voice/body-scan.webm', 
      fallback: 'assets/audio/voice/body-scan.mp3', 
      description: 'Delikatna wędrówka uwagi przez każdą część ciała.' 
    },
    { 
      id: 'breath-sitting', 
      name: 'Spokojny oddech', 
      icon: '🌬️', 
      file: 'assets/audio/voice/breath-sitting.webm', 
      fallback: 'assets/audio/voice/breath-sitting.mp3', 
      description: 'Powrót do naturalnego rytmu oddechu.' 
    },
    { 
      id: 'sounds-thoughts', 
      name: 'Przestrzeń myśli', 
      icon: '🎵', 
      file: 'assets/audio/voice/sounds-thoughts.webm', 
      fallback: 'assets/audio/voice/sounds-thoughts.mp3', 
      description: 'Obserwuj myśli jak chmury na niebie.' 
    },
    { 
      id: 'relaxation', 
      name: 'Głębokie rozluźnienie', 
      icon: '💆', 
      file: 'assets/audio/voice/relaxation.webm', 
      fallback: 'assets/audio/voice/relaxation.mp3', 
      description: 'Systematyczne uwalnianie napięć ciała.' 
    },
    { 
      id: 'visualization', 
      name: 'Wewnętrzna podróż', 
      icon: '🌌', 
      file: 'assets/audio/voice/visualization.webm', 
      fallback: 'assets/audio/voice/visualization.mp3', 
      description: 'Wizualizacja prowadząca do miejsca spokoju.' 
    }
  ],
  
  // Sceny tła dźwiękowego (przestrzenie)
  scenes: [
    { 
      id: 'beach', 
      name: 'Plaża', 
      icon: '🏖️', 
      file: 'assets/audio/scenes/beach.webm', 
      fallback: 'assets/audio/scenes/beach.mp3', 
      description: 'Ciepły piasek, delikatne fale, odległy śpiew mew' 
    },
    { 
      id: 'mountain-meadow', 
      name: 'Polana', 
      icon: '🏔️', 
      file: 'assets/audio/scenes/mountain-meadow.webm', 
      fallback: 'assets/audio/scenes/mountain-meadow.mp3', 
      description: 'Szum wiatru w trawach, przestrzeń i cisza' 
    },
    { 
      id: 'summer-forest', 
      name: 'Las', 
      icon: '🌲', 
      file: 'assets/audio/scenes/summer-forest.webm', 
      fallback: 'assets/audio/scenes/summer-forest.mp3', 
      description: 'Szelest liści, śpiew ptaków, zapach żywicy' 
    },
    { 
      id: 'night-cicadas', 
      name: 'Cykady', 
      icon: '🌙', 
      file: 'assets/audio/scenes/night-cicadas.webm', 
      fallback: 'assets/audio/scenes/night-cicadas.mp3', 
      description: 'Ciepła letnia noc, rytmiczny chór owadów' 
    }
  ],
  
  // Dodatkowe obiekty dźwiękowe
  objects: [
    { 
      id: 'bell', 
      name: 'Misa', 
      icon: '🔔', 
      file: 'assets/audio/objects/bell.webm', 
      fallback: 'assets/audio/objects/bell.mp3', 
      description: 'Rezonujący dźwięk prowadzący do skupienia' 
    },
    { 
      id: 'clock', 
      name: 'Zegar', 
      icon: '🕰️', 
      file: 'assets/audio/objects/clock.webm', 
      fallback: 'assets/audio/objects/clock.mp3', 
      description: 'Miarowy rytm odmierzający chwile ciszy' 
    },
    { 
      id: 'blackbird', 
      name: 'Kos', 
      icon: '🐦', 
      file: 'assets/audio/objects/blackbird.webm', 
      fallback: 'assets/audio/objects/blackbird.mp3', 
      description: 'Melodia poranka, naturalny budzik duszy' 
    },
    { 
      id: 'stream', 
      name: 'Strumień', 
      icon: '💧', 
      file: 'assets/audio/objects/stream.webm', 
      fallback: 'assets/audio/objects/stream.mp3', 
      description: 'Nieustanny przepływ, symbol puszczania' 
    }
  ],
  
  // Legacy pozycje dla backward compatibility
  hrtfPositions: {
    left: { angle: -60, x: -0.866, z: -0.5 },
    center: { angle: 0, x: 0, z: -1 },
    right: { angle: 60, x: 0.866, z: -0.5 }
  },
  
  // Ustawienia audio
  fadeInTime: 0.15,
  fadeOutTime: 0.8,
  positionSmoothingTime: 0.05,  // Czas wygładzania pozycji (eliminuje trzaski)
  
  // === USTAWIENIA DŹWIĘKU 3D (OBIEKTY) ===
  // Model 'inverse': gain = refDistance / (refDistance + rolloffFactor * (distance - refDistance))
  audio3d: {
    refDistance: 2,        // Odległość referencyjna (100% głośności) w metrach
    rolloffFactor: 0.01,   // Współczynnik tłumienia (im mniejszy, tym wolniejsze tłumienie)
    maxDistance: 10000,    // Maksymalna odległość
    // Przykłady dla rolloffFactor:
    // 0.01 → przy 100m: 67% głośności (BARDZO wolne)
    // 0.02 → przy 100m: 50% głośności (wolne)
    // 0.05 → przy 100m: 29% głośności (umiarkowane)
    // 0.1  → przy 100m: 17% głośności (szybkie)
  }
};


// ================================================================
// === SEKCJA: STATE MANAGEMENT ===
// ================================================================

/**
 * Globalny stan aplikacji
 * Zawiera wszystkie dane o aktualnym stanie audio, UI i timerów
 */
const state = {
  _stateVersion: 0,  // Wersja stanu dla reaktywnego UI
  
  // Audio context i główne węzły
  audioContext: null,
  masterGain: null,
  lowShelfFilter: null,
  
  // PANEL MEDYTACJI
  meditation: {
    selected: CONFIG.sessions[0].id,
    buffer: null,
    source: null,
    gainNode: null,
    pannerNode: null,
    isPlaying: false,
    isPaused: false,
    pauseTime: 0,
    startTime: 0,
    duration: 0,
    volume: 1,
    hrtfEnabled: true,
    position: 'center',
    syncWithSpace: false
  },
  
  // ARCHITEKT PRZESTRZENI
  architect: {
    isExpanded: false,
    selectedObjectId: null,  // [NOWE] ID wybranego obiektu do kontroli 3D
    scene: {
      active: null,
      sources: {},
      gains: {},
      buffers: {},
      volumes: {},
      expanded: {},
      instanceIds: {}  // Śledzenie instancji dla race condition prevention
    },
    objects: {},
    timer: {
      duration: 0,
      remaining: 0,
      isRunning: false,
      intervalId: null,
      selectedPreset: null,
      startSoundBuffer: null,
      endSoundBuffer: null
    }
  },
  
  masterVolume: 0.8
};

// Inicjalizacja stanu obiektów z 3D positioning
CONFIG.objects.forEach(obj => {
  state.architect.objects[obj.id] = {
    enabled: false,
    buffer: null,
    source: null,
    gainNode: null,
    pannerNode: null,
    volume: 0.7,        // Domyślna głośność 70%
    baseVolume: 1.0,    // Głośność bazowa (0.0-2.0) do normalizacji plików
    position: 'center',  // Legacy
    // Pozycjonowanie 3D
    position3d: {
      azimuth: 0,      // 0-360° (0° = przód/północ)
      elevation: 0,    // -90° do +90° (0° = poziom)
      distance: 10     // 1-100m (domyślnie 10m = blisko, dobrze słyszalne)
    },
    instanceId: null,
    isLoading: false
  };
});


// ================================================================
// === SEKCJA: UTILITY FUNCTIONS ===
// ================================================================

/**
 * Generuje unikalny identyfikator instancji audio
 * Używany do zapobiegania race conditions przy async operacjach
 */
function generateInstanceId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Inkrementuje wersję stanu i wywołuje odświeżenie UI
 * Reaktywny system aktualizacji interfejsu
 */
function markStateChanged() {
  state._stateVersion++;
  requestAnimationFrame(syncAllUI);
}

/**
 * Formatuje sekundy do MM:SS
 * @param {number} seconds - Czas w sekundach
 * @returns {string} Sformatowany czas
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Wyświetla tymczasową wiadomość statusu
 * @param {string} message - Treść wiadomości
 * @param {number} duration - Czas wyświetlania w ms
 */
function showStatus(message, duration = 2000) {
  const el = document.getElementById('statusMessage');
  el.textContent = message;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), duration);
}

/**
 * Aktualizuje wizualne wypełnienie range slidera
 * @param {HTMLInputElement} rangeInput - Element input[type=range]
 * @param {HTMLElement} fillElement - Element div wypełnienia
 */
function updateRangeFill(rangeInput, fillElement) {
  const value = (rangeInput.value / rangeInput.max) * 100;
  fillElement.style.width = `${value}%`;
}


// ================================================================
// === SEKCJA: AUDIO CONTEXT INITIALIZATION ===
// ================================================================

/**
 * Inicjalizuje Web Audio API context i wszystkie węzły audio
 * Tworzy routing dla medytacji, scen i obiektów
 */
async function initAudioContext() {
  if (state.audioContext) return;
  
  // Tworzenie głównego contextu
  state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Master gain (główna głośność)
  state.masterGain = state.audioContext.createGain();
  state.masterGain.gain.value = state.masterVolume;
  
  // Low shelf filter (redukcja basów dla lepszej czystości)
  state.lowShelfFilter = state.audioContext.createBiquadFilter();
  state.lowShelfFilter.type = 'lowshelf';
  state.lowShelfFilter.frequency.value = 200;
  state.lowShelfFilter.gain.value = -6;
  
  // Routing: masterGain -> lowShelf -> destination
  state.masterGain.connect(state.lowShelfFilter);
  state.lowShelfFilter.connect(state.audioContext.destination);
  
  // === Węzły dla medytacji ===
  state.meditation.gainNode = state.audioContext.createGain();
  state.meditation.pannerNode = state.audioContext.createPanner();
  state.meditation.pannerNode.panningModel = 'HRTF';
  state.meditation.pannerNode.distanceModel = 'inverse';
  state.meditation.pannerNode.refDistance = 1;
  state.meditation.pannerNode.maxDistance = 10000;
  state.meditation.pannerNode.rolloffFactor = 1;
  
  updateMeditationPosition(state.meditation.position);
  
  state.meditation.gainNode.connect(state.meditation.pannerNode);
  state.meditation.pannerNode.connect(state.masterGain);
  
  // === Węzły dla scen ===
  CONFIG.scenes.forEach(scene => {
    const gain = state.audioContext.createGain();
    gain.gain.value = 0;
    gain.connect(state.masterGain);
    state.architect.scene.gains[scene.id] = gain;
    state.architect.scene.volumes[scene.id] = 0.5;
    state.architect.scene.expanded[scene.id] = false;
    state.architect.scene.instanceIds[scene.id] = null;
  });
  
  // === Węzły dla obiektów ===
  // Model odległości: 'inverse' z konfigurowalnymi parametrami
  // Wzór: gain = refDistance / (refDistance + rolloffFactor * (distance - refDistance))
  CONFIG.objects.forEach(obj => {
    const gain = state.audioContext.createGain();
    gain.gain.value = 1.0; // Pełna głośność początkowa
    
    const panner = state.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = CONFIG.audio3d.refDistance;
    panner.maxDistance = CONFIG.audio3d.maxDistance;
    panner.rolloffFactor = CONFIG.audio3d.rolloffFactor;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 1;
    
    console.log(`🎧 PannerNode ${obj.id}: refDist=${panner.refDistance}, rolloff=${panner.rolloffFactor}, model=${panner.distanceModel}`);
    
    gain.connect(panner);
    panner.connect(state.masterGain);
    
    state.architect.objects[obj.id].gainNode = gain;
    state.architect.objects[obj.id].pannerNode = panner;
    
    // Ustaw początkową pozycję 3D (zamiast legacy center)
    updateObject3DPosition(obj.id);
  });
  
  loadTimerSounds();
  
  console.log('✅ Audio context zainicjalizowany');
}


// ================================================================
// === SEKCJA: AUDIO LOADING ===
// ================================================================

/**
 * Ładuje plik audio z fallbackiem
 * Próbuje najpierw WebM (Opus), potem MP3 jako backup
 * 
 * @param {string} url - Główny URL pliku (WebM)
 * @param {string} fallbackUrl - URL fallback (MP3)
 * @returns {Promise<AudioBuffer|null>} Zdekodowany buffer audio lub null
 */
async function loadAudioBuffer(url, fallbackUrl = null) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return await state.audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn(`⚠️  Nie można załadować: ${url}`, error.message);
    
    // Próba fallbacku do MP3
    if (fallbackUrl) {
      console.log(`🔄 Próba fallback: ${fallbackUrl}`);
      try {
        const fallbackResponse = await fetch(fallbackUrl);
        if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
        const fallbackArrayBuffer = await fallbackResponse.arrayBuffer();
        return await state.audioContext.decodeAudioData(fallbackArrayBuffer);
      } catch (fallbackError) {
        console.warn(`❌ Fallback również nieudany: ${fallbackUrl}`, fallbackError.message);
      }
    }
    
    return null;
  }
}

/**
 * Ładuje sesję medytacji prowadzonej
 * @param {string} sessionId - ID sesji do załadowania
 */
async function loadMeditationSession(sessionId) {
  const session = CONFIG.sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  showStatus(`Ładuję: ${session.name}...`);
  document.getElementById('voiceLoading').classList.add('visible');
  
  const buffer = await loadAudioBuffer(session.file, session.fallback);
  
  if (buffer) {
    state.meditation.buffer = buffer;
    state.meditation.duration = buffer.duration;
    document.getElementById('totalTime').textContent = formatTime(buffer.duration);
    showStatus(`${session.name} — gotowe`);
  } else {
    state.meditation.buffer = null;
    state.meditation.duration = 0;
    document.getElementById('totalTime').textContent = '--:--';
    showStatus(`Nie mogę odnaleźć: ${session.name}`, 3000);
  }
  
  document.getElementById('voiceLoading').classList.remove('visible');
  markStateChanged();
}

/**
 * Ładuje dźwięki timera (start/koniec)
 */
async function loadTimerSounds() {
  state.architect.timer.startSoundBuffer = await loadAudioBuffer(
    'assets/audio/timer/start.webm',
    'assets/audio/timer/start.mp3'
  );
  state.architect.timer.endSoundBuffer = await loadAudioBuffer(
    'assets/audio/timer/end.webm',
    'assets/audio/timer/end.mp3'
  );
}

/**
 * Odtwarza dźwięk timera (one-shot)
 * @param {AudioBuffer} buffer - Buffer do odtworzenia
 */
function playTimerSound(buffer) {
  if (!buffer) return;
  const source = state.audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(state.masterGain);
  source.start();
}


// ================================================================
// === SEKCJA: MEDITATION PLAYBACK ===
// ================================================================

/**
 * Rozpoczyna/wznawia odtwarzanie medytacji
 */
function playMeditation() {
  if (!state.meditation.buffer) {
    showStatus('Wybierz najpierw sesję');
    return;
  }
  
  if (state.meditation.isPlaying) return;
  
  state.meditation.source = state.audioContext.createBufferSource();
  state.meditation.source.buffer = state.meditation.buffer;
  state.meditation.source.connect(state.meditation.gainNode);
  
  const offset = state.meditation.isPaused ? state.meditation.pauseTime : 0;
  
  state.meditation.source.start(0, offset);
  state.meditation.startTime = state.audioContext.currentTime - offset;
  state.meditation.isPlaying = true;
  state.meditation.isPaused = false;
  
  state.meditation.source.onended = () => {
    if (state.meditation.isPlaying) {
      stopMeditation();
      
      // Jeśli włączona synchronizacja, zatrzymaj przestrzeń
      if (state.meditation.syncWithSpace) {
        stopAllSpace();
      }
    }
  };
  
  updatePlayButton(true);
  requestAnimationFrame(updateProgress);
  markStateChanged();
}

/**
 * Pauzuje odtwarzanie medytacji
 */
function pauseMeditation() {
  if (!state.meditation.isPlaying) return;
  
  const elapsed = state.audioContext.currentTime - state.meditation.startTime;
  state.meditation.pauseTime = elapsed;
  
  state.meditation.source.stop();
  state.meditation.source.disconnect();
  state.meditation.source = null;
  
  state.meditation.isPlaying = false;
  state.meditation.isPaused = true;
  
  updatePlayButton(false);
  markStateChanged();
}

/**
 * Zatrzymuje odtwarzanie medytacji (reset)
 */
function stopMeditation() {
  if (state.meditation.source) {
    state.meditation.source.stop();
    state.meditation.source.disconnect();
    state.meditation.source = null;
  }
  
  state.meditation.isPlaying = false;
  state.meditation.isPaused = false;
  state.meditation.pauseTime = 0;
  
  updatePlayButton(false);
  updateProgressBar(0);
  document.getElementById('currentTime').textContent = '00:00';
  markStateChanged();
}

/**
 * Aktualizuje progress bar w czasie rzeczywistym
 */
function updateProgress() {
  if (!state.meditation.isPlaying) return;
  
  const elapsed = state.audioContext.currentTime - state.meditation.startTime;
  const progress = Math.min(elapsed / state.meditation.duration, 1);
  
  updateProgressBar(progress);
  document.getElementById('currentTime').textContent = formatTime(elapsed);
  
  if (progress < 1) {
    requestAnimationFrame(updateProgress);
  }
}

/**
 * Aktualizuje wizualny progress bar
 * @param {number} progress - Postęp 0-1
 */
function updateProgressBar(progress) {
  const fill = document.getElementById('progressFill');
  fill.style.width = `${progress * 100}%`;
  if (state.meditation.isPlaying) {
    fill.classList.add('playing');
  } else {
    fill.classList.remove('playing');
  }
}

/**
 * Aktualizuje UI przycisku play/pause
 * @param {boolean} isPlaying - Czy odtwarza
 */
function updatePlayButton(isPlaying) {
  const btn = document.getElementById('btnPlay');
  btn.textContent = isPlaying ? '‖' : '▶';
  btn.setAttribute('aria-label', isPlaying ? 'Pauza' : 'Odtwórz');
  btn.classList.toggle('playing', isPlaying);
}

/**
 * Płynnie zmienia pozycję przestrzenną medytacji
 * Używa setTargetAtTime dla wygładzenia (eliminuje trzaski)
 * 
 * @param {string} position - 'left', 'center' lub 'right'
 */
function updateMeditationPosition(position) {
  const pos = CONFIG.hrtfPositions[position];
  if (!pos || !state.meditation.pannerNode || !state.audioContext) return;
  
  const currentTime = state.audioContext.currentTime;
  const smoothingTime = CONFIG.positionSmoothingTime;
  
  // Płynne przejście logarytmiczne (eliminuje trzaski)
  state.meditation.pannerNode.positionX.setTargetAtTime(pos.x, currentTime, smoothingTime);
  state.meditation.pannerNode.positionY.setTargetAtTime(0, currentTime, smoothingTime);
  state.meditation.pannerNode.positionZ.setTargetAtTime(pos.z, currentTime, smoothingTime);
  
  state.meditation.position = position;
  markStateChanged();
}

/**
 * Przełącza efekt HRTF (3D) dla medytacji
 * @param {boolean} enabled - Czy włączyć 3D
 */
function toggleHRTF(enabled) {
  state.meditation.hrtfEnabled = enabled;
  if (!state.meditation.gainNode || !state.meditation.pannerNode || !state.masterGain) return;
  
  if (enabled) {
    state.meditation.gainNode.disconnect();
    state.meditation.gainNode.connect(state.meditation.pannerNode);
    updateMeditationPosition(state.meditation.position);
  } else {
    state.meditation.gainNode.disconnect();
    state.meditation.gainNode.connect(state.masterGain);
  }
  markStateChanged();
}


// ================================================================
// === SEKCJA: SPACE (ARCHITECT) PLAYBACK ===
// ================================================================

/**
 * Bezpiecznie zatrzymuje scenę z weryfikacją instancji
 * Zapobiega race conditions przy szybkim przełączaniu
 * 
 * @param {string} sceneId - ID sceny
 * @param {string} instanceId - ID instancji do weryfikacji
 */
function stopSceneSafe(sceneId, instanceId) {
  const currentSource = state.architect.scene.sources[sceneId];
  const currentInstanceId = state.architect.scene.instanceIds[sceneId];
  
  // Weryfikacja czy to ta sama instancja
  if (currentInstanceId !== instanceId) {
    console.log(`[Race Guard] Pomijam cleanup przestarzałej instancji: ${instanceId}`);
    return;
  }
  
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (e) {
      // Source już zatrzymany - ignoruj
    }
    delete state.architect.scene.sources[sceneId];
    state.architect.scene.instanceIds[sceneId] = null;
  }
}

/**
 * Wybiera i uruchamia scenę tła
 * @param {string} sceneId - ID sceny do uruchomienia
 */
async function selectScene(sceneId) {
  const scene = CONFIG.scenes.find(s => s.id === sceneId);
  if (!scene) return;
  
  showStatus(`Przygotowuję: ${scene.name}...`);
  
  // Zatrzymaj poprzednią scenę z fade-out
  if (state.architect.scene.active && state.architect.scene.sources[state.architect.scene.active]) {
    const oldSceneId = state.architect.scene.active;
    const oldInstanceId = state.architect.scene.instanceIds[oldSceneId];
    const oldGain = state.architect.scene.gains[oldSceneId];
    
    oldGain.gain.setTargetAtTime(0, state.audioContext.currentTime, CONFIG.fadeOutTime);
    
    // Zaplanuj cleanup z weryfikacją instancji
    setTimeout(() => {
      stopSceneSafe(oldSceneId, oldInstanceId);
    }, CONFIG.fadeOutTime * 1000 * 3);
  }
  
  // Ładuj bufor jeśli nie istnieje
  if (!state.architect.scene.buffers[sceneId]) {
    state.architect.scene.buffers[sceneId] = await loadAudioBuffer(scene.file, scene.fallback);
  }
  
  const buffer = state.architect.scene.buffers[sceneId];
  if (!buffer) {
    showStatus(`Nie mogę odnaleźć tej przestrzeni`, 3000);
    return;
  }
  
  // Generuj nowy ID instancji
  const newInstanceId = generateInstanceId();
  
  const source = state.audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(state.architect.scene.gains[sceneId]);
  
  const targetVolume = state.architect.scene.volumes[sceneId] ?? 0.5;
  state.architect.scene.gains[sceneId].gain.setValueAtTime(0, state.audioContext.currentTime);
  state.architect.scene.gains[sceneId].gain.setTargetAtTime(targetVolume, state.audioContext.currentTime, CONFIG.fadeInTime);
  
  source.start();
  
  // Zapisz źródło i ID instancji
  state.architect.scene.sources[sceneId] = source;
  state.architect.scene.instanceIds[sceneId] = newInstanceId;
  state.architect.scene.active = sceneId;
  
  markStateChanged();
  showStatus(`${scene.name} — jesteś tutaj`);
}

/**
 * Aktualizuje głośność sceny
 * @param {string} sceneId - ID sceny
 * @param {number} volume - Głośność 0-1
 */
function updateSceneVolume(sceneId, volume) {
  state.architect.scene.volumes[sceneId] = volume;
  
  if (state.architect.scene.gains[sceneId] && state.architect.scene.active === sceneId) {
    state.architect.scene.gains[sceneId].gain.setTargetAtTime(volume, state.audioContext.currentTime, 0.1);
  }
  markStateChanged();
}

/**
 * Zatrzymuje scenę
 * @param {string} sceneId - ID sceny do zatrzymania
 */
function stopScene(sceneId) {
  const instanceId = state.architect.scene.instanceIds[sceneId];
  if (!state.architect.scene.sources[sceneId]) return;
  
  const gain = state.architect.scene.gains[sceneId];
  
  gain.gain.setTargetAtTime(0, state.audioContext.currentTime, CONFIG.fadeOutTime);
  
  // Zaplanuj cleanup z weryfikacją instancji
  setTimeout(() => {
    stopSceneSafe(sceneId, instanceId);
  }, CONFIG.fadeOutTime * 1000 * 3);
  
  state.architect.scene.active = null;
  markStateChanged();
  showStatus('Przestrzeń wyłączona');
}

/**
 * Przełącza rozwinięcie szczegółów sceny
 * @param {string} sceneId - ID sceny
 */
function toggleSceneExpanded(sceneId) {
  state.architect.scene.expanded[sceneId] = !state.architect.scene.expanded[sceneId];
  markStateChanged();
}

/**
 * Włącza/wyłącza obiekt dźwiękowy
 * Zabezpieczenie przed race conditions i async validation
 * 
 * @param {string} objectId - ID obiektu
 * @param {boolean} enabled - Czy włączyć
 */
async function toggleObject(objectId, enabled) {
  const obj = CONFIG.objects.find(o => o.id === objectId);
  const objState = state.architect.objects[objectId];
  if (!obj || !objState) return;
  
  // Guard: Jeśli trwa ładowanie, ignoruj
  if (objState.isLoading) {
    console.log(`[Loading Guard] Obiekt ${objectId} wciąż się ładuje`);
    return;
  }
  
  // Zapisz zamierzony stan PRZED operacją async
  objState.enabled = enabled;
  markStateChanged();
  
  if (enabled) {
    showStatus(`Dodaję: ${obj.name}...`);
    
    // Generuj nowy ID instancji
    const newInstanceId = generateInstanceId();
    objState.instanceId = newInstanceId;
    objState.isLoading = true;
    
    // Ładuj bufor jeśli nie istnieje
    if (!objState.buffer) {
      objState.buffer = await loadAudioBuffer(obj.file, obj.fallback);
    }
    
    objState.isLoading = false;
    
    // STATE GUARD - sprawdź czy użytkownik nie zmienił zdania
    if (!objState.enabled || objState.instanceId !== newInstanceId) {
      console.log(`[State Guard] Użytkownik zmienił zdanie podczas ładowania: ${objectId}`);
      return;
    }
    
    if (!objState.buffer) {
      showStatus(`Nie mogę odnaleźć tego dźwięku`, 3000);
      objState.enabled = false;
      objState.instanceId = null;
      markStateChanged();
      return;
    }
    
    const source = state.audioContext.createBufferSource();
    source.buffer = objState.buffer;
    source.loop = true;
    source.connect(objState.gainNode);
    
    // Głośność końcowa = volume × baseVolume
    const finalVolume = objState.volume * objState.baseVolume;
    objState.gainNode.gain.setValueAtTime(0, state.audioContext.currentTime);
    objState.gainNode.gain.setTargetAtTime(finalVolume, state.audioContext.currentTime, CONFIG.fadeInTime);
    
    source.start();
    objState.source = source;
    
    // [NOWE] Ustaw pozycję 3D
    updateObject3DPosition(objectId);
    
    // Odśwież canvas
    drawVisualization();
    
    showStatus(`${obj.icon} ${obj.name}`);
  } else {
    // Wyłączanie
    const instanceIdToStop = objState.instanceId;
    
    if (objState.source) {
      objState.gainNode.gain.setTargetAtTime(0, state.audioContext.currentTime, CONFIG.fadeOutTime);
      
      // Zaplanuj cleanup z weryfikacją instancji
      const sourceToStop = objState.source;
      setTimeout(() => {
        // Weryfikuj czy to wciąż ta sama instancja
        if (objState.instanceId === instanceIdToStop || objState.instanceId === null) {
          try {
            sourceToStop.stop();
            sourceToStop.disconnect();
          } catch (e) {
            // Source już zatrzymany
          }
          
          // Wyczyść tylko jeśli to ta sama instancja
          if (objState.source === sourceToStop) {
            objState.source = null;
          }
        }
      }, CONFIG.fadeOutTime * 1000 * 3);
    }
    
    objState.instanceId = null;
  }
  
  markStateChanged();
}

/**
 * Aktualizuje głośność obiektu (uwzględnia baseVolume)
 * @param {string} objectId - ID obiektu
 * @param {number} volume - Głośność 0-1
 */
function updateObjectVolume(objectId, volume) {
  const objState = state.architect.objects[objectId];
  if (objState) {
    objState.volume = volume;
    if (objState.gainNode && objState.enabled) {
      const finalVolume = volume * objState.baseVolume;
      objState.gainNode.gain.setTargetAtTime(finalVolume, state.audioContext.currentTime, 0.1);
    }
  }
  markStateChanged();
}

/**
 * Aktualizuje głośność bazową obiektu (do normalizacji plików audio)
 * @param {string} objectId - ID obiektu
 * @param {number} baseVolume - Głośność bazowa 0-2 (1.0 = bez zmiany)
 */
function updateObjectBaseVolume(objectId, baseVolume) {
  const objState = state.architect.objects[objectId];
  if (objState) {
    objState.baseVolume = baseVolume;
    if (objState.gainNode && objState.enabled) {
      const finalVolume = objState.volume * baseVolume;
      objState.gainNode.gain.setTargetAtTime(finalVolume, state.audioContext.currentTime, 0.1);
    }
  }
  markStateChanged();
}

/**
 * Płynnie zmienia pozycję przestrzenną obiektu
 * @param {string} objectId - ID obiektu
 * @param {string} position - 'left', 'center' lub 'right'
 */
function updateObjectPosition(objectId, position) {
  const objState = state.architect.objects[objectId];
  const pos = CONFIG.hrtfPositions[position];
  if (!objState || !pos || !objState.pannerNode) return;
  
  const currentTime = state.audioContext?.currentTime || 0;
  const smoothingTime = CONFIG.positionSmoothingTime;
  
  // Płynne przejście logarytmiczne
  objState.pannerNode.positionX.setTargetAtTime(pos.x, currentTime, smoothingTime);
  objState.pannerNode.positionY.setTargetAtTime(0, currentTime, smoothingTime);
  objState.pannerNode.positionZ.setTargetAtTime(pos.z, currentTime, smoothingTime);
  
  objState.position = position;
  markStateChanged();
}

/**
 * Zatrzymuje całą przestrzeń (sceny + obiekty + timer)
 */
function stopAllSpace() {
  // Zatrzymaj scenę
  if (state.architect.scene.active) {
    stopScene(state.architect.scene.active);
  }
  
  // Zatrzymaj wszystkie obiekty
  CONFIG.objects.forEach(obj => {
    if (state.architect.objects[obj.id].enabled) {
      toggleObject(obj.id, false);
    }
  });
  
  // Zatrzymaj timer
  if (state.architect.timer.isRunning) {
    stopTimer();
  }
  
  showStatus('Przestrzeń zatrzymana');
}


// ================================================================
// === SEKCJA: CANVAS 3D VISUALIZATION ===
// ================================================================

/**
 * Inicjalizacja canvas i rendering loop
 */
let canvas = null;
let ctx = null;

function initCanvas() {
  canvas = document.getElementById('spatialCanvas');
  if (!canvas) return;
  
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Setup drag & drop listeners
  setupCanvasInteractions();
}

/**
 * Dostosuj rozmiar canvas do kontenera
 */
function resizeCanvas() {
  if (!canvas) return;
  
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  drawVisualization();
}

/**
 * Główna funkcja renderowania canvas
 * Rysuje top-down view przestrzeni 3D
 */
function drawVisualization() {
  if (!canvas || !ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const maxRadius = Math.min(w, h) / 2.5;
  
  // Tło
  ctx.fillStyle = '#0f1923';
  ctx.fillRect(0, 0, w, h);
  
  // Siatka radialna (koła)
  ctx.strokeStyle = 'rgba(50, 184, 198, 0.15)';
  ctx.lineWidth = 1;
  for (let r = maxRadius * 0.25; r < maxRadius; r += maxRadius * 0.25) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Linie kierunkowe (N, E, S, W)
  ctx.strokeStyle = 'rgba(50, 184, 198, 0.25)';
  ctx.lineWidth = 1.5;
  const directions = [
    { angle: 0, label: 'N' },
    { angle: 90, label: 'E' },
    { angle: 180, label: 'S' },
    { angle: 270, label: 'W' }
  ];
  
  directions.forEach(dir => {
    const rad = (dir.angle * Math.PI) / 180;
    const x = centerX + maxRadius * Math.sin(rad);
    const y = centerY - maxRadius * Math.cos(rad);  // Minus bo canvas Y jest odwrócone
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Etykieta kierunku
    const labelX = centerX + (maxRadius + 20) * Math.sin(rad);
    const labelY = centerY - (maxRadius + 20) * Math.cos(rad);
    ctx.fillStyle = 'rgba(50, 184, 198, 0.6)';
    ctx.font = 'bold 12px var(--font-display)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dir.label, labelX, labelY);
  });
  
  // Słuchacz (centrum) - TY
  ctx.fillStyle = '#32b8c6';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#0f1923';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤', centerX, centerY);
  
  // Rysuj obiekty
  CONFIG.objects.forEach(obj => {
    const objState = state.architect.objects[obj.id];
    if (!objState.enabled) return;  // Nie rysuj wyłączonych
    
    const pos3d = objState.position3d;
    const rad = (pos3d.azimuth * Math.PI) / 180;
    
    // Mapuj distance (1-100) na radius wizualny (0-maxRadius)
    const visualRadius = (pos3d.distance / 100) * maxRadius;
    const x = centerX + visualRadius * Math.sin(rad);
    const y = centerY - visualRadius * Math.cos(rad);  // Minus bo Y odwrócone
    
    const isSelected = state.architect.selectedObjectId === obj.id;
    
    // Kropka obiektu
    ctx.fillStyle = isSelected ? '#c850a0' : '#32b8c6';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow effect dla wybranego
    if (isSelected) {
      ctx.strokeStyle = 'rgba(200, 80, 160, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Ikona obiektu
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.icon, x, y);
    
    // Wskaźnik elevacji (jeśli != 0)
    if (pos3d.elevation !== 0) {
      ctx.fillStyle = pos3d.elevation > 0 ? '#ffdd00' : '#00ddff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(pos3d.elevation > 0 ? '↑' : '↓', x + 18, y - 18);
    }
  });
  
  // Hint text
  if (state.architect.isExpanded) {
    ctx.fillStyle = 'rgba(160, 176, 192, 0.5)';
    ctx.font = '11px var(--font-body)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Przeciągnij obiekt aby zmienić pozycję', 10, 10);
  }
}

/**
 * Konwersja pozycji 3D (azimuth/elevation/distance) na współrzędne XYZ dla PannerNode
 * @param {number} azimuth - 0-360° (0° = przód)
 * @param {number} elevation - -90° do +90° (0° = poziom)
 * @param {number} distance - 1-100m
 * @returns {Object} {x, y, z}
 */
function convert3DToCartesian(azimuth, elevation, distance) {
  const azimuthRad = (azimuth * Math.PI) / 180;
  const elevationRad = (elevation * Math.PI) / 180;
  
  // Sferyczne → kartezjańskie
  const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
  const y = distance * Math.sin(elevationRad);
  const z = -distance * Math.cos(elevationRad) * Math.cos(azimuthRad);  // Minus = przód jest -Z
  
  return { x, y, z };
}

/**
 * Aktualizuj pozycję 3D obiektu w Web Audio API
 * @param {string} objectId - ID obiektu
 */
function updateObject3DPosition(objectId) {
  const objState = state.architect.objects[objectId];
  if (!objState || !objState.pannerNode) return;
  
  const pos3d = objState.position3d;
  const coords = convert3DToCartesian(pos3d.azimuth, pos3d.elevation, pos3d.distance);
  
  const currentTime = state.audioContext?.currentTime || 0;
  const smoothingTime = CONFIG.positionSmoothingTime;
  
  // Płynne przejście (eliminuje trzaski)
  objState.pannerNode.positionX.setTargetAtTime(coords.x, currentTime, smoothingTime);
  objState.pannerNode.positionY.setTargetAtTime(coords.y, currentTime, smoothingTime);
  objState.pannerNode.positionZ.setTargetAtTime(coords.z, currentTime, smoothingTime);
  
  // Debug: oblicz teoretyczną głośność
  const refDist = CONFIG.audio3d.refDistance;
  const rolloff = CONFIG.audio3d.rolloffFactor;
  const dist = pos3d.distance;
  const theoreticalGain = refDist / (refDist + rolloff * Math.max(0, dist - refDist));
  console.log(`🔊 ${objectId}: dist=${dist}m, xyz=(${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}, ${coords.z.toFixed(1)}), gain≈${(theoreticalGain*100).toFixed(0)}%`);
}

/**
 * Wybierz obiekt do kontroli 3D
 * @param {string} objectId - ID obiektu lub null
 */
function selectObjectFor3DControl(objectId) {
  state.architect.selectedObjectId = objectId;
  
  const controlsPanel = document.getElementById('positionControls3d');
  
  if (objectId) {
    const objState = state.architect.objects[objectId];
    const obj = CONFIG.objects.find(o => o.id === objectId);
    const pos3d = objState.position3d;
    
    // Pokaż kontrolki
    controlsPanel.style.display = 'block';
    
    // Dynamicznie dodaj suwak głośności jeśli nie istnieje
    ensureVolumeSliderExists(controlsPanel);
    
    // Ustaw wartości sliderów
    const baseVolumeSlider = document.getElementById('baseVolume3d');
    if (baseVolumeSlider) {
      baseVolumeSlider.value = Math.round(objState.baseVolume * 100);
    }
    
    document.getElementById('distance3d').value = pos3d.distance;
    document.getElementById('azimuth3d').value = pos3d.azimuth;
    document.getElementById('elevation3d').value = pos3d.elevation;
    
    // Aktualizuj tytuł panelu z nazwą obiektu
    const titleEl = controlsPanel.querySelector('.panel-title');
    if (titleEl && obj) {
      titleEl.innerHTML = `${obj.icon} ${obj.name} — pozycja 3D`;
    }
    
    update3DSliderLabels();
  } else {
    // Ukryj kontrolki
    controlsPanel.style.display = 'none';
  }
  
  markStateChanged();
  drawVisualization();
}

/**
 * Upewnia się że suwak głośności istnieje w panelu kontroli 3D
 * (dodaje dynamicznie jeśli brakuje w HTML)
 */
function ensureVolumeSliderExists(controlsPanel) {
  if (document.getElementById('baseVolume3d')) return; // Już istnieje
  
  // Znajdź pierwszy slider-3d-group (odległość)
  const firstGroup = controlsPanel.querySelector('.slider-3d-group');
  if (!firstGroup) return;
  
  // Stwórz nowy slider dla głośności
  const volumeGroup = document.createElement('div');
  volumeGroup.className = 'slider-3d-group';
  volumeGroup.innerHTML = `
    <label>
      <span>🔊 Głośność bazowa</span>
      <span class="slider-3d-value" id="baseVolumeValue">100%</span>
    </label>
    <input type="range" id="baseVolume3d" min="0" max="200" value="100" 
           aria-label="Głośność bazowa obiektu">
  `;
  
  // Wstaw przed pierwszym sliderem
  firstGroup.parentNode.insertBefore(volumeGroup, firstGroup);
  
  // Podepnij event listener
  const slider = volumeGroup.querySelector('input');
  slider.addEventListener('input', on3DSliderChange);
}

/**
 * Aktualizuj labels sliderów 3D
 */
function update3DSliderLabels() {
  const baseVolumeEl = document.getElementById('baseVolume3d');
  const baseVolumeValueEl = document.getElementById('baseVolumeValue');
  
  if (baseVolumeEl && baseVolumeValueEl) {
    const baseVolume = parseFloat(baseVolumeEl.value);
    baseVolumeValueEl.textContent = baseVolume.toFixed(0) + '%';
  }
  
  const distance = parseFloat(document.getElementById('distance3d').value);
  const azimuth = parseFloat(document.getElementById('azimuth3d').value);
  const elevation = parseFloat(document.getElementById('elevation3d').value);
  
  document.getElementById('distanceValue').textContent = distance.toFixed(0) + 'm';
  document.getElementById('azimuthValue').textContent = azimuth.toFixed(0) + '°';
  document.getElementById('elevationValue').textContent = elevation > 0 ? '+' + elevation.toFixed(0) + '°' : elevation.toFixed(0) + '°';
}

/**
 * Callback gdy slider 3D się zmienia
 */
function on3DSliderChange() {
  const objectId = state.architect.selectedObjectId;
  if (!objectId) return;
  
  const objState = state.architect.objects[objectId];
  
  // Aktualizuj baseVolume jeśli slider istnieje
  const baseVolumeEl = document.getElementById('baseVolume3d');
  if (baseVolumeEl) {
    const newBaseVolume = parseFloat(baseVolumeEl.value) / 100;
    updateObjectBaseVolume(objectId, newBaseVolume);
  }
  
  // Aktualizuj pozycję 3D
  objState.position3d.distance = parseFloat(document.getElementById('distance3d').value);
  objState.position3d.azimuth = parseFloat(document.getElementById('azimuth3d').value);
  objState.position3d.elevation = parseFloat(document.getElementById('elevation3d').value);
  
  updateObject3DPosition(objectId);
  update3DSliderLabels();
  drawVisualization();
}

// ================================================================
// === SEKCJA: CANVAS DRAG & DROP ===
// ================================================================

let draggedObjectId = null;
let isDragging = false;

/**
 * Setup canvas interactions (touch + mouse)
 */
function setupCanvasInteractions() {
  if (!canvas) return;
  
  // Touch events
  canvas.addEventListener('touchstart', handleDragStart);
  canvas.addEventListener('touchmove', handleDragMove);
  canvas.addEventListener('touchend', handleDragEnd);
  
  // Mouse events (desktop)
  canvas.addEventListener('mousedown', handleDragStart);
  canvas.addEventListener('mousemove', handleDragMove);
  canvas.addEventListener('mouseup', handleDragEnd);
  canvas.addEventListener('mouseleave', handleDragEnd);
}

/**
 * Znajdź obiekt pod kursorem/palcem
 * @param {number} canvasX - X na canvas
 * @param {number} canvasY - Y na canvas
 * @returns {string|null} - ID obiektu lub null
 */
function findObjectAtPosition(canvasX, canvasY) {
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const maxRadius = Math.min(w, h) / 2.5;
  
  for (let obj of CONFIG.objects) {
    const objState = state.architect.objects[obj.id];
    if (!objState.enabled) continue;
    
    const pos3d = objState.position3d;
    const rad = (pos3d.azimuth * Math.PI) / 180;
    const visualRadius = (pos3d.distance / 100) * maxRadius;
    
    const objX = centerX + visualRadius * Math.sin(rad);
    const objY = centerY - visualRadius * Math.cos(rad);
    
    const dist = Math.sqrt((canvasX - objX) ** 2 + (canvasY - objY) ** 2);
    
    if (dist < 25) {  // Hit area 25px
      return obj.id;
    }
  }
  
  return null;
}

/**
 * Obsługa początku przeciągania
 */
function handleDragStart(e) {
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  let x, y;
  
  if (e.type === 'touchstart') {
    if (e.touches.length !== 1) return;
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  
  const objectId = findObjectAtPosition(x, y);
  
  if (objectId) {
    draggedObjectId = objectId;
    isDragging = true;
    selectObjectFor3DControl(objectId);
  }
}

/**
 * Obsługa ruchu podczas przeciągania
 */
function handleDragMove(e) {
  if (!isDragging || !draggedObjectId) return;
  
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  let x, y;
  
  if (e.type === 'touchmove') {
    if (e.touches.length !== 1) return;
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const maxRadius = Math.min(w, h) / 2.5;
  
  // Oblicz nową pozycję
  let dx = x - centerX;
  let dy = -(y - centerY);  // Odwróć Y (canvas ma Y w dół)
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Azymut (0° = północ/przód)
  let azimuth = Math.atan2(dx, dy) * (180 / Math.PI);
  if (azimuth < 0) azimuth += 360;
  
  // Distance (1-100)
  const newDistance = Math.min(100, Math.max(1, (distance / maxRadius) * 100));
  
  const objState = state.architect.objects[draggedObjectId];
  objState.position3d.azimuth = azimuth;
  objState.position3d.distance = newDistance;
  
  updateObject3DPosition(draggedObjectId);
  
  // Sync sliders
  document.getElementById('azimuth3d').value = azimuth;
  document.getElementById('distance3d').value = newDistance;
  update3DSliderLabels();
  
  drawVisualization();
}

/**
 * Obsługa zakończenia przeciągania
 */
function handleDragEnd(e) {
  isDragging = false;
  draggedObjectId = null;
}


// ================================================================
// === SEKCJA: TIMER FUNCTIONS ===
// ================================================================

/**
 * Uruchamia timer przestrzeni
 * @param {number} minutes - Czas w minutach
 */
function startTimer(minutes) {
  if (state.architect.timer.isRunning) {
    stopTimer();
  }
  
  state.architect.timer.duration = minutes * 60;
  state.architect.timer.remaining = state.architect.timer.duration;
  state.architect.timer.isRunning = true;
  
  playTimerSound(state.architect.timer.startSoundBuffer);
  
  updateTimerDisplay();
  showStatus(`Timer przestrzeni: ${minutes} minut`);
  
  document.getElementById('btnTimerStart').style.display = 'none';
  document.getElementById('btnTimerStop').style.display = 'inline-block';
  document.getElementById('btnTimerStop').classList.add('active');
  document.getElementById('timerDisplay').classList.add('active');
  
  state.architect.timer.intervalId = setInterval(() => {
    state.architect.timer.remaining--;
    updateTimerDisplay();
    
    if (state.architect.timer.remaining <= 0) {
      timerFinished();
    }
  }, 1000);
  
  markStateChanged();
}

/**
 * Zatrzymuje timer
 */
function stopTimer() {
  if (state.architect.timer.intervalId) {
    clearInterval(state.architect.timer.intervalId);
    state.architect.timer.intervalId = null;
  }
  
  state.architect.timer.isRunning = false;
  state.architect.timer.remaining = 0;
  
  updateTimerDisplay();
  
  document.getElementById('btnTimerStart').style.display = 'inline-block';
  document.getElementById('btnTimerStop').style.display = 'none';
  document.getElementById('btnTimerStop').classList.remove('active');
  document.getElementById('timerDisplay').classList.remove('active');
  
  document.querySelectorAll('.btn-timer-preset').forEach(btn => {
    btn.classList.remove('active');
  });
  state.architect.timer.selectedPreset = null;
  
  markStateChanged();
}

/**
 * Callback gdy timer dobiegnie końca
 */
function timerFinished() {
  stopTimer();
  
  playTimerSound(state.architect.timer.endSoundBuffer);
  
  showStatus('⏰ Czas przestrzeni dobiegł końca', 4000);
  
  // Zatrzymaj wszystkie dźwięki przestrzeni
  stopAllSpace();
}

/**
 * Aktualizuje wyświetlacz timera
 */
function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  if (state.architect.timer.isRunning) {
    display.textContent = formatTime(state.architect.timer.remaining);
  } else {
    display.textContent = '--:--';
  }
}


// ================================================================
// === SEKCJA: UI RENDERING ===
// ================================================================

/**
 * Centralna funkcja synchronizacji UI ze stanem
 * Wywoływana reaktywnie po każdej zmianie stanu
 */
function syncAllUI() {
  syncSceneUI();
  syncSceneGridUI();    // [NOWE] Sync grid scen
  syncObjectsUI();
  syncObjectsGridUI();  // [NOWE] Sync grid obiektów
  syncMeditationUI();
  drawVisualization();  // [NOWE] Odśwież canvas
}

/**
 * Synchronizuje grid scen z aktualnym stanem
 */
function syncSceneGridUI() {
  document.querySelectorAll('.scene-card').forEach(card => {
    const sceneId = card.dataset.scene;
    const isActive = sceneId === state.architect.scene.active;
    
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-checked', isActive);
  });
}

/**
 * Synchronizuje grid obiektów z aktualnym stanem
 */
function syncObjectsGridUI() {
  document.querySelectorAll('.object-card').forEach(card => {
    const objectId = card.dataset.object;
    const objState = state.architect.objects[objectId];
    const isEnabled = objState.enabled;
    const isSelected = state.architect.selectedObjectId === objectId;
    
    card.classList.toggle('enabled', isEnabled);
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-checked', isEnabled);
  });
}

/**
 * Synchronizuje UI scen z aktualnym stanem
 */
function syncSceneUI() {
  document.querySelectorAll('.scene-item').forEach(item => {
    const sceneId = item.dataset.scene;
    const isSelected = sceneId === state.architect.scene.active;
    const isExpanded = state.architect.scene.expanded[sceneId];
    
    item.classList.toggle('selected', isSelected);
    item.classList.toggle('expanded', isExpanded);
  });
}

/**
 * Synchronizuje UI obiektów z aktualnym stanem
 */
function syncObjectsUI() {
  CONFIG.objects.forEach(obj => {
    const item = document.querySelector(`.object-item[data-object="${obj.id}"]`);
    if (!item) return;
    
    const objState = state.architect.objects[obj.id];
    item.classList.toggle('enabled', objState.enabled);
    item.classList.toggle('disabled', !objState.enabled);
    
    const checkbox = item.querySelector('.object-checkbox');
    if (checkbox) {
      checkbox.classList.toggle('checked', objState.enabled);
      checkbox.setAttribute('aria-checked', objState.enabled);
    }
    
    // Synchronizuj pozycję
    const positionContainer = item.querySelector('.object-position');
    if (positionContainer) {
      positionContainer.querySelectorAll('.btn-position').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.pos === objState.position);
      });
    }
  });
}

/**
 * Synchronizuje UI medytacji z aktualnym stanem
 */
function syncMeditationUI() {
  // Synchronizacja przycisków pozycji
  document.getElementById('voicePosition')?.querySelectorAll('.btn-position').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.pos === state.meditation.position);
  });
  
  // Synchronizacja toggle HRTF
  const hrtfToggle = document.getElementById('hrtfToggle');
  if (hrtfToggle) {
    hrtfToggle.classList.toggle('active', state.meditation.hrtfEnabled);
    hrtfToggle.setAttribute('aria-checked', state.meditation.hrtfEnabled);
  }
  
  // Synchronizacja toggle sync
  const syncToggle = document.getElementById('syncToggle');
  if (syncToggle) {
    syncToggle.classList.toggle('active', state.meditation.syncWithSpace);
    syncToggle.setAttribute('aria-checked', state.meditation.syncWithSpace);
  }
}

/**
 * Renderuje grid scen (simplified mobile-friendly)
 */
function renderSceneGrid() {
  const container = document.getElementById('sceneGrid');
  if (!container) return;
  
  container.innerHTML = CONFIG.scenes.map(scene => {
    const isActive = state.architect.scene.active === scene.id;
    
    return `
      <div class="scene-card ${isActive ? 'active' : ''}" 
           data-scene="${scene.id}"
           role="radio"
           tabindex="0"
           aria-checked="${isActive}"
           aria-label="${scene.name}: ${scene.description}">
        <span class="scene-card-icon">${scene.icon}</span>
        <span class="scene-card-name">${scene.name}</span>
      </div>
    `;
  }).join('');
  
  // Event handlers
  container.querySelectorAll('.scene-card').forEach(card => {
    const handleSelect = () => {
      const sceneId = card.dataset.scene;
      
      if (state.architect.scene.active === sceneId) {
        stopScene(sceneId);
      } else {
        selectScene(sceneId);
      }
    };
    
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/**
 * Renderuje grid obiektów (simplified mobile-friendly)
 */
function renderObjectsGrid() {
  const container = document.getElementById('objectsGrid');
  if (!container) return;
  
  container.innerHTML = CONFIG.objects.map(obj => {
    const objState = state.architect.objects[obj.id];
    const isEnabled = objState.enabled;
    const isSelected = state.architect.selectedObjectId === obj.id;
    
    return `
      <div class="object-card ${isEnabled ? 'enabled' : ''} ${isSelected ? 'selected' : ''}" 
           data-object="${obj.id}"
           role="checkbox"
           tabindex="0"
           aria-checked="${isEnabled}"
           aria-label="${obj.name}: ${obj.description}">
        <span class="object-card-status"></span>
        <span class="object-card-icon">${obj.icon}</span>
        <span class="object-card-name">${obj.name}</span>
      </div>
    `;
  }).join('');
  
  // Event handlers
  container.querySelectorAll('.object-card').forEach(card => {
    const handleToggle = () => {
      const objectId = card.dataset.object;
      const objState = state.architect.objects[objectId];
      const newState = !objState.enabled;
      
      // Toggle enable/disable
      toggleObject(objectId, newState);
      
      // Jeśli włączamy, zaznacz do kontroli 3D
      if (newState) {
        setTimeout(() => {
          selectObjectFor3DControl(objectId);
        }, 100);
      }
    };
    
    card.addEventListener('click', handleToggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    });
  });
}

/**
 * Renderuje karty sesji medytacji
 */
function renderSessionCards() {
  const container = document.getElementById('sessionCards');
  container.innerHTML = CONFIG.sessions.map(session => `
    <div class="session-card ${state.meditation.selected === session.id ? 'selected' : ''}" 
         data-session="${session.id}"
         role="button"
         tabindex="0"
         aria-pressed="${state.meditation.selected === session.id}"
         aria-label="${session.name}: ${session.description}">
      <span class="session-icon">${session.icon}</span>
      <span class="session-name">${session.name}</span>
    </div>
  `).join('');
  
  container.querySelectorAll('.session-card').forEach(card => {
    const handleSelect = async () => {
      const sessionId = card.dataset.session;
      if (sessionId === state.meditation.selected) return;
      
      stopMeditation();
      state.meditation.selected = sessionId;
      
      container.querySelectorAll('.session-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      
      const session = CONFIG.sessions.find(s => s.id === sessionId);
      document.getElementById('meditationTitle').textContent = session.name;
      
      await loadMeditationSession(sessionId);
    };
    
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/**
 * Renderuje listę scen
 */
function renderSceneList() {
  const container = document.getElementById('sceneList');
  container.innerHTML = CONFIG.scenes.map(scene => {
    const volume = Math.round((state.architect.scene.volumes[scene.id] ?? 0.5) * 100);
    const isExpanded = state.architect.scene.expanded[scene.id];
    const isSelected = state.architect.scene.active === scene.id;
    
    return `
      <div class="scene-item ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}" 
           data-scene="${scene.id}">
        <div class="scene-header" data-scene-header="${scene.id}">
          <div class="scene-radio" aria-hidden="true"></div>
          <span class="scene-icon">${scene.icon}</span>
          <span class="scene-name">${scene.name}</span>
          <span class="scene-expand-icon">▼</span>
        </div>
        <div class="scene-details">
          <div class="scene-volume-control">
            <span class="scene-volume-label">Głośność:</span>
            <div class="range-wrapper">
              <div class="range-fill scene-range-fill-${scene.id}"></div>
              <input type="range" min="0" max="100" value="${volume}" 
                     data-scene-volume="${scene.id}"
                     aria-label="Głośność: ${scene.name}">
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.scene-header').forEach(header => {
    header.addEventListener('click', (e) => {
      const sceneId = header.dataset.sceneHeader;
      
      if (state.architect.scene.active === sceneId) {
        stopScene(sceneId);
      } else {
        selectScene(sceneId);
      }
      
      toggleSceneExpanded(sceneId);
    });
  });
  
  container.querySelectorAll('[data-scene-volume]').forEach(input => {
    const sceneId = input.dataset.sceneVolume;
    const fillEl = container.querySelector(`.scene-range-fill-${sceneId}`);
    
    updateRangeFill(input, fillEl);
    
    input.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      updateSceneVolume(sceneId, volume);
      updateRangeFill(input, fillEl);
    });
  });
}

/**
 * Renderuje listę obiektów
 */
function renderObjectsList() {
  const container = document.getElementById('objectsList');
  container.innerHTML = CONFIG.objects.map(obj => {
    const objState = state.architect.objects[obj.id];
    const volume = Math.round(objState.volume * 100);
    
    return `
      <div class="object-item ${objState.enabled ? 'enabled' : 'disabled'}" 
           data-object="${obj.id}">
        <div class="object-header">
          <div class="object-checkbox ${objState.enabled ? 'checked' : ''}" 
               data-object-toggle="${obj.id}"
               role="checkbox"
               tabindex="0"
               aria-checked="${objState.enabled}"
               aria-label="${obj.name}: ${obj.description}"></div>
          <span class="object-icon">${obj.icon}</span>
          <span class="object-name">${obj.name}</span>
        </div>
        <div class="object-controls">
          <div class="object-position" data-object-position="${obj.id}" role="group" aria-label="Pozycja: ${obj.name}">
            <button class="btn-position ${objState.position === 'left' ? 'selected' : ''}" 
                    data-pos="left" aria-label="Lewa strona">◀</button>
            <button class="btn-position ${objState.position === 'center' ? 'selected' : ''}" 
                    data-pos="center" aria-label="Środek">●</button>
            <button class="btn-position ${objState.position === 'right' ? 'selected' : ''}" 
                    data-pos="right" aria-label="Prawa strona">▶</button>
          </div>
          <div class="range-wrapper object-volume">
            <div class="range-fill object-range-fill-${obj.id}"></div>
            <input type="range" min="0" max="100" value="${volume}" 
                   data-object-volume="${obj.id}"
                   aria-label="Głośność: ${obj.name}">
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.object-checkbox').forEach(checkbox => {
    const handleToggle = () => {
      const objectId = checkbox.dataset.objectToggle;
      const newState = !state.architect.objects[objectId].enabled;
      toggleObject(objectId, newState);
    };
    
    checkbox.addEventListener('click', handleToggle);
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    });
  });
  
  container.querySelectorAll('.object-position').forEach(posContainer => {
    posContainer.querySelectorAll('.btn-position').forEach(btn => {
      btn.addEventListener('click', () => {
        const objectId = posContainer.dataset.objectPosition;
        const position = btn.dataset.pos;
        updateObjectPosition(objectId, position);
      });
    });
  });
  
  container.querySelectorAll('[data-object-volume]').forEach(input => {
    const objectId = input.dataset.objectVolume;
    const fillEl = container.querySelector(`.object-range-fill-${objectId}`);
    
    updateRangeFill(input, fillEl);
    
    input.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      updateObjectVolume(objectId, volume);
      updateRangeFill(input, fillEl);
    });
  });
}


// ================================================================
// === SEKCJA: EVENT HANDLERS ===
// ================================================================

/**
 * Konfiguruje wszystkie event listenery aplikacji
 */
function setupEventHandlers() {
  // === Przycisk START (aktywacja audio context) ===
  document.getElementById('btnStart').addEventListener('click', async () => {
    await initAudioContext();
    document.getElementById('audioPrompt').classList.add('hidden');
    
    const firstSession = CONFIG.sessions[0];
    document.getElementById('meditationTitle').textContent = firstSession.name;
    await loadMeditationSession(firstSession.id);
  });
  
  // === Play/Pause ===
  document.getElementById('btnPlay').addEventListener('click', () => {
    if (state.meditation.isPlaying) {
      pauseMeditation();
    } else {
      playMeditation();
    }
  });
  
  // === Stop ===
  document.getElementById('btnStop').addEventListener('click', stopMeditation);
  
  // === Master volume ===
  const masterVolume = document.getElementById('masterVolume');
  const masterVolumeFill = document.getElementById('masterVolumeFill');
  updateRangeFill(masterVolume, masterVolumeFill);
  
  masterVolume.addEventListener('input', (e) => {
    state.masterVolume = e.target.value / 100;
    updateRangeFill(masterVolume, masterVolumeFill);
    if (state.masterGain) {
      state.masterGain.gain.setTargetAtTime(state.masterVolume, state.audioContext.currentTime, 0.1);
    }
  });
  
  // === Voice volume ===
  const voiceVolume = document.getElementById('voiceVolume');
  const voiceVolumeFill = document.getElementById('voiceVolumeFill');
  updateRangeFill(voiceVolume, voiceVolumeFill);
  
  voiceVolume.addEventListener('input', (e) => {
    state.meditation.volume = e.target.value / 100;
    document.getElementById('voiceVolumeValue').textContent = `${e.target.value}%`;
    updateRangeFill(voiceVolume, voiceVolumeFill);
    if (state.meditation.gainNode) {
      state.meditation.gainNode.gain.setTargetAtTime(state.meditation.volume, state.audioContext.currentTime, 0.1);
    }
  });
  
  // === HRTF toggle ===
  const hrtfToggle = document.getElementById('hrtfToggle');
  
  hrtfToggle.addEventListener('click', () => {
    const enabled = !hrtfToggle.classList.contains('active');
    toggleHRTF(enabled);
  });
  
  hrtfToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hrtfToggle.click();
    }
  });
  
  // === Voice position ===
  document.getElementById('voicePosition').querySelectorAll('.btn-position').forEach(btn => {
    btn.addEventListener('click', () => {
      const position = btn.dataset.pos;
      updateMeditationPosition(position);
    });
  });
  
  // === Sync toggle ===
  const syncToggle = document.getElementById('syncToggle');
  
  syncToggle.addEventListener('click', () => {
    const enabled = !syncToggle.classList.contains('active');
    state.meditation.syncWithSpace = enabled;
    markStateChanged();
    
    if (enabled) {
      showStatus('Przestrzeń zakończy się z końcem medytacji');
    } else {
      showStatus('Przestrzeń działa niezależnie');
    }
  });
  
  syncToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      syncToggle.click();
    }
  });
  
  // === Progress bar seek ===
  document.getElementById('progressBar').addEventListener('click', (e) => {
    if (!state.meditation.buffer) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const seekTime = progress * state.meditation.duration;
    
    const wasPlaying = state.meditation.isPlaying;
    stopMeditation();
    state.meditation.pauseTime = seekTime;
    state.meditation.isPaused = true;
    
    updateProgressBar(progress);
    document.getElementById('currentTime').textContent = formatTime(seekTime);
    
    if (wasPlaying) {
      playMeditation();
    }
  });
  
  // === Architect panel expand/collapse ===
  document.getElementById('architectHeader').addEventListener('click', () => {
    const panel = document.getElementById('architectPanel');
    state.architect.isExpanded = !state.architect.isExpanded;
    panel.classList.toggle('expanded', state.architect.isExpanded);
  });
  
  // === Timer presets ===
  document.querySelectorAll('.btn-timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      
      document.querySelectorAll('.btn-timer-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.architect.timer.selectedPreset = minutes;
    });
  });
  
  // === Timer start ===
  document.getElementById('btnTimerStart').addEventListener('click', () => {
    if (state.architect.timer.selectedPreset) {
      startTimer(state.architect.timer.selectedPreset);
    } else {
      showStatus('Wybierz najpierw czas');
    }
  });
  
  // === Timer stop ===
  document.getElementById('btnTimerStop').addEventListener('click', () => {
    stopTimer();
  });
  
  // === [NOWE] 3D Position Sliders ===
  const distance3d = document.getElementById('distance3d');
  const azimuth3d = document.getElementById('azimuth3d');
  const elevation3d = document.getElementById('elevation3d');
  
  if (distance3d) {
    distance3d.addEventListener('input', on3DSliderChange);
  }
  
  if (azimuth3d) {
    azimuth3d.addEventListener('input', on3DSliderChange);
  }
  
  if (elevation3d) {
    elevation3d.addEventListener('input', on3DSliderChange);
  }
}


// ================================================================
// === SEKCJA: INITIALIZATION ===
// ================================================================

/**
 * Główna funkcja inicjalizująca aplikację
 */
function init() {
  // Inicjalizacja stanu scen
  CONFIG.scenes.forEach(scene => {
    state.architect.scene.volumes[scene.id] = 0.5;
    state.architect.scene.expanded[scene.id] = false;
    state.architect.scene.instanceIds[scene.id] = null;
  });
  
  // Renderowanie UI
  renderSessionCards();
  renderSceneGrid();        // [NOWE] Simplified grid
  renderObjectsGrid();      // [NOWE] Simplified grid
  
  // [NOWE] Inicjalizacja canvas 3D
  initCanvas();
  
  // Podpięcie event handlerów
  setupEventHandlers();
  
  console.log('🎧 Przestrzeń relaksu — zainicjalizowana');
  console.log('📁 Ścieżki audio: assets/audio/{voice,scenes,objects,timer}/*.webm (z fallbackiem .mp3)');
  console.log('🔧 3D Visualization: Canvas + Drag & Drop + Full spatial positioning');
  console.log('🔧 Naprawiono: Race conditions, async validation, WebM format, smooth panning, UI sync');
}

// Uruchom aplikację po załadowaniu DOM
document.addEventListener('DOMContentLoaded', init);
