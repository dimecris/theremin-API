/**
 * MÓDULO DE DETECCIÓN DE MOVIMIENTO
 * Gestiona sensores de orientación, aceleración y shake del dispositivo
 */

export class MotionSensor {
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

  /**
   * Solicita permisos (iOS 13+)
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
        console.warn('⚠️ Permisos de orientación/movimiento denegados');
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return false;
    }
  }

  /**
   * Inicializa sensores
   */
  async init() {
    if (!this.hasPermission && !await this.requestPermissions()) {
      return false;
    }

    // Orientación
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.beta !== null) {
        this.hasRealSensor = true;
        this.isDebugMode = false;
        
        this.tiltX = Math.max(-90, Math.min(90, e.gamma)) / 90;
        this.tiltY = Math.max(-90, Math.min(90, e.beta)) / 90;
      }
    });

    // Aceleración (shake)
    window.addEventListener('devicemotion', (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const delta = {
        x: Math.abs(acc.x - this.lastAcceleration.x),
        y: Math.abs(acc.y - this.lastAcceleration.y),
        z: Math.abs(acc.z - this.lastAcceleration.z)
      };

      this.lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };

      // Detectar shake
      const now = Date.now();
      const totalDelta = delta.x + delta.y + delta.z;
      
      if (totalDelta > this.shakeThreshold && now - this.lastShakeTime > this.shakeCooldown) {
        this.lastShakeTime = now;
        this.triggerShake();
      }
    });

    // Esperar 1s para detectar si hay sensor real
    setTimeout(() => {
      if (!this.hasRealSensor) {
        console.log('🖱️ Modo DEBUG: mueve el ratón para simular inclinación');
        this.isDebugMode = true;
        this.setupDebugMode();
      }
    }, 1000);

    return true;
  }

  /**
   * Ejecutar callback de shake
   */
  triggerShake() {
    console.log('🔄 Shake detectado');
    this.shakeCallback?.();
  }

  /**
   * Registrar callback para shake
   */
  onShakeDetected(callback) {
    this.shakeCallback = callback;
  }

  /**
   * Modo debug con ratón (desarrollo desktop)
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
        console.log('🔄 Shake simulado (doble click)');
        this.triggerShake();
      }
    });
  }

  getTiltX() {
    return this.tiltX;
  }

  getTiltY() {
    return this.tiltY;
  }

  dispose() {
    // Los listeners se limpian automáticamente al recargar
    this.shakeCallback = null;
  }
}
