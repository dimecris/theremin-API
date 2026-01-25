/**
 * MÓDULO DE VISUALIZACIÓN CON P5.JS
 * Gestiona el canvas principal, partículas, efectos meteorológicos y debug
 */

import { Particle } from './particles.js';

export function createSketch(motionSensor, thereminAudio, storage) {
  return new p5((p) => {
    let particles = [];
    let precipitationParticles = [];
    let cloudLayers = [];
    let settings;
    let canvasReady = false;

    // ============================================
    // SETUP
    // ============================================
    
    p.setup = () => {
      try {
        const container = document.getElementById('p5-container');
        if (!container) {
          console.error('No se encontró el contenedor #p5-container');
          return;
        }

        const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
        cnv.parent('p5-container');
        
        setTimeout(() => {
          canvasReady = true;
        }, 100);

        settings = storage.loadSettings();

        // Crear partículas flotantes
        for (let i = 0; i < 100; i++) {
          particles.push(new Particle(p));
        }

        // Crear capas de nubes
        for (let i = 0; i < 5; i++) {
          cloudLayers.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.random(150, 300),
            speed: p.random(0.1, 0.3)
          });
        }

        console.log('Canvas p5.js inicializado correctamente');
      } catch (error) {
        console.error('Error en setup de p5:', error);
      }
    };

    // ============================================
    // DRAW LOOP
    // ============================================
    
    p.draw = () => {
      if (!canvasReady || !p._renderer || !p.drawingContext) {
        return;
      }

      try {
        settings = storage.loadSettings();
        const style = settings.weatherStyle || null;

        // Renderizar fondo con gradiente térmico
        drawThermalGradient(style);

        // Efectos atmosféricos
        if (style?.fog01 > 0.3) drawFog(style.fog01);
        if (style?.c01 > 0.2) drawClouds(style.c01);

        // Actualizar efectos de audio según clima
        thereminAudio.setEnvironment?.(style);

        // Obtener valores de inclinación con sensibilidad aplicada
        const sens = settings.sensitivity || 1.0;
        const tiltX = Math.max(-1, Math.min(1, motionSensor.getTiltX() * sens));
        const tiltY = Math.max(-1, Math.min(1, motionSensor.getTiltY() * sens));

        // Actualizar audio y debug
        thereminAudio.update(tiltX, tiltY);
        updateDebug(tiltX, tiltY);

        // Renderizar partículas
        particles.forEach(particle => {
          particle.update(tiltX, tiltY, style);
          particle.display(style);
        });

        // Renderizar ondas si está activado
        if (settings.visualMode === 1) {
          drawWaves(tiltX, tiltY, style);
        }

        // Renderizar precipitación si hay
        if (style?.p01 > 0.05) {
          drawPrecipitation(style, tiltY);
        }
      } catch (error) {
        console.error('Error en draw de p5:', error);
      }
    };

    // ============================================
    // EFECTOS VISUALES
    // ============================================
    
    function drawThermalGradient(style) {
      if (!style?.gradientStart || !style?.gradientEnd) {
        p.background(0);
        return;
      }

      try {
        const start = p.color(style.gradientStart);
        const end = p.color(style.gradientEnd);

        for (let y = 0; y < p.height; y++) {
          p.stroke(p.lerpColor(start, end, p.map(y, 0, p.height, 0, 1)));
          p.line(0, y, p.width, y);
        }
      } catch (error) {
        console.error('Error dibujando gradiente:', error);
        p.background(0);
      }
    }

    function drawFog(intensity) {
      try {
        p.fill(200, 200, 220, p.map(intensity, 0, 1, 0, 150));
        p.noStroke();
        p.rect(0, 0, p.width, p.height);
      } catch (error) {
        console.error('Error dibujando niebla:', error);
      }
    }

    function drawClouds(cover) {
      try {
        const opacity = p.map(cover, 0, 1, 0, 80);
        p.noStroke();
        p.fill(50, 50, 70, opacity);

        cloudLayers.forEach(cloud => {
          cloud.x += cloud.speed;
          if (cloud.x > p.width + cloud.size) cloud.x = -cloud.size;
          p.ellipse(cloud.x, cloud.y, cloud.size, cloud.size * 0.6);
        });
      } catch (error) {
        console.error('Error dibujando nubes:', error);
      }
    }

    function drawWaves(tiltX, tiltY, style) {
      if (!style || !p.drawingContext) return;

      try {
        const ctx = p.drawingContext;
        ctx.shadowBlur = p.map(style.h01 || 0, 0, 1, 5, 40);
        ctx.shadowColor = style.primary || '#00D1FF';
        
        p.noFill();
        p.strokeWeight(p.map(style.h01 || 0, 0, 1, 1, 4));
        p.stroke(style.primary || '#00D1FF');

        const turbulence = style.w01 || 0;
        const waveType = settings.waveType || 'sine';

        // Dibujar 3 capas de ondas
        for (let i = 0; i < 3; i++) {
          p.beginShape();
          for (let x = 0; x < p.width; x += 10) {
            const amplitude = 50 + tiltY * 50;
            const frequency = 0.01 + tiltX * 0.01;
            const phase = x * frequency + p.millis() * 0.001;
            const noise = p.noise(x * 0.01, p.millis() * 0.001 + i) * turbulence * 30;
            
            // Calcular forma de onda
            let wave;
            switch(waveType) {
              case 'sine': wave = p.sin(phase); break;
              case 'square': wave = p.sin(phase) > 0 ? 1 : -1; break;
              case 'sawtooth': wave = ((phase % p.TWO_PI) / p.TWO_PI) * 2 - 1; break;
              case 'triangle': 
                const saw = (phase % p.TWO_PI) / p.PI;
                wave = Math.abs(saw - 1) * 2 - 1;
                break;
              default: wave = p.sin(phase);
            }
            
            const y = p.height / 2 + i * 50 + wave * amplitude + noise;
            p.vertex(x, y);
          }
          p.endShape();
        }

        ctx.shadowBlur = 0;
      } catch (error) {
        console.error('Error dibujando ondas:', error);
      }
    }

    function drawPrecipitation(style, pitch) {
      const isSnow = style.isSnow || false;
      const intensity = style.p01;

      // Crear nuevas gotas/copos
      if (p.random() < intensity * 0.5) {
        precipitationParticles.push({
          x: p.random(p.width),
          y: -10,
          speed: isSnow ? p.random(1, 3) : p.random(5, 15),
          size: isSnow ? p.random(3, 6) : p.random(1, 3),
          isSnow
        });
      }

      // Actualizar y dibujar
      for (let i = precipitationParticles.length - 1; i >= 0; i--) {
        const drop = precipitationParticles[i];
        drop.y += drop.speed + Math.abs(pitch) * 2;

        if (drop.isSnow) {
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.ellipse(drop.x, drop.y, drop.size);
        } else {
          p.stroke(150, 180, 220, 220);
          p.strokeWeight(drop.size);
          p.line(drop.x, drop.y, drop.x, drop.y + drop.size * 4);
        }

        if (drop.y > p.height) precipitationParticles.splice(i, 1);
      }
    }

    // ============================================
    // DEBUG
    // ============================================
    
    function updateDebug(tiltX, tiltY) {
      const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      // Motion
      set('debug-tilt-x', tiltX.toFixed(3));
      set('debug-tilt-y', tiltY.toFixed(3));
      set('debug-intensity', Math.sqrt(tiltX * tiltX + tiltY * tiltY).toFixed(3));

      // Audio
      set('debug-frequency', (thereminAudio.currentFrequency || 0).toFixed(1));
      set('debug-wave-type', thereminAudio.waveType || 'sine');
      set('debug-volume', (thereminAudio.currentVolume || 0).toFixed(2));
      set('debug-scale', thereminAudio.currentScale || '-');
      set('debug-note', thereminAudio.currentNote || '-');

      // Clima
      const weather = settings.weatherStyle?.rawData;
      if (weather) {
        set('debug-temperature', weather.temperature?.toFixed(1));
        set('debug-humidity', weather.humidity);
        set('debug-wind', weather.windSpeed?.toFixed(1));
        set('debug-clouds', weather.cloudCover);
      }

      // Sistema
      set('debug-mode', motionSensor.isDebugMode ? 'DEBUG (mouse)' : 'SENSOR (device)');
      set('debug-session-count', storage.getSessionStats()?.totalSessions || 0);
    }

    // ============================================
    // RESIZE
    // ============================================
    
    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
