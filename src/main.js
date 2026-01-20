/**
 * ARCHIVO PRINCIPAL - ORQUESTADOR DE LA APLICACIÓN
 * 
 * Este es el punto de entrada de la aplicación. Aquí coordino todos los módulos:
 * - MotionSensor: lee la inclinación del dispositivo
 * - ThereminAudio: genera y controla el sonido
 * - ThereminStorage: guarda la configuración del usuario
 * - Sketch: gestiona la visualización con p5.js
 * 
 * El flujo es:
 * 1. Cargo la configuración guardada
 * 2. Cuando el usuario pulsa "Iniciar", inicializo sensores y audio
 * 3. Aplico la configuración guardada al audio
 * 4. Registro la sesión para estadísticas
 * 5. El sketch se encarga de actualizar continuamente audio y visuales
 */

import './css/style.css';
import { MotionSensor } from './modules/motion.js';
import { ThereminAudio } from './modules/audio.js';
import { ThereminStorage } from './modules/storage.js';
import { createSketch } from './modules/sketch.js';

// Instancio los tres módulos principales
const motionSensor = new MotionSensor();
const thereminAudio = new ThereminAudio();
const storage = new ThereminStorage();

// Cargo la configuración guardada (o uso valores por defecto si es la primera vez)
let settings = storage.loadSettings();
console.log('Configuración inicial:', settings);

// Obtengo el span con clase button-text
const buttonText = startBtn.querySelector('.button-text');
buttonText.textContent = 'Start Audio';

// Indicador de actividad (punto pulsante)
const activeIndicator = document.getElementById('active-indicator');

// Variable para controlar el estado de la aplicación
let isRunning = false;

// Gestiono el click en el botón de inicio/parada
startBtn.addEventListener('click', async () => {
  if (!isRunning) {
    // 1. Pido permisos de movimiento/orientación (NECESARIO en iOS)
    const permissionOk = await motionSensor.requestPermissions();
    if (!permissionOk) {
      alert('Necesito permiso de movimiento/orientación para controlar el sonido.');
      return;
    }
    // 2.-Inicializo los sensores y el audio
    // Estos métodos devuelven true si todo va bien
    const motionOk = await motionSensor.init();
    const audioOk = await thereminAudio.init();
    
    if (motionOk && audioOk) {
      // Refuerzo la sincronización: recargo settings desde storage antes de aplicar el tipo de onda
      settings = storage.loadSettings();
      thereminAudio.setWaveType(settings.waveType);
      
      // Inicio el audio (necesario por las políticas de autoplay de los navegadores)
      await thereminAudio.start();
      buttonText.textContent = 'Stop Audio';
      isRunning = true;
      
      // Registro esta sesión para las estadísticas
      storage.registerSession();
      
      console.log('Theremin activo con plugins de Capacitor');

      // Cuando inicia el theremin
      activeIndicator.classList.add('visible'); // Muestra el punto pulsante
    } else {
      // Si algo falla, muestro un mensaje de error
      buttonText.textContent = 'Error - Try Again';
    }
  } else {
    // Si ya está funcionando, lo detengo
    await thereminAudio.stop();
    buttonText.textContent = 'Start Audio';
    isRunning = false;
    
    // Cuando se detiene
    activeIndicator.classList.remove('visible'); //  Oculta el punto
  }
});

// Botones para cambiar tipo de onda
const waveButtons = document.querySelectorAll('[data-wave]');

// Actualizo el botón activo basado en la configuración guardada
function updateActiveWaveButton() {
  waveButtons.forEach(btn => {
    const waveType = btn.getAttribute('data-wave');
    if (waveType === settings.waveType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
// Inicializo el botón correcto al cargar
updateActiveWaveButton();


waveButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const waveType = btn.getAttribute('data-wave');
    settings.waveType = waveType; // Actualizo la configuración en memoria
    // Cambia el tipo de onda en el audio solo si está inicializado
    if (thereminAudio.osc) {
      thereminAudio.setWaveType(waveType);
    }
    storage.updateSetting('waveType', waveType); // Guardo el cambio en almacenamiento
    updateActiveWaveButton(); // Sincronizo visualmente los botones
    // Llama a una función para dibujar la onda seleccionada aunque el audio no esté activo
    if (typeof drawWavePreview === 'function') {
      drawWavePreview(waveType);
    }
    console.log('Tipo de onda cambiado a:', waveType);
  });
});

// Función para dibujar la forma de onda seleccionada (puedes personalizarla)
function drawWavePreview(waveType) {
  // Ejemplo: actualiza un canvas o SVG con la forma de onda
  // Aquí solo muestra por consola, pero puedes implementar el dibujo real
  console.log('Dibujar preview de onda:', waveType);
}


// Inicio el sketch de p5.js pasándole los módulos que necesita
// El sketch se encargará de actualizar el audio y los visuales en cada frame
createSketch(motionSensor, thereminAudio, storage);

// Limpio los recursos cuando se cierra la página
window.addEventListener('beforeunload', async () => {
  await motionSensor.dispose();
  thereminAudio.dispose();
});