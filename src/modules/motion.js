/**
 * MÓDULO DE DETECCIÓN DE MOVIMIENTO
 * Gestiona sensores de orientación, aceleración y shake del dispositivo
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics';

export class MotionSensor {
  
  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor() {
    this.tiltX = 0;
    this.tiltY = 0;
    this.isDebugMode = false;
    this.hasPermission = false;
    this.hasRealSensor = false;
    
    // Detección de shake
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.shakeThreshold = 15;
    this.shakeCallback = null;
    this.lastShakeTime = 0;
    this.shakeCooldown = 1000;
  }

  // ============================================
  // PERMISOS
  // ============================================
  
  /**
   * Solicita permisos para sensores de movimiento (necesario en iOS 13+)
   * @returns {boolean} true si se conceden los permisos
   */
  async requestPermissions() {
    if (typeof DeviceOrientationEvent?.requestPermission !== 'function') {
      this.hasPermission = true;
      return true;
    }

    try {
      const [orientation, motion] = await Promise.all([
        DeviceOrientationEvent.requestPermission(),
        DeviceMotionEvent.requestPermission()
      ]);
      
      this.hasPermission = orientation === 'granted' && motion === 'granted';
      
      if (!this.hasPermission) {
        console.warn('Permisos de orientación/movimiento denegados');
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  
  /**
   * Inicializa listeners de sensores del dispositivo
   * Si no detecta sensores reales, activa modo debug con mouse
   * @returns {boolean} true si la inicialización es exitosa
   */
  async init() {
    if (!this.hasPermission && !await this.requestPermissions()) {
      return false;
    }

    // Listener de orientación del dispositivo
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.beta !== null) {
        this.hasRealSensor = true;
        this.isDebugMode = false;
        
        // Normalizar valores entre -1 y 1
        this.tiltX = Math.max(-90, Math.min(90, e.gamma)) / 90;
        this.tiltY = Math.max(-90, Math.min(90, e.beta)) / 90;
      }
    });

    // Listener de aceleración para detectar shake
    window.addEventListener('devicemotion', (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      // Calcular delta de aceleración
      const delta = {
        x: Math.abs(acc.x - this.lastAcceleration.x),
        y: Math.abs(acc.y - this.lastAcceleration.y),
        z: Math.abs(acc.z - this.lastAcceleration.z)
      };

      this.lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };

      // Detectar shake si supera el umbral
      const now = Date.now();
      const totalDelta = delta.x + delta.y + delta.z;
      
      if (totalDelta > this.shakeThreshold && now - this.lastShakeTime > this.shakeCooldown) {
        this.lastShakeTime = now;
        this.triggerShake();
      }
    });

    // Esperar 1s para detectar si hay sensor real, sino activar debug mode
    setTimeout(() => {
      if (!this.hasRealSensor) {
        console.log('Modo DEBUG: mueve el ratón para simular inclinación');
        this.isDebugMode = true;
        this.setupDebugMode();
      }
    }, 1000);

    return true;
  }

  // ============================================
  // DETECCIÓN DE SHAKE
  // ============================================
  
  /**
   * Ejecuta el callback de shake con vibración háptica
   */
  async triggerShake() {
    console.log('Shake detectado');
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.log('Haptics no disponible:', error);
    }
    
    this.shakeCallback?.();
  }

  /**
   * Registra una función callback para ejecutar cuando se detecte shake
   * @param {Function} callback - Función a ejecutar al detectar shake
   */
  onShakeDetected(callback) {
    this.shakeCallback = callback;
  }

  /**
   * Configura modo debug para desarrollo en desktop
   * Usa el mouse para simular inclinación y doble click para shake
   */
  setupDebugMode() {
    // Control con ratón
    window.addEventListener('mousemove', (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      this.tiltX = Math.max(-1, Math.min(1, (e.clientX - centerX) / centerX));
      this.tiltY = Math.max(-1, Math.min(1, (e.clientY - centerY) / centerY));
    });

    // Simular shake con doble click
    let clicks = 0;
    let timer = null;
    
    window.addEventListener('click', () => {
      clicks++;
      
      if (clicks === 1) {
        timer = setTimeout(() => clicks = 0, 400);
      } else if (clicks === 2) {
        clearTimeout(timer);
        clicks = 0;
        console.log('Shake simulado (doble click)');
        this.triggerShake();
      }
    });
  }

  /**
   * Obtiene el valor de inclinación horizontal
   * @returns {number} Valor entre -1 (izquierda) y 1 (derecha)
   */
  getTiltX() {
    return this.tiltX;
  }

  /**
   * Obtiene el valor de inclinación vertical
   * @returns {number} Valor entre -1 (arriba) y 1 (abajo)
   */
  getTiltY() {
    return this.tiltY;
  }

  /**
   * Limpia recursos del sensor
   */
  dispose() {
    this.shakeCallback = null;
  }
}
