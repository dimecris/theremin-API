/**
 * ARCHIVO PRINCIPAL - ORQUESTADOR DE LA APLICACIÓN
 */

import './css/style.css';
import { MotionSensor } from './modules/motion.js';
import { ThereminAudio } from './modules/audio.js';
import { ThereminStorage } from './modules/storage.js';
import { createSketch } from './modules/sketch.js';
import { EnvironmentService } from './modules/environment.js';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';

// Instancias de módulos
const motionSensor = new MotionSensor();
const thereminAudio = new ThereminAudio();
const storage = new ThereminStorage();
const env = new EnvironmentService();

// Estado global de clima
let currentWeatherStyle = null;
let currentLocation = null;
let currentMeteo = null;

// Estado + settings
let settings = storage.loadSettings();
console.log('Configuración inicial:', settings);

let isRunning = false;

// NUEVO: Lista de ciudades para shake aleatorio
const RANDOM_CITIES = [
  'Barcelona', 'Madrid', 'París', 'Londres', 'Nueva York',
  'Tokio', 'Reykjavik', 'Dubai', 'Sídney', 'Río de Janeiro',
  'Moscú', 'Ciudad del Cabo', 'Mumbai', 'Toronto', 'Berlín',
  'Roma', 'Estocolmo', 'Buenos Aires', 'Oslo', 'Helsinki'
];

// DOM
const startBtn = document.getElementById('start-btn');
const activeIndicator = document.getElementById('active-indicator');
const buttonText = startBtn?.querySelector('.button-text') || null;
if (buttonText) buttonText.textContent = 'Start Audio';

const waveButtons = document.querySelectorAll('[data-wave]');
const cityInput = document.getElementById('city-input');
const cityApplyBtn = document.getElementById('city-apply');
const locationLabel = document.getElementById('location-label');
const scaleLabel = document.getElementById('scale-label');

const tempLabel = document.getElementById('temp-label');
const humidityLabel = document.getElementById('humidity-label');
const windLabel = document.getElementById('wind-label');
const cloudsLabel = document.getElementById('clouds-label');
const weatherCodeLabel = document.getElementById('weather-code-label');

const toggleWavesBtn = document.getElementById('toggle-waves');
const wavesStatus = document.getElementById('waves-status');

// NUEVO: Referencia al debug overlay
const debugOverlay = document.getElementById('debug-overlay');

// NUEVO: Referencias al menú hamburguesa
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const menuOverlay = document.getElementById('menu-overlay');
const toggleDebugMenu = document.getElementById('toggle-debug-menu');
const toggleWavesMenu = document.getElementById('toggle-waves-menu');
const wavesMenuStatus = document.getElementById('waves-menu-status');
const resetSettingsMenu = document.getElementById('reset-settings-menu');

