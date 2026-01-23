/**
 * THEREMIN METEOROLÓGICO - MAIN
 */

import './css/style.css';
import { MotionSensor } from './modules/motion.js';
import { ThereminAudio } from './modules/audio.js';
import { ThereminStorage } from './modules/storage.js';
import { createSketch } from './modules/sketch.js';
import { EnvironmentService } from './modules/environment.js';
import { Capacitor } from '@capacitor/core';

// ============================================
// INSTANCIAS Y ESTADO
// ============================================

const motionSensor = new MotionSensor();
const thereminAudio = new ThereminAudio();
const storage = new ThereminStorage();
const env = new EnvironmentService();

let settings = storage.loadSettings();
let isRunning = false;
let currentWeatherStyle = null;
let currentLocation = null;
let currentMeteo = null;

const RANDOM_CITIES = [
  'Barcelona', 'Madrid', 'París', 'Londres', 'Nueva York',
  'Tokio', 'Reykjavik', 'Dubai', 'Sídney', 'Río de Janeiro',
  'Moscú', 'Ciudad del Cabo', 'Mumbai', 'Toronto', 'Berlín',
  'Roma', 'Estocolmo', 'Buenos Aires', 'Oslo', 'Helsinki'
];

// ============================================
// REFERENCIAS DOM
// ============================================

// Pantallas
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeStartBtn = document.getElementById('welcome-start-btn');
const mainInterface = document.getElementById('main-interface');

// Controles principales
const hamburgerBtn = document.getElementById('hamburger-btn');
const startBtn = document.getElementById('start-btn');
const buttonText = startBtn?.querySelector('.button-text');
const activeIndicator = document.getElementById('active-indicator');

// Controles de ajustes
const controlsContainer = document.getElementById('controls-container');
const moreSettingsBtn = document.getElementById('more-settings-dock-btn');
const moreSettingsContainer = document.getElementById('more-settings-dock');

// Selectores de onda
const waveButtons = document.querySelectorAll('[data-wave]');

// Ciudad
const cityInput = document.getElementById('city-input');
const cityApplyBtn = document.getElementById('city-apply');

// Labels
const locationLabel = document.getElementById('location-label');
const scaleLabel = document.getElementById('scale-label');

// Debug
const debugOverlay = document.getElementById('debug-overlay');

// Menú lateral
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const menuOverlay = document.getElementById('menu-overlay');
const toggleDebugMenu = document.getElementById('toggle-debug-menu');
const toggleWavesMenu = document.getElementById('toggle-waves-menu');
const wavesMenuStatus = document.getElementById('waves-menu-status');
const resetSettingsMenu = document.getElementById('reset-settings-menu');

// ============================================
// FUNCIONES DE UI
// ============================================

function updateActiveWaveButton() {
  waveButtons.forEach(btn => {
    const waveType = btn.getAttribute('data-wave');
    btn.classList.toggle('active', waveType === settings.waveType);
  });
}

function updateLabels() {
  if (locationLabel && currentLocation) {
    locationLabel.textContent = currentLocation.name || '';
  }
  if (scaleLabel && settings.scaleName) {
    scaleLabel.textContent = settings.scaleName || '';
  }
}

// ============================================
// FUNCIONES DE CLIMA
// ============================================

async function loadCityWeather(cityName) {
  console.log('🌍 Cargando clima:', cityName);
  
  currentLocation = await env.geocodeCity(cityName);
  currentMeteo = await env.fetchMeteo(
    currentLocation.lat,
    currentLocation.lon,
    currentLocation.timezone
  );
  
  const scaleInfo = env.decideScale(currentMeteo);
  currentWeatherStyle = env.buildWeatherStyle(currentMeteo);
  
  // Guardar configuración
  storage.updateSetting('locationName', currentLocation.name);
  storage.updateSetting('locationLat', currentLocation.lat);
  storage.updateSetting('locationLon', currentLocation.lon);
  storage.updateSetting('scaleName', scaleInfo.scaleName);
  storage.updateSetting('mood', scaleInfo.mood);
  storage.updateSetting('waveType', scaleInfo.waveType);
  storage.updateSetting('weatherStyle', currentWeatherStyle);
  storage.updateSetting('meteoLastFetch', new Date().toISOString());
  
  // Aplicar al theremin
  thereminAudio.setScale?.(scaleInfo.scaleName);
  thereminAudio.setWaveType?.(scaleInfo.waveType);
  thereminAudio.setEnvironment?.(currentWeatherStyle);
  
  // Actualizar UI
  settings = storage.loadSettings();
  updateActiveWaveButton();
  updateLabels();
  
  console.log('✅ Clima cargado:', currentLocation.name, scaleInfo.scaleName);
}

