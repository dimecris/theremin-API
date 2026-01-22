/**
 * MÓDULO DE VISUALIZACIÓN CON P5.JS
 * Implementa TODOS los efectos meteorológicos visuales
 */

import { Particle } from './particles.js';

export function createSketch(motionSensor, thereminAudio, storage) {
  return new p5((p) => {
    let particles = [];
    let precipitationParticles = [];
    let cloudLayers = [];
    const numParticles = 100;
    let settings;

    // Referencias al debug overlay
    const debugTiltX = document.getElementById('debug-tilt-x');
    const debugTiltY = document.getElementById('debug-tilt-y');
    const debugIntensity = document.getElementById('debug-intensity');
    const debugFrequency = document.getElementById('debug-frequency');
    const debugWaveType = document.getElementById('debug-wave-type');
    const debugVolume = document.getElementById('debug-volume');
    const debugScale = document.getElementById('debug-scale');
    const debugNote = document.getElementById('debug-note');
    const debugTemperature = document.getElementById('debug-temperature');
    const debugHumidity = document.getElementById('debug-humidity');
    const debugWind = document.getElementById('debug-wind');
    const debugClouds = document.getElementById('debug-clouds');
    const debugSessionCount = document.getElementById('debug-session-count');
    const debugMode = document.getElementById('debug-mode');

    p.setup = () => {
      let cnv = p.createCanvas(p.windowWidth, p.windowHeight);
      cnv.parent('p5-container');
      settings = storage.loadSettings();

      // Crear partículas normales con propiedades independientes
      for (let i = 0; i < numParticles; i++) {
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

      // Inicializar contador de sesiones
      updateSessionCount();
    };

    p.draw = () => {
      settings = storage.loadSettings();
      const style = settings.weatherStyle || null;

      // 1. FONDO DINÁMICO CON GRADIENTE TÉRMICO
      drawThermalGradient(style);

      // 2. NIEBLA (si visibilidad baja)
      if (style && style.fog01 > 0.3) {
        drawFog(style.fog01);
      }

      // 3. NUBES (si hay nubosidad)
      if (style && style.c01 > 0.2) {
        drawClouds(style.c01);
      }

      // Aplicar parámetros de entorno al audio
      if (style && typeof thereminAudio.setEnvironment === 'function') {
        thereminAudio.setEnvironment(style);
      }

      let tiltX = motionSensor.getTiltX();
      let tiltY = motionSensor.getTiltY();

      const sens = Number.isFinite(settings.sensitivity) ? settings.sensitivity : 1.0;
      let adjustedTiltX = tiltX * sens;
      let adjustedTiltY = tiltY * sens;

      adjustedTiltX = Math.max(-1, Math.min(1, adjustedTiltX));
      adjustedTiltY = Math.max(-1, Math.min(1, adjustedTiltY));

      thereminAudio.update(adjustedTiltX, adjustedTiltY);

      // Actualizar debug overlay
      updateDebugOverlay(adjustedTiltX, adjustedTiltY);

      // 4. PARTÍCULAS CON COLOR SECUNDARIO - MOVIMIENTO INDEPENDIENTE
      for (let particle of particles) {
        particle.update(adjustedTiltX, adjustedTiltY, style);
        particle.display(style);
      }

      // 5. ONDAS CON TURBULENCIA Y GLOW
      if (settings.visualMode === 1) {
        drawWavesWithEffects(adjustedTiltX, adjustedTiltY, style);
      }

      // 6. PRECIPITACIÓN (lluvia/nieve)
      if (style && style.p01 > 0.05) {
        updatePrecipitation(style, adjustedTiltY);
      }
    };

    // NUEVA FUNCIÓN: Actualizar contador de sesiones
    function updateSessionCount() {
      if (debugSessionCount) {
        const sessionStats = storage.getSessionStats();
        debugSessionCount.textContent = sessionStats.totalSessions;
      }
    }

    // NUEVA FUNCIÓN: Actualizar debug overlay
    function updateDebugOverlay(tiltX, tiltY) {
      // MOTION
      if (debugTiltX) debugTiltX.textContent = tiltX.toFixed(3);
      if (debugTiltY) debugTiltY.textContent = tiltY.toFixed(3);
      
      const intensity = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
      if (debugIntensity) debugIntensity.textContent = intensity.toFixed(3);

      // AUDIO - Leer directamente de thereminAudio
      if (debugFrequency) {
        debugFrequency.textContent = (thereminAudio.currentFrequency || 0).toFixed(1);
      }
      
      if (debugWaveType) {
        debugWaveType.textContent = thereminAudio.waveType || 'sine';
      }
      
      if (debugVolume) {
        debugVolume.textContent = (thereminAudio.currentVolume || 0).toFixed(2);
      }
      
      if (debugScale) {
        debugScale.textContent = thereminAudio.currentScale || 'pentatonic_major';
      }
      
      if (debugNote) {
        debugNote.textContent = thereminAudio.currentNote || '-';
      }

      // CLIMA - Leer de weatherStyle y settings
      const weatherStyle = settings.weatherStyle;
      
      if (debugTemperature && weatherStyle && weatherStyle.rawData) {
        debugTemperature.textContent = weatherStyle.rawData.temperature.toFixed(1);
      }
      
      if (debugHumidity && weatherStyle && weatherStyle.rawData) {
        debugHumidity.textContent = weatherStyle.rawData.humidity;
      }
      
      if (debugWind && weatherStyle && weatherStyle.rawData) {
        debugWind.textContent = weatherStyle.rawData.windSpeed.toFixed(1);
      }
      
      if (debugClouds && weatherStyle && weatherStyle.rawData) {
        debugClouds.textContent = weatherStyle.rawData.cloudCover;
      }

      // SISTEMA
      if (debugMode) {
        debugMode.textContent = motionSensor.isDebugMode ? 'DEBUG (mouse)' : 'SENSOR (device)';
      }

      // ACTUALIZAR SESIONES
      updateSessionCount();
    }

    // FUNCIÓN 1: Gradiente térmico según temperatura
    function drawThermalGradient(style) {
      if (!style || !style.gradientStart || !style.gradientEnd) {
        p.background(0);
        return;
      }

      for (let y = 0; y < p.height; y++) {
        const inter = p.map(y, 0, p.height, 0, 1);
        const c = p.lerpColor(
          p.color(style.gradientStart),
          p.color(style.gradientEnd),
          inter
        );
        p.stroke(c);
        p.line(0, y, p.width, y);
      }
    }

    // FUNCIÓN 2: Niebla según visibilidad
    function drawFog(fogIntensity) {
      const alpha = p.map(fogIntensity, 0, 1, 0, 150);
      p.fill(200, 200, 220, alpha);
      p.noStroke();
      p.rect(0, 0, p.width, p.height);
    }

    // FUNCIÓN 3: Nubes según nubosidad
    function drawClouds(cloudCover) {
      const opacity = p.map(cloudCover, 0, 1, 0, 80);
      p.noStroke();
      p.fill(50, 50, 70, opacity);

      for (let cloud of cloudLayers) {
        cloud.x += cloud.speed;
        if (cloud.x > p.width + cloud.size) {
          cloud.x = -cloud.size;
        }
        p.ellipse(cloud.x, cloud.y, cloud.size, cloud.size * 0.6);
      }
    }

    // FUNCIÓN 4: Ondas con turbulencia por viento y glow por humedad
    function drawWavesWithEffects(tiltX, tiltY, style) {
      if (!style) return;

      // Configurar glow según humedad
      const glowRadius = p.map(style.h01, 0, 1, 5, 40);
      const strokeWeight = p.map(style.h01, 0, 1, 1, 4);
      
      p.drawingContext.shadowBlur = glowRadius;
      p.drawingContext.shadowColor = style.primary || '#00D1FF';
      
      p.noFill();
      p.strokeWeight(strokeWeight);
      p.stroke(style.primary || '#00D1FF');

      // Turbulencia por viento
      const turbulence = style.w01 || 0;

      // OBTENER TIPO DE ONDA DESDE SETTINGS
      const waveType = settings.waveType || 'sine';

      for (let i = 0; i < 3; i++) {
        p.beginShape();
        for (let x = 0; x < p.width; x += 10) {
          let amplitude = 50 + tiltY * 50;
          let frequency = 0.01 + tiltX * 0.01;
          let offset = i * 50;
          
          // Añadir ruido por turbulencia
          const noiseAmount = turbulence * 30;
          const noiseValue = p.noise(x * 0.01, p.millis() * 0.001 + i) * noiseAmount;
          
          let waveValue;
          const phase = x * frequency + p.millis() * 0.001;

          // APLICAR TIPO DE ONDA SEGÚN SETTINGS
          switch(waveType) {
            case 'sine':
              waveValue = p.sin(phase);
              break;
            case 'square':
              waveValue = p.sin(phase) > 0 ? 1 : -1;
              break;
            case 'sawtooth':
              waveValue = ((phase % p.TWO_PI) / p.TWO_PI) * 2 - 1;
              break;
            case 'triangle':
              const sawValue = ((phase % p.TWO_PI) / p.PI);
              waveValue = Math.abs(sawValue - 1) * 2 - 1;
              break;
            default:
              waveValue = p.sin(phase);
          }
          
          let y = p.height / 2 + offset + 
                  waveValue * amplitude +
                  noiseValue;
          
          p.vertex(x, y);
        }
        p.endShape();
      }

      // Resetear shadow
      p.drawingContext.shadowBlur = 0;
    }

    // FUNCIÓN 5: Sistema de precipitación
    function updatePrecipitation(style, pitch) {
      const isSnow = style.isSnow || false;
      const intensity = style.p01;

      // Crear nuevas partículas de precipitación
      if (p.random() < intensity * 0.5) {
        precipitationParticles.push({
          x: p.random(p.width),
          y: -10,
          speed: isSnow ? p.random(1, 3) : p.random(5, 15),
          size: isSnow ? p.random(3, 6) : p.random(1, 3),
          isSnow: isSnow
        });
      }

      // Actualizar y dibujar precipitación
      for (let i = precipitationParticles.length - 1; i >= 0; i--) {
        const drop = precipitationParticles[i];
        drop.y += drop.speed + Math.abs(pitch) * 2;

        if (drop.isSnow) {
          // Nieve
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.ellipse(drop.x, drop.y, drop.size);
        } else {
          // Lluvia
          p.stroke(150, 180, 220, 220);
          p.strokeWeight(drop.size);
          p.line(drop.x, drop.y, drop.x, drop.y + drop.size * 4);
        }

        // Eliminar si sale de pantalla
        if (drop.y > p.height) {
          precipitationParticles.splice(i, 1);
        }
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