// Helpers UI
function updateActiveWaveButton() {
  waveButtons.forEach(btn => {
    const waveType = btn.getAttribute('data-wave');
    if (waveType === settings.waveType) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function renderEnvironmentLabels() {
  if (locationLabel && currentLocation) {
    locationLabel.textContent = currentLocation.name || '';
  }
  if (scaleLabel && settings.scaleName) {
    scaleLabel.textContent = settings.scaleName || '';
  }
}

function renderWeatherData() {
  if (!currentMeteo) return;

  if (tempLabel) {
    tempLabel.textContent = `${currentMeteo.temperature.toFixed(1)}°C`;
  }
  if (humidityLabel) {
    humidityLabel.textContent = `${currentMeteo.humidity}%`;
  }
  if (windLabel) {
    windLabel.textContent = `${currentMeteo.windSpeed.toFixed(1)} km/h`;
  }
  if (cloudsLabel) {
    cloudsLabel.textContent = `${currentMeteo.cloudCover}%`;
  }
  if (weatherCodeLabel) {
    const weatherDescription = getWeatherDescription(currentMeteo.weatherCode);
    weatherCodeLabel.textContent = weatherDescription;
  }
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Despejado',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nevada ligera',
    73: 'Nevada moderada',
    75: 'Nevada intensa',
    77: 'Granizo',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Nevada con chubascos',
    86: 'Nevada intensa con chubascos',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso'
  };
  return descriptions[code] || `Código ${code}`;
}

// NUEVA FUNCIÓN: Cambiar a ciudad aleatoria
async function loadRandomCity() {
  const randomCity = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
  console.log('– Cambiando a ciudad aleatoria:', randomCity);
  
  try {
    await loadCityWeather(randomCity);
    
    // Feedback visual
    if (locationLabel) {
      locationLabel.style.transform = 'scale(1.2)';
      locationLabel.style.color = '#FFD700';
      setTimeout(() => {
        locationLabel.style.transform = 'scale(1)';
        locationLabel.style.color = '';
      }, 300);
    }
  } catch (error) {
    console.error('Error cargando ciudad aleatoria:', error);
  }
}

// Función para obtener clima de una ciudad
async function loadCityWeather(cityName) {
  try {
    console.log('– Buscando ciudad:', cityName);
    
    currentLocation = await env.geocodeCity(cityName);
    console.log('– Ubicación:', currentLocation);
    
    currentMeteo = await env.fetchMeteo(
      currentLocation.lat,
      currentLocation.lon,
      currentLocation.timezone
    );
    console.log('– Datos meteorológicos:', currentMeteo);
    
    const scaleInfo = env.decideScale(currentMeteo);
    console.log('– Escala decidida:', scaleInfo);
    
    currentWeatherStyle = env.buildWeatherStyle(currentMeteo);
    console.log('– WeatherStyle:', currentWeatherStyle);
    
    storage.updateSetting('locationName', currentLocation.name);
    storage.updateSetting('locationLat', currentLocation.lat);
    storage.updateSetting('locationLon', currentLocation.lon);
    storage.updateSetting('scaleName', scaleInfo.scaleName);
    storage.updateSetting('mood', scaleInfo.mood);
    storage.updateSetting('waveType', scaleInfo.waveType);
    storage.updateSetting('weatherStyle', currentWeatherStyle);
    storage.updateSetting('meteoLastFetch', new Date().toISOString());
    
    if (typeof thereminAudio.setScale === 'function') {
      thereminAudio.setScale(scaleInfo.scaleName);
    }
    
    if (typeof thereminAudio.setWaveType === 'function') {
      thereminAudio.setWaveType(scaleInfo.waveType);
      console.log('🎵 Tipo de onda cambiado automáticamente a:', scaleInfo.waveType);
    }
    
    if (typeof thereminAudio.setEnvironment === 'function') {
      thereminAudio.setEnvironment(currentWeatherStyle);
    }
    
    settings = storage.loadSettings();
    updateActiveWaveButton();
    renderEnvironmentLabels();
    renderWeatherData();
    
    return { location: currentLocation, meteo: currentMeteo, scaleInfo, weatherStyle: currentWeatherStyle };
  } catch (error) {
    console.error('❌ Error cargando clima:', error);
    throw error;
  }
}

async function refreshEnvironmentFromSettings() {
  try {
    const s = storage.loadSettings();
    
    if (s.locationName && s.locationName.trim()) {
      await loadCityWeather(s.locationName);
    } else {
      await loadCityWeather('Barcelona');
    }
    
    console.log('🌦️ Clima actualizado desde settings');
  } catch (e) {
    console.warn('No se pudo actualizar entorno:', e);
  }
}

// NUEVO: Registrar callback de shake
motionSensor.onShakeDetected(() => {
  loadRandomCity();
});

// Cambiar ciudad desde UI
cityApplyBtn?.addEventListener('click', async () => {
  try {
    const city = (cityInput?.value || '').trim();
    if (!city) return;

    await loadCityWeather(city);
    console.log('✅ Ciudad cambiada a:', currentLocation.name);
  } catch (e) {
    alert(e?.message || 'No se pudo localizar esa ciudad.');
  }
});

// ELIMINAR las funciones lockToPortrait() y enterFullscreen()
// En su lugar, usar el plugin de Capacitor:

// async function lockToPortrait() {
//   try {
//     await ScreenOrientation.lock({ orientation: 'portrait' });
//     console.log('✅ Orientación bloqueada a portrait (Capacitor)');
//   } catch (error) {
//     console.warn('⚠️ No se pudo bloquear orientación:', error);
//   }
// }

// Llamar al inicio o cuando quieras bloquear
// lockToPortrait();

// Botón start/stop
startBtn?.addEventListener('click', async () => {
  if (!isRunning) {
    const permissionOk = await motionSensor.requestPermissions();
    if (!permissionOk) {
      alert('Necesito permiso de movimiento/orientación para controlar el sonido.');
      return;
    }

    const motionOk = await motionSensor.init();
    const audioOk = await thereminAudio.init();

    if (motionOk && audioOk) {
      settings = storage.loadSettings();
      
      thereminAudio.setWaveType(settings.waveType || 'sine');

      if (settings.scaleName && typeof thereminAudio.setScale === 'function') {
        thereminAudio.setScale(settings.scaleName);
      }

      if (currentWeatherStyle && typeof thereminAudio.setEnvironment === 'function') {
        thereminAudio.setEnvironment(currentWeatherStyle);
      }

      await thereminAudio.start();

      if (buttonText) buttonText.textContent = 'Stop Audio';
      isRunning = true;
      storage.registerSession();
      activeIndicator?.classList.add('visible');

      // MOSTRAR DEBUG SOLO EN WEB/BROWSER (no en iOS/Android nativos)
      setTimeout(() => {
        const platform = Capacitor.getPlatform();
        if (debugOverlay && platform === 'web') {
          debugOverlay.classList.add('visible');
          console.log('🐛 Debug overlay activado (solo en browser)');
        }
      }, 1500);

      console.log('Theremin activo');
      console.log('💡 Agita el móvil para cambiar de ciudad aleatoria!');
      
      await refreshEnvironmentFromSettings();
    } else {
      if (buttonText) buttonText.textContent = 'Error - Try Again';
    }
  } else {
    await thereminAudio.stop();
    if (buttonText) buttonText.textContent = 'Start Audio';
    isRunning = false;
    activeIndicator?.classList.remove('visible');
    
    if (debugOverlay) {
      debugOverlay.classList.remove('visible');
    }
  }
});

// Wave buttons
updateActiveWaveButton();

waveButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const waveType = btn.getAttribute('data-wave');
    
    settings.waveType = waveType;

    if (thereminAudio.osc) {
      thereminAudio.setWaveType(waveType);
    }

    storage.updateSetting('waveType', waveType);
    updateActiveWaveButton();

    console.log('✅ Tipo de onda cambiado a:', waveType);
  });
});

