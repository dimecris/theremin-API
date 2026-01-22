/**
 * MÓDULO DE AUDIO (THEREMIN)
 * Genera sonido mediante oscilador con efectos ambientales
 */

export class ThereminAudio {
  constructor() {
    this.audioContext = null;
    this.osc = null;
    this.gain = null;
    this.isRunning = false;

    // MODIFICADO: Rango de frecuencias más cálido y musical
    this.minFreq = 220; // A3 - más grave y cálido
    this.maxFreq = 880; // A5 - dos octavas arriba

    // Tipo de onda (sine por defecto = más suave)
    this.waveType = 'sine';

    // Escala musical (pentatónica por defecto = más consonante)
    this.currentScale = 'pentatonic_major';
    this.scaleNotes = this.getScaleNotes('pentatonic_major');

    // Propiedades públicas para debug
    this.currentFrequency = 0;
    this.currentVolume = 0;
    this.currentNote = '-';

    // Suavizado de transiciones (glide/portamento)
    this.glideTime = 0.05; // 50ms de transición suave entre notas

    // Parámetros ambientales (PR2)
    this.envParams = {
      reverb: 0,
      filter: 1000,
      distortion: 0
    };
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      this.osc = this.audioContext.createOscillator();
      this.osc.type = this.waveType;
      this.osc.frequency.setValueAtTime(this.minFreq, this.audioContext.currentTime);

      this.gain = this.audioContext.createGain();
      this.gain.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.audioContext.destination);

      console.log('✅ Audio inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando audio:', error);
      return false;
    }
  }

  async start() {
    if (!this.osc || this.isRunning) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.osc.start();
      this.isRunning = true;
      console.log('🎵 Theremin iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar theremin:', error);
    }
  }

  async stop() {
    if (!this.isRunning) return;

    try {
      this.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      setTimeout(() => {
        if (this.osc) {
          this.osc.stop();
          this.osc.disconnect();
          this.osc = null;
        }
        this.isRunning = false;
        console.log('🔇 Theremin detenido');
      }, 100);
    } catch (error) {
      console.error('Error al detener theremin:', error);
    }
  }

  update(tiltX, tiltY) {
    if (!this.osc || !this.gain) return;

    const normalizedTiltX = (tiltX + 1) / 2;
    const normalizedTiltY = (tiltY + 1) / 2;

    // Frecuencia cuantizada a escala musical
    const rawFreq = this.minFreq + normalizedTiltX * (this.maxFreq - this.minFreq);
    const quantizedFreq = this.quantizeToScale(rawFreq);
    
    // NUEVO: Transición suave (exponentialRampToValueAtTime)
    const now = this.audioContext.currentTime;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
    this.osc.frequency.exponentialRampToValueAtTime(
      quantizedFreq,
      now + this.glideTime
    );

    // Volumen con transición suave
    const volume = Math.max(0, Math.min(1, normalizedTiltY));
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(
      volume * 0.3,
      now + 0.03 // 30ms de transición en volumen
    );

    // Actualizar propiedades públicas
    this.currentFrequency = quantizedFreq;
    this.currentVolume = volume;
    this.currentNote = this.getNoteName(quantizedFreq);
  }

  quantizeToScale(freq) {
    if (!this.scaleNotes || this.scaleNotes.length === 0) {
      return freq;
    }

    let closestNote = this.scaleNotes[0];
    let minDiff = Math.abs(freq - closestNote);

    for (let note of this.scaleNotes) {
      const diff = Math.abs(freq - note);
      if (diff < minDiff) {
        minDiff = diff;
        closestNote = note;
      }
    }

    return closestNote;
  }

  // NUEVO: Obtener nombre de nota musical
  getNoteName(freq) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = 12 * Math.log2(freq / A4);
    const noteIndex = Math.round(halfSteps) % 12;
    const octave = Math.floor((Math.round(halfSteps) + 57) / 12);
    
    return `${noteNames[(noteIndex + 12) % 12]}${octave}`;
  }

  setWaveType(type) {
    const validTypes = ['sine', 'square', 'sawtooth', 'triangle'];
    if (validTypes.includes(type) && this.osc) {
      this.waveType = type;
      this.osc.type = type;
      console.log('🎵 Tipo de onda cambiado a:', type);
    }
  }

  setScale(scaleName) {
    this.currentScale = scaleName;
    this.scaleNotes = this.getScaleNotes(scaleName);
    console.log('🎼 Escala cambiada a:', scaleName);
  }

  getScaleNotes(scaleName) {
    const baseFreq = 261.63; // C4
    
    const scales = {
      // Escalas mayores - más alegres y consonantes
      'major': [0, 2, 4, 5, 7, 9, 11, 12],
      'ionian': [0, 2, 4, 5, 7, 9, 11, 12], // Modo mayor clásico
      
      // Escalas menores - más melancólicas pero consonantes
      'minor': [0, 2, 3, 5, 7, 8, 10, 12],
      'dorian': [0, 2, 3, 5, 7, 9, 10, 12], // Menor más suave
      
      // Pentatónicas - las MÁS consonantes (sin semitonos)
      'pentatonic_major': [0, 2, 4, 7, 9, 12],
      'pentatonic_minor': [0, 3, 5, 7, 10, 12],
      
      // Blues - consonante pero con carácter
      'blues': [0, 3, 5, 6, 7, 10, 12],
      
      // NUEVAS: Escalas más exóticas pero consonantes
      'lydian': [0, 2, 4, 6, 7, 9, 11, 12], // Etérea, soñadora
      'mixolydian': [0, 2, 4, 5, 7, 9, 10, 12], // Alegre, folclórica
      
      // Cromática - solo para efectos especiales
      'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    };

    const intervals = scales[scaleName] || scales['pentatonic_major'];
    const notes = [];

    // Generar 3 octavas para más rango
    for (let octave = 0; octave < 3; octave++) {
      for (let interval of intervals) {
        const freq = baseFreq * Math.pow(2, (octave * 12 + interval) / 12);
        if (freq >= this.minFreq && freq <= this.maxFreq) {
          notes.push(freq);
        }
      }
    }

    return notes.sort((a, b) => a - b);
  }

  setEnvironment(style) {
    if (!style) return;
    
    console.log('🌦️ Parámetros ambientales aplicados:', {
      humedad: style.h01,
      viento: style.w01,
      temperatura: style.t01
    });
  }

  dispose() {
    if (this.osc) {
      this.osc.stop();
      this.osc.disconnect();
    }
    if (this.gain) {
      this.gain.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
