/**
 * MÓDULO DE VISUALIZACIÓN CON P5.JS
 * 
 * Este módulo gestiona toda la visualización generativa usando p5.js en modo instancia.
 * El modo instancia permite encapsular p5.js sin contaminar el scope global.
 * 
 * Componentes principales:
 * 1. Sistema de partículas: 100 partículas con movimiento orgánico basado en ruido 
 * 2. Ondas sinusoidales: visualización reactiva a la inclinación del dispositivo
 * 3. HUD informativo: datos sobre modo, audio, sesiones y configuración (solo en debug)
 * 
 * 
 */

export const createSketch = (motionSensor, thereminAudio, storage) => {
  // Retorno una nueva instancia de p5 en modo instancia
  // El parámetro "p" es la instancia de p5 con acceso a todas sus funciones
  return new p5((p) => {
    let particles = [];
    const numParticles = 100; // 100 partículas en la escena
    let settings;

    // Se ejecuta una vez al inicializar
    p.setup = () => {
      // Creo el canvas con las dimensiones de la ventana
      let cnv = p.createCanvas(p.windowWidth, p.windowHeight);
      // Vinculo el canvas al contenedor HTML
      cnv.parent('p5-container');

      // Cargo la configuración guardada (tipo de onda, sensibilidad, etc.)
      settings = storage.loadSettings();

      // Inicializo todas las partículas
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    };

    // Se ejecuta continuamente en cada frame (60 fps)
    p.draw = () => {
      // SOLUCIÓN: Recargar settings en cada frame para detectar cambios
      settings = storage.loadSettings();
      
      p.background(10, 18); // Fondo semitransparente para efecto de estela

      // Obtengo los valores actuales de inclinación del sensor
      const tiltX = motionSensor.getTiltX();
      const tiltY = motionSensor.getTiltY();

      // Aplico la sensibilidad configurada (multiplicador)
      const adjustedTiltX = tiltX * settings.sensitivity;
      const adjustedTiltY = tiltY * settings.sensitivity;

      // Actualizo los parámetros de audio con los valores de inclinación ajustados
      // Esto hace que el sonido reaccione al movimiento del dispositivo
      thereminAudio.update(adjustedTiltX, adjustedTiltY);

      // Actualizo y dibujo todas las partículas
      for (let particle of particles) {
        // update() calcula la nueva posición según la inclinación y ruido Perlin
        particle.update(adjustedTiltX, adjustedTiltY);
        // display() dibuja la partícula en el canvas
        particle.display();
      }

      // Dibujo las ondas sinusoidales solo si visualMode está activado (===1)
      if (settings.visualMode === 1) {
        drawWaves(adjustedTiltX, adjustedTiltY);
      }
      infoDebug(tiltX, tiltY);
    };

    function infoDebug(tiltX, tiltY) {
      const debugOverlay = document.getElementById('debug-overlay');
  
      // Controlo la visibilidad según debugMode
      if (motionSensor.isDebugMode()) {
        if (!debugOverlay.classList.contains('visible')) {
          debugOverlay.classList.add('visible');
        }
      
        // Actualizar Debug Overlay en tiempo real
        document.getElementById('debug-tilt-x').textContent = tiltX.toFixed(3);// Sensibilidad con 2 decimales
        document.getElementById('debug-tilt-y').textContent = tiltY.toFixed(3);

        // Intensidad total como magnitud del vector (raíz cuadrada de la suma de cuadrados)
        document.getElementById('debug-intensity').textContent = (Math.sqrt(tiltX * tiltX + tiltY * tiltY)).toFixed(3);

        // Datos de audio. obtengo frecuencia objetivo del ThereminAudio o 0 si no está definido
        document.getElementById('debug-frequency').textContent = (thereminAudio.targetFrequency || 0).toFixed(0);
        
        document.getElementById('debug-wave-type').textContent = settings.waveType; 
        document.getElementById('debug-session-count').textContent = storage.loadSettings().sessionCount;
    
      }else {
        debugOverlay.classList.remove('visible');
      } 

    }

    // Función que dibuja las ondas sinusoidales animadas
    function drawWaves(tiltX, tiltY) {
      p.noFill(); // Sin relleno, solo contorno
      p.stroke(100, 200, 255, 100); // Color azul semitransparente
      p.strokeWeight(2); // Grosor de la línea

      // Dibujo 3 ondas superpuestas
      for (let i = 0; i < 3; i++) {
        p.beginShape(); // Inicio una forma
        // Recorro horizontalmente el canvas cada 10 píxeles
        for (let x = 0; x < p.width; x += 10) {
          // Amplitud varía con la inclinación vertical (tiltY)
          let amplitude = 50 + tiltY * 50;
          // Frecuencia varía con la inclinación horizontal (tiltX)
          let frequency = 0.01 + tiltX * 0.01;
          // Cada onda tiene un offset vertical diferente
          let offset = i * 50;
          
          // Calculo la altura Y usando seno
          // x * frequency: controla cuántas ondas caben en pantalla
          // p.millis() * 0.001: anima la onda a lo largo del tiempo
          // amplitude: controla la altura de la onda
          let y;
          switch(settings.waveType) {
            case 'sine':
            // Onda sinusoidal (suave)
              y = p.height / 2 + offset + 
                  p.sin(x * frequency + p.millis() * 0.001) * amplitude;
            break;

            case 'square':
            // Onda cuadrada (saltos bruscos)
            const squareValue = p.sin(x * frequency + p.millis() * 0.001) > 0 ? 1 : -1;
            y = p.height / 2 + offset + squareValue * amplitude;
            break;
            
            case 'sawtooth':
            // Onda diente de sierra (rampa)
            const sawValue = ((x * frequency + p.millis() * 0.001) % p.TWO_PI) / p.TWO_PI * 2 - 1;
            y = p.height / 2 + offset + sawValue * amplitude;
            break;
            
            case 'triangle':
            // Onda triangular (zigzag suave)
            const triValue = Math.abs(((x * frequency + p.millis() * 0.001) % p.TWO_PI) / p.PI - 1) * 2 - 1;
            y = p.height / 2 + offset + triValue * amplitude;
            break;
            
            default:
            // Por defecto, sine
            y = p.height / 2 + offset + 
                p.sin(x * frequency + p.millis() * 0.001) * amplitude;
          }
          
          // Añado el punto a la forma
          p.vertex(x, y);
        }   
        p.endShape(); // Cierro la forma
      }
    }

    // p.windowResized() se ejecuta cuando se redimensiona la ventana
    p.windowResized = () => {
      // Reajusto el canvas a las nuevas dimensiones
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    // Clase que define el comportamiento de cada partícula
    class Particle {
      constructor() {
        // Inicializo la partícula con posición aleatoria y velocidad cero
        this.reset();
        // Cada partícula tiene su propio factor de dispersión (0.5 a 1.5)
        // Esto hace que respondan diferente a la inclinación
        this.disperseFactor = p.random(0.8, 1.2); // Menos variación
        // Offsets únicos para el ruido suave (movimiento orgánico)
        this.noiseOffsetX = p.random(1000);
        this.noiseOffsetY = p.random(1000);
      }

      reset() {
        // Posición inicial aleatoria en el canvas
        this.x = p.random(p.width);
        this.y = p.random(p.height);
        // Velocidad inicial aleatoria para mayor dispersión
        this.vx = 0;
        this.vy = 0;
        // Tamaño aleatorio entre 2 y 8 píxeles
        this.size = p.random(3, 6);
        this.alpha = 255; // Opacidad máxima
      }

      // Actualizo la posición de la partícula cada frame
      update(tiltX, tiltY) {
        // Ruido Perlin SUAVE solo para dar variación
        const noiseX = (p.noise(this.noiseOffsetX) - 0.5) * 0.3; // Muy sutil
        const noiseY = (p.noise(this.noiseOffsetY) - 0.5) * 0.3;
        
        this.noiseOffsetX += 0.005; // Más lento
        this.noiseOffsetY += 0.005;
        
        // PRINCIPAL: La inclinación controla el movimiento
        // Cada partícula responde ligeramente diferente (disperseFactor)
        this.vx += (tiltX * this.disperseFactor + noiseX) * 0.5;
        this.vy += (tiltY * this.disperseFactor + noiseY) * 0.5;

        // Fricción moderada para que se muevan fluido pero controlado
        this.vx *= 0.92;
        this.vy *= 0.92;

        // Actualizo posición
        this.x += this.vx;
        this.y += this.vy;

        // REBOTES SIMPLES Y CLAROS
        if (this.x <= 0) {
          this.x = 0;
          this.vx = -this.vx * 0.6; // Rebote con pérdida de energía
        }
        if (this.x >= p.width) {
          this.x = p.width;
          this.vx = -this.vx * 0.6;
        }
        
        if (this.y <= 0) {
          this.y = 0;
          this.vy = -this.vy * 0.6;
        }
        if (this.y >= p.height) {
          this.y = p.height;
          this.vy = -this.vy * 0.6;
        }
      }

      // Dibujo la partícula en el canvas
      display() {
        p.noStroke(); // Sin borde
        p.fill(255, 100, 150, this.alpha); // Color rosa semitransparente
        p.ellipse(this.x, this.y, this.size); // Dibujo un círculo
      }
    }
   
  });
  
};