// p5 Sketch
createSketch(motionSensor, thereminAudio, storage);

// Cargar clima inicial
loadCityWeather('Barcelona').catch(console.error);

// Limpieza
window.addEventListener('beforeunload', async () => {
  await motionSensor.dispose();
  thereminAudio.dispose();
});

// ============================================
// MENÚ HAMBURGUESA
// ============================================

function openMenu() {
  console.log('🍔 Abriendo menú...');
  sideMenu?.classList.add('open');
  menuOverlay?.classList.add('visible');
  hamburgerBtn?.classList.add('active');
  document.body.style.overflow = 'hidden';
  console.log('✅ Menú abierto');
}

function closeMenu() {
  console.log('🍔 Cerrando menú...');
  sideMenu?.classList.remove('open');
  menuOverlay?.classList.remove('visible');
  hamburgerBtn?.classList.remove('active');
  document.body.style.overflow = '';
  console.log('✅ Menú cerrado');
}

// Event listener del botón hamburguesa
if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🍔 Click en hamburguesa detectado');
    
    if (sideMenu?.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });
  console.log('✅ Event listener del hamburguesa añadido');
} else {
  console.error('❌ No se encontró el botón hamburguesa');
}

// Botón cerrar
if (closeMenuBtn) {
  closeMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
  });
  console.log('✅ Event listener del botón cerrar añadido');
}

// Overlay para cerrar
if (menuOverlay) {
  menuOverlay.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
  });
  console.log('✅ Event listener del overlay añadido');
}

// Opciones del menú
if (toggleDebugMenu) {
  toggleDebugMenu.addEventListener('click', () => {
    console.log('🐛 Toggle debug desde menú');
    
    if (debugOverlay) {
      if (!isRunning) {
        alert('Primero inicia el theremin para ver el debug');
        closeMenu();
        return;
      }
      
      debugOverlay.classList.toggle('visible');
      const isVisible = debugOverlay.classList.contains('visible');
      console.log('🐛 Debug overlay:', isVisible ? 'mostrado' : 'ocultado');
    }
    closeMenu();
  });
  console.log('✅ Event listener de toggle debug añadido');
}

if (toggleWavesMenu) {
  toggleWavesMenu.addEventListener('click', () => {
    console.log('🌊 Toggle ondas desde menú');
    
    const currentMode = settings.visualMode;
    const newMode = currentMode === 1 ? 0 : 1;
    
    storage.updateSetting('visualMode', newMode);
    settings.visualMode = newMode;
    
    if (wavesMenuStatus) {
      wavesMenuStatus.textContent = newMode === 1 ? 'Ondas: ON' : 'Ondas: OFF';
    }
    
    console.log('👁️ Modo visual:', newMode === 1 ? 'Ondas visibles' : 'Solo partículas');
    closeMenu();
  });
  console.log('✅ Event listener de toggle ondas añadido');
}

if (resetSettingsMenu) {
  resetSettingsMenu.addEventListener('click', () => {
    console.log('🔄 Reset settings desde menú');
    
    if (confirm('¿Resetear toda la configuración? Esta acción no se puede deshacer.')) {
      storage.clearAll();
      location.reload();
    }
    closeMenu();
  });
  console.log('✅ Event listener de reset settings añadido');
}

// Inicializar estado del toggle de ondas en el menú
if (wavesMenuStatus && settings.visualMode !== undefined) {
  wavesMenuStatus.textContent = settings.visualMode === 1 ? 'Ondas: ON' : 'Ondas: OFF';
  console.log('✅ Estado inicial de ondas:', settings.visualMode === 1 ? 'ON' : 'OFF');
}

// Cerrar menú con tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideMenu?.classList.contains('open')) {
    closeMenu();
  }
  
  // Toggle debug con tecla 'D' (solo cuando está corriendo)
  if ((e.key === 'd' || e.key === 'D') && isRunning) {
    if (debugOverlay) {
      debugOverlay.classList.toggle('visible');
      const isVisible = debugOverlay.classList.contains('visible');
      console.log('🐛 Debug overlay (tecla D):', isVisible ? 'mostrado' : 'ocultado');
    }
  }
});

// Verificar que los elementos del menú existan
console.log('🍔 Estado de elementos del menú:', {
  hamburgerBtn: !!hamburgerBtn,
  sideMenu: !!sideMenu,
  closeMenuBtn: !!closeMenuBtn,
  menuOverlay: !!menuOverlay,
  toggleDebugMenu: !!toggleDebugMenu,
  toggleWavesMenu: !!toggleWavesMenu,
  resetSettingsMenu: !!resetSettingsMenu
});
