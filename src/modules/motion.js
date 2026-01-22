/**
 * MÓDULO DE DETECCIÓN DE MOVIMIENTO
 * Gestiona sensores de orientación y aceleración del dispositivo
 */

export class MotionSensor {
  constructor() {
    this.tiltX = 0;
    this.tiltY = 0;
    this.isDebugMode = false;
    this.hasPermission = false;
    this.hasRealSensor = false;

    // NUEVO: Detección de shake
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.shakeThreshold = 15; // Umbral de aceleración para detectar shake
    this.shakeCallback = null;
    this.lastShakeTime = 0;
    this.shakeCooldown = 1000; // Tiempo mínimo entre shakes (ms)
  }

  /**
   * Solicita permisos de orientación/movimiento (iOS 13+)
   */
  async requestPermissions() {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const orientationPermission = await DeviceOrientationEvent.requestPermission();
        const motionPermission = await DeviceMotionEvent.requestPermission();
        
        this.hasPermission = (orientationPermission === 'granted' && motionPermission === 'granted');
        
        if (!this.hasPermission) {
          console.warn('Permisos de orientación/movimiento denegados');
        }
        
        return this.hasPermission;
      } catch (error) {
        console.error('Error solicitando permisos:', error);
        return false;
      }
    }
    
    this.hasPermission = true;
    return true;
  }

  /**
   * Inicializa los listeners de orientación y aceleración
   */
  async init() {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) return false;
    }

    // Listener de orientación
    window.addEventListener('deviceorientation', (event) => {
      if (event.gamma !== null && event.beta !== null) {
        this.hasRealSensor = true;  // ✅ HAY SENSOR REAL (móvil/tablet)
        this.isDebugMode = false;    // ❌ NO es modo debug
        
        const gamma = event.gamma;
        const beta = event.beta;
        
        this.tiltX = Math.max(-90, Math.min(90, gamma)) / 90;
        this.tiltY = Math.max(-90, Math.min(90, beta)) / 90;
      }
    });

    // NUEVO: Listener de aceleración para shake
    window.addEventListener('devicemotion', (event) => {
      if (event.accelerationIncludingGravity) {
        const acc = event.accelerationIncludingGravity;
        
        // Calcular diferencia de aceleración
        const deltaX = Math.abs(acc.x - this.lastAcceleration.x);
        const deltaY = Math.abs(acc.y - this.lastAcceleration.y);
        const deltaZ = Math.abs(acc.z - this.lastAcceleration.z);
        
        // Actualizar última aceleración
        this.lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
        
        // Detectar shake
        const now = Date.now();
        if ((deltaX + deltaY + deltaZ) > this.shakeThreshold) {
          if (now - this.lastShakeTime > this.shakeCooldown) {
            this.lastShakeTime = now;
            this.onShake();
          }
        }
      }
    });

    // ⏰ Espera 1 segundo para ver si hay sensores
    setTimeout(() => {
      if (!this.hasRealSensor) {
        console.log('Modo DEBUG activado: mueve el ratón para simular inclinación');
        this.isDebugMode = true;  // ✅ MODO DEBUG (navegador sin sensores)
        this.setupDebugMode();    // Activa control con ratón
      }
    }, 1000);

    return true;
  }

  /**
   * NUEVO: Método que se ejecuta cuando se detecta shake
   */
  onShake() {
    console.log('🔄 Shake detectado!');
    if (this.shakeCallback && typeof this.shakeCallback === 'function') {
      this.shakeCallback();
    }
  }

  /**
   * NUEVO: Registrar callback para shake
   */
  onShakeDetected(callback) {
    this.shakeCallback = callback;
  }

  /**
   * Modo debug con ratón (para desarrollo en desktop)
   */
  setupDebugMode() {
    window.addEventListener('mousemove', (event) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      this.tiltX = (event.clientX - centerX) / centerX;
      this.tiltY = (event.clientY - centerY) / centerY;
      
      this.tiltX = Math.max(-1, Math.min(1, this.tiltX));
      this.tiltY = Math.max(-1, Math.min(1, this.tiltY));
    });

    // NUEVO: Simular shake con doble click en modo debug
    let clickCount = 0;
    let clickTimer = null;
    
    window.addEventListener('click', () => {
      clickCount++;
      
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 400);
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        clickCount = 0;
        console.log('🔄 Shake simulado (doble click)');
        this.onShake();
      }
    });
  }

  getTiltX() {
    return this.tiltX;
  }

  getTiltY() {
    return this.tiltY;
  }

  async dispose() {
    window.removeEventListener('deviceorientation', null);
    window.removeEventListener('devicemotion', null);
    window.removeEventListener('mousemove', null);
    window.removeEventListener('click', null);
  }
}
