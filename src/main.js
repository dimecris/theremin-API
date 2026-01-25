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
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
// CONSTANTES DE ICONOS
// ============================================

// se llama el svg directamente en lugar de usar img para evitar problemas de carga en Android. 
const ICONS = {
  play: `<svg class="iconmoonish" viewBox="0 0 24 24" aria-hidden="true">
           <polygon fill="currentColor" points="7.11 4.43 18.89 12 7.11 19.57 7.11 4.43"/>
         </svg>`,
  pause: `<svg class="iconmoonish" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>`
};

// ============================================
// REFERENCIAS DOM
// ============================================

const welcomeScreen = document.getElementById('welcome-screen');
const welcomeStartBtn = document.getElementById('welcome-start-btn');
const mainInterface = document.getElementById('main-interface');

const infoBtn = document.getElementById('info-btn');
const startBtn = document.getElementById('start-btn');
const buttonToggleIcon = startBtn?.querySelector('.button-toggle-icon');
const activeIndicator = document.getElementById('active-indicator');

const controlsContainer = document.getElementById('controls-container');
const moreSettingsBtn = document.getElementById('more-settings-dock-btn');
const moreSettingsDock = document.getElementById('more-settings-dock');

const waveButtons = document.querySelectorAll('[data-wave]');

const cityInput = document.getElementById('city-input');
const cityApplyBtn = document.getElementById('city-apply');

const locationLabel = document.getElementById('location-label');
const scaleLabel = document.getElementById('scale-label');

const debugOverlay = document.getElementById('debug-overlay');

const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const menuOverlay = document.getElementById('menu-overlay');
const toggleDebugMenu = document.getElementById('toggle-debug-menu');
const toggleWavesMenu = document.getElementById('toggle-waves-menu');
const wavesMenuStatus = document.getElementById('waves-menu-status');
const resetSettingsMenu = document.getElementById('reset-settings-menu');

// ============================================
// UTILIDADES
// ============================================

/**
 * Detecta si la app está corriendo en web o en dispositivo nativo
 */
function isWebPlatform() {
  return Capacitor.getPlatform() === 'web';
}

// actualiza el botón activo de tipo de onda
function updateActiveWaveButton() {
  waveButtons.forEach(btn => {
    const waveType = btn.getAttribute('data-wave');
    btn.classList.toggle('active', waveType === settings.waveType);
  });
}

// actualiza las etiquetas de ubicación y escala
function updateLabels() {
  if (locationLabel && currentLocation) {
    locationLabel.textContent = currentLocation.name || '';
  }
  if (scaleLabel && settings.scaleName) {
    scaleLabel.textContent = settings.scaleName || '';
  }
}

// ============================================
// GESTIÓN DEL CLIMA
// ============================================

async function loadCityWeather(cityName) {
  console.log('Cargando clima:', cityName);
  
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
  
  console.log('Clima cargado:', currentLocation.name, scaleInfo.scaleName);
}

async function loadRandomCity() {
  const randomCity = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
  console.log('Ciudad aleatoria:', randomCity);
  
  try {
    await loadCityWeather(randomCity);
    
    // Vibración al cambiar ciudad
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.log('Haptics no disponible:', error);
    }
    
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
    console.error('Error cargando ciudad:', error);
  }
}

// ============================================
// INICIALIZACIÓN Y START
// ============================================

async function initializeAndStartAudio() {
  console.log('Iniciando aplicación...');
  
  // Solicitar permisos
  const permissionOk = await motionSensor.requestPermissions();
  if (!permissionOk) {
    alert('Necesito permiso de movimiento/orientación para funcionar.');
    return;
  }

  // Inicializar sistemas si es necesario
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

  // Vibración al iniciar
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.log('Haptics no disponible:', error);
  }

  // Actualizar estado
  if (buttonToggleIcon) buttonToggleIcon.innerHTML = ICONS.pause;
  isRunning = true;
  storage.registerSession();
  activeIndicator?.classList.add('visible');

  // Transición de pantallas
  mainInterface?.classList.remove('hidden');
  mainInterface.style.opacity = '0';
  
  void mainInterface.offsetHeight;
  
  welcomeScreen?.classList.add('fade-out');
  mainInterface.style.opacity = '1';
  
  await new Promise(resolve => {
    mainInterface?.addEventListener('transitionend', resolve, { once: true });
  });
  
  welcomeScreen.style.display = 'none';
  
  // Mostrar debug solo en web
  if (isWebPlatform()) {
    debugOverlay?.classList.add('visible');
  }

  console.log('Theremin activo');
  console.log('Agita el móvil para cambiar de ciudad');
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

