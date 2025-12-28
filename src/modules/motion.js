/**
 * MÓDULO DE SENSORES DE MOVIMIENTO
 * 
 * Este módulo gestiona la lectura de los sensores de orientación del dispositivo
 * utilizando el plugin oficial de Capacitor (@capacitor/motion).
 * 
 * En móvil lee los valores reales del giroscopio.
 * En desktop (desarrollo) simula la inclinación con la posición del ratón.
 * 
 * Los valores de inclinación se normalizan entre -1 y 1 para facilitar
 * su uso en el control de audio y visualización.
 */

/* Gestión del sensor de movimiento/orientación usando Capacitor Motion
   https://capacitorjs.com/docs/apis/motion
   Flujo:
   1. new ThereminMotion()
   2. Usuario hace click en botón START -> requestPermissions()
   3. then init() para empezar a recibir datos
   4. start() y getTiltX/Y() para obtener valores normalizados
*/
import { Motion } from '@capacitor/motion';

export class MotionSensor {
  constructor() {
    // Almaceno los valores de inclinación normalizados entre -1 y 1
    this.tiltX = 0; // Inclinación horizontal (izquierda/derecha)
    this.tiltY = 0; // Inclinación vertical (adelante/atrás)
    this.isActive = false; // Indica si el sensor está funcionando
    this.debugMode = false; // true si estamos usando el ratón en lugar del sensor
    this.sensitivity = 1.0; // Sensibilidad (multiplicador) aplicada a los valores de inclinación
    this.orientationHandler = null; // Referencia al listener de Capacitor (más específico que "listener")

    // Para evitar spam de listeners si se llama init varias veces
    this._initialized = false;
  }

  // Solicita permisos para acceder a los sensores
  // En Android y navegadores modernos no se requieren permisos especiales
  async requestPermissions() {
    return true;
  }

  // Inicializa el sensor (en desktop usa el ratón, en móvil usa el giroscopio)
  async init() {
    // Detecta si está en desktop (sin pantalla táctil)
    const isDesktop = !('ontouchstart' in window);
    if (isDesktop) {
      this.enableMouseDebug();
      return true;
    }

    // Previene inicializar múltiples veces
    if (this._initialized) return true;

    try {
      // Inicio el listener de orientación usando el plugin de Capacitor
      // addListener devuelve un objeto PluginListenerHandle que permite
      // desconectar el listener más tarde con .remove()
      this.orientationHandler = await Motion.addListener('orientation', (event) => {
        // event.gamma: inclinación izquierda/derecha (-90 a 90 grados)
        // Divido por 45 para normalizar aproximadamente a -2...2
        // Luego clamp limita a -1...1 para tener un rango estándar
        this.tiltX = this.clamp(event.gamma / 45, -1, 1);
        
        // event.beta: inclinación adelante/atrás (-180 a 180 grados)
        // Mismo proceso de normalización
        this.tiltY = this.clamp(event.beta / 45, -1, 1);
        
        this.isActive = true;
      });
      
      console.log('Motion sensor inicializado con Capacitor');
      return true;
    } catch (error) {
      console.error('Error al inicializar Motion sensor:', error);
      return false;
    }
  }

  // Modo debug: usa la posición del ratón para simular la inclinación del dispositivo
  enableMouseDebug() {
    this.debugMode = true;
    this.isActive = true;

    // Escucho el movimiento del ratón
    window.addEventListener('mousemove', (event) => {
      // Convierto la posición X del ratón (0 a window.innerWidth) a valores -1...1
      // clientX / innerWidth → 0...1
      // * 2 → 0...2
      // - 1 → -1...1
      this.tiltX = (event.clientX / window.innerWidth) * 2 - 1;
      
      // Lo mismo para Y
      this.tiltY = (event.clientY / window.innerHeight) * 2 - 1;
    });

    console.log('Modo DEBUG activado: mueve el ratón para simular inclinación');
  }

  // Limita un valor entre un mínimo y un máximo
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Getters para obtener los valores de inclinación normalizados
  getTiltX() { return this.tiltX; }
  getTiltY() { return this.tiltY; }
  isDebugMode() { return this.debugMode; }

  // Limpia el listener para liberar recursos
  async dispose() {
    if (this.orientationHandler) {
      await this.orientationHandler.remove();
      console.log('Motion sensor desconectado');
    }
  }
}