async function loadRandomCity() {
  const randomCity = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
  console.log('🎲 Ciudad aleatoria:', randomCity);
  
  try {
    await loadCityWeather(randomCity);
    
    // Feedback visual
    if (locationLabel) {
      locationLabel.style.transform = 'scale(1.2)';
      locationLabel.style.color = '#FFD700';
      setTimeout(() => {
        locationLabel.style.transform = '';
        locationLabel.style.color = '';
      }, 300);
    }
  } catch (error) {
    console.error('❌ Error cargando ciudad:', error);
  }
}

// ============================================
// INICIALIZACIÓN DE AUDIO
// ============================================

async function initializeAndStartAudio() {
  console.log('🎬 Iniciando aplicación...');
  
  // Solicitar permisos
  const permissionOk = await motionSensor.requestPermissions();
  if (!permissionOk) {
    alert('Necesito permiso de movimiento/orientación para funcionar.');
    return;
  }

  // Inicializar sistemas (solo si es necesario)
  const needsInit = !thereminAudio.audioContext || thereminAudio.audioContext.state === 'closed';
  
  if (needsInit) {
    const [motionOk, audioOk] = await Promise.all([
      motionSensor.init(),
      thereminAudio.init()
    ]);

    if (!motionOk || !audioOk) {
      alert('Error inicializando el theremin. Intenta recargar la página.');
      return;
    }
  }

  // Configurar theremin
  settings = storage.loadSettings();
  thereminAudio.setWaveType(settings.waveType || 'sine');
  thereminAudio.setScale?.(settings.scaleName);
  thereminAudio.setEnvironment?.(currentWeatherStyle);
  
  // Reiniciar oscilador si es necesario
  if (!thereminAudio.isRunning) {
    await thereminAudio.init();
  }
  
  await thereminAudio.start();

  // Actualizar estado
  if (buttonText) buttonText.textContent = 'Stop';
  isRunning = true;
  storage.registerSession();
  activeIndicator?.classList.add('visible');

  // Transición desde pantalla de bienvenida
  if (mainInterface?.classList.contains('hidden')) {
    welcomeScreen?.classList.add('fade-out');
    
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      mainInterface?.classList.remove('hidden');
      
      // Mostrar debug en web
      if (Capacitor.getPlatform() === 'web') {
        setTimeout(() => debugOverlay?.classList.add('visible'), 1000);
      }
    }, 800);
  } else {
    console.log('✅ Theremin reiniciado desde interfaz principal');
  }

  console.log('✅ Theremin activo');
  console.log('💡 Agita el móvil para cambiar de ciudad');
}

// ============================================
// MENÚ LATERAL
// ============================================

function openMenu() {
  sideMenu?.classList.add('open');
  menuOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  sideMenu?.classList.remove('open');
  menuOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
}

// ============================================
// EVENT LISTENERS - NAVEGACIÓN
// ============================================

// Botón hamburguesa - Volver a bienvenida
hamburgerBtn?.addEventListener('click', async () => {
  console.log('🏠 Volviendo a la pantalla de bienvenida...');
  
  // Detener theremin
  if (isRunning) {
    await thereminAudio.stop();
    isRunning = false;
    if (buttonText) buttonText.textContent = 'Play';
    activeIndicator?.classList.remove('visible');
    debugOverlay?.classList.remove('visible');
  }
  
  // Cerrar paneles
  controlsContainer?.classList.remove('visible');
  moreSettingsContainer?.classList.remove('visible');
  moreSettingsBtn?.classList.remove('active');
  
  // Volver a bienvenida
  mainInterface?.classList.add('hidden');
  welcomeScreen.style.display = 'flex';
  welcomeScreen?.classList.remove('fade-out');
  
  setTimeout(() => {
    welcomeScreen.style.opacity = '1';
    welcomeScreen.style.transform = 'scale(1)';
  }, 50);
  
  console.log('✅ De vuelta en la pantalla de bienvenida');
});

// Botón Start Audio desde bienvenida
welcomeStartBtn?.addEventListener('click', async () => {
  await initializeAndStartAudio();
});