// Botón Info - Volver a bienvenida
infoBtn?.addEventListener('click', async () => {
  console.log('Volviendo a la pantalla de bienvenida...');
  
  // Detener theremin
  if (isRunning) {
    await thereminAudio.stop();
    isRunning = false;
    if (buttonToggleIcon) buttonToggleIcon.innerHTML = ICONS.play;
    activeIndicator?.classList.remove('visible');
    debugOverlay?.classList.remove('visible');
  }
  
  // Cerrar paneles 
  controlsContainer?.classList.remove('visible'); 
  moreSettingsDock?.classList.remove('visible'); 
  moreSettingsBtn?.classList.remove('active'); 
  
  // Volver a bienvenida 
  mainInterface?.classList.add('hidden'); 
  mainInterface.style.opacity = ''; 
  
  // Resetear inline style 
  welcomeScreen?.classList.remove('fade-out'); 
  welcomeScreen.style.display = 'flex'; 
  console.log('De vuelta en la pantalla de bienvenida');
});

// Botón Start Audio desde bienvenida
welcomeStartBtn?.addEventListener('click', async () => {
  await initializeAndStartAudio();
});

// Botón Start/Stop desde interfaz
startBtn?.addEventListener('click', async () => {
  if (!isRunning) {
    await initializeAndStartAudio();
  } else {
    await thereminAudio.stop();
    if (buttonToggleIcon) buttonToggleIcon.innerHTML = ICONS.play;
    isRunning = false;
    activeIndicator?.classList.remove('visible');
    debugOverlay?.classList.remove('visible');
    console.log('Audio detenido');
  }
});

// ============================================
// EVENT LISTENERS - MENÚ LATERAL
// ============================================



toggleDebugMenu?.addEventListener('click', () => {
  if (!isRunning) {
    alert('Primero inicia el theremin para ver el debug');
  } else if (isWebPlatform()) {
    debugOverlay?.classList.toggle('visible');
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
    toggleWavesMenu.classList.toggle('active', newMode === 1);
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
  toggleWavesMenu.classList.toggle('active', settings.visualMode === 1);
}

// ============================================
// EVENT LISTENERS - PANEL DE AJUSTES
// ============================================

moreSettingsBtn?.addEventListener('click', () => {
  const isVisible = moreSettingsDock?.classList.contains('visible');
  
  if (isVisible) {
    controlsContainer?.classList.remove('visible');
    moreSettingsDock?.classList.remove('visible');
    moreSettingsBtn?.classList.remove('active');
    console.log('Panel de ajustes cerrado');
  } else {
    controlsContainer?.classList.add('visible');
    moreSettingsDock?.classList.add('visible');
    moreSettingsBtn?.classList.add('active');
    console.log('Panel de ajustes abierto');
  }
});

// Cerrar panel al hacer click fuera
document.addEventListener('click', (e) => {
  const clickedInside = controlsContainer?.contains(e.target);
  const clickedButton = moreSettingsBtn?.contains(e.target);
  
  if (!clickedInside && !clickedButton && controlsContainer?.classList.contains('visible')) {
    controlsContainer?.classList.remove('visible');
    moreSettingsDock?.classList.remove('visible');
    moreSettingsBtn?.classList.remove('active');
    console.log('Panel cerrado (click fuera)');
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
  btn.addEventListener('click', async () => {
    const waveType = btn.getAttribute('data-wave');
    settings.waveType = waveType;
    thereminAudio.setWaveType?.(waveType);
    storage.updateSetting('waveType', waveType);
    updateActiveWaveButton();
    
    // VIBRACIÓN AL CAMBIAR TIPO DE ONDA
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.log('Haptics no disponible:', error);
    }
  });
});

// ============================================
// EVENT LISTENERS - TECLADO
// ============================================

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideMenu?.classList.contains('open')) {
    closeMenu();
  }
  if ((e.key === 'd' || e.key === 'D') && isRunning && isWebPlatform()) {
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
