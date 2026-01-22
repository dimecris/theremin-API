/**
 * ARCHIVO PRINCIPAL - ORQUESTADOR DE LA APLICACIÓN
 */

import './css/style.css';
import { MotionSensor } from './modules/motion.js';
import { ThereminAudio } from './modules/audio.js';
import { ThereminStorage } from './modules/storage.js';
import { createSketch } from './modules/sketch.js';
import { EnvironmentService } from './modules/environment.js';

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
  console.log('🎲 Cambiando a ciudad aleatoria:', randomCity);
  
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
    console.log('🌍 Buscando ciudad:', cityName);
    
    currentLocation = await env.geocodeCity(cityName);
    console.log('📍 Ubicación:', currentLocation);
    
    currentMeteo = await env.fetchMeteo(
      currentLocation.lat,
      currentLocation.lon,
      currentLocation.timezone
    );
    console.log('🌤️ Datos meteorológicos:', currentMeteo);
    
    const scaleInfo = env.decideScale(currentMeteo);
    console.log('🎼 Escala decidida:', scaleInfo);
    
    currentWeatherStyle = env.buildWeatherStyle(currentMeteo);
    console.log('🎨 WeatherStyle:', currentWeatherStyle);
    
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

      // NUEVO: Esperar un momento para que se active isDebugMode
      setTimeout(() => {
        console.log('🔍 Verificando modo debug:', {
          isDebugMode: motionSensor.isDebugMode,
          hasRealSensor: motionSensor.hasRealSensor,
          debugOverlay: !!debugOverlay
        });

        // Activar debug overlay si estamos en modo debug (navegador de escritorio)
        if (debugOverlay && motionSensor.isDebugMode) {
          debugOverlay.classList.add('visible');
          console.log('🐛 Debug overlay activado (modo navegador)');
        } else if (debugOverlay) {
          console.warn('⚠️ Debug overlay encontrado pero isDebugMode es false');
        }
      }, 1500); // Esperar 1.5 segundos para asegurar que isDebugMode se haya establecido

      console.log('Theremin activo');
      console.log('🎵 Tipo de onda activo:', settings.waveType);
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
    
    // Ocultar debug overlay al parar
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

// NUEVO: Toggle manual con tecla 'D' (solo en modo debug)
window.addEventListener('keydown', (e) => {
  if ((e.key === 'd' || e.key === 'D') && motionSensor.isDebugMode && isRunning) {
    if (debugOverlay) {
      debugOverlay.classList.toggle('visible');
      const isVisible = debugOverlay.classList.contains('visible');
      console.log('🐛 Debug overlay:', isVisible ? 'mostrado' : 'ocultado');
    }
  }
});