// Botón Start/Stop desde interfaz
startBtn?.addEventListener('click', async () => {
  if (!isRunning) {
    await initializeAndStartAudio();
    debugOverlay?.classList.add('visible');
  } else {
    await thereminAudio.stop();
    if (buttonText) buttonText.textContent = 'Play';
    isRunning = false;
    activeIndicator?.classList.remove('visible');
    debugOverlay?.classList.remove('visible');
    console.log('⏸️ Audio detenido');
  }
});

// ============================================
// EVENT LISTENERS - MENÚ LATERAL
// ============================================

closeMenuBtn?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', closeMenu);

toggleDebugMenu?.addEventListener('click', () => {
  if (!isRunning) {
    alert('Primero inicia el theremin para ver el debug');
  } else if (debugOverlay) {
    debugOverlay.classList.toggle('visible');
  }
  closeMenu();
});

toggleWavesMenu?.addEventListener('click', () => {
  const newMode = settings.visualMode === 1 ? 0 : 1;
  storage.updateSetting('visualMode', newMode);
  settings.visualMode = newMode;
  
  if (wavesMenuStatus) {
    wavesMenuStatus.textContent = newMode === 1 ? 'Ondas: ON' : 'Ondas: OFF';
  }
  
  if (toggleWavesMenu) {
    if (newMode === 1) {
      toggleWavesMenu.classList.add('active');
    } else {
      toggleWavesMenu.classList.remove('active');
    }
  }
  
  closeMenu();
});

resetSettingsMenu?.addEventListener('click', () => {
  if (confirm('¿Resetear toda la configuración?')) {
    storage.clearAll();
    location.reload();
  }
  closeMenu();
});

// Estado inicial del menú
if (wavesMenuStatus) {
  wavesMenuStatus.textContent = settings.visualMode === 1 ? 'Ondas: ON' : 'Ondas: OFF';
}

if (toggleWavesMenu) {
  if (settings.visualMode === 1) {
    toggleWavesMenu.classList.add('active');
  } else {
    toggleWavesMenu.classList.remove('active');
  }
}

// ============================================
// EVENT LISTENERS - PANEL DE AJUSTES
// ============================================

moreSettingsBtn?.addEventListener('click', () => {
  const isVisible = moreSettingsContainer?.classList.contains('visible');
  
  if (isVisible) {
    controlsContainer?.classList.remove('visible');
    moreSettingsContainer?.classList.remove('visible');
    moreSettingsBtn?.classList.remove('active');
    console.log('⬇️ Panel de ajustes cerrado');
  } else {
    controlsContainer?.classList.add('visible');
    moreSettingsContainer?.classList.add('visible');
    moreSettingsBtn?.classList.add('active');
    console.log('⬆️ Panel de ajustes abierto');
  }
});

// Cerrar panel al hacer click fuera
document.addEventListener('click', (e) => {
  const clickedInside = controlsContainer?.contains(e.target);
  
  if (!clickedInside && controlsContainer?.classList.contains('visible')) {
    controlsContainer?.classList.remove('visible');
    moreSettingsContainer?.classList.remove('visible');
    moreSettingsBtn?.classList.remove('active');
    console.log('⬇️ Panel cerrado (click fuera)');
  }
});

// ============================================
// EVENT LISTENERS - CONTROLES
// ============================================

// Shake para ciudad aleatoria
motionSensor.onShakeDetected(loadRandomCity);

// Cambiar ciudad desde input
cityApplyBtn?.addEventListener('click', async () => {
  const city = cityInput?.value?.trim();
  if (!city) return;
  
  try {
    await loadCityWeather(city);
  } catch (error) {
    alert(error?.message || 'No se pudo localizar la ciudad.');
  }
});

// Cambiar tipo de onda
waveButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const waveType = btn.getAttribute('data-wave');
    settings.waveType = waveType;
    thereminAudio.setWaveType?.(waveType);
    storage.updateSetting('waveType', waveType);
    updateActiveWaveButton();
  });
});

// ============================================
// EVENT LISTENERS - TECLADO
// ============================================

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideMenu?.classList.contains('open')) {
    closeMenu();
  }
  if ((e.key === 'd' || e.key === 'D') && isRunning) {
    debugOverlay?.classList.toggle('visible');
  }
});

// ============================================
// INICIALIZACIÓN
// ============================================

createSketch(motionSensor, thereminAudio, storage);
updateActiveWaveButton();
loadCityWeather('Barcelona').catch(console.error);

// ============================================
// LIMPIEZA
// ============================================

window.addEventListener('beforeunload', async () => {
  await motionSensor.dispose();
  thereminAudio.dispose();
});
