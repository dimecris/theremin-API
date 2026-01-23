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

    // Rango de frecuencias (A3 - A5)
    this.minFreq = 220;
    this.maxFreq = 880;

    // Configuración
    this.waveType = 'sine';
    this.currentScale = 'pentatonic_major';
    this.scaleNotes = this.getScaleNotes('pentatonic_major');
    this.glideTime = 0.05; // Portamento suave

    // Estado público (debug)
    this.currentFrequency = 0;
    this.currentVolume = 0;
    this.currentNote = '-';
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

      console.log('✅ Audio inicializado');
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
        this.osc?.stop();
        this.osc?.disconnect();
        this.osc = null;
        this.isRunning = false;
        console.log('🔇 Theremin detenido');
      }, 100);
    } catch (error) {
      console.error('❌ Error al detener:', error);
    }
  }

  update(tiltX, tiltY) {
    if (!this.osc || !this.gain) return;

    const now = this.audioContext.currentTime;

    // Frecuencia cuantizada
    const normX = (tiltX + 1) / 2;
    const rawFreq = this.minFreq + normX * (this.maxFreq - this.minFreq);
    const quantizedFreq = this.quantizeToScale(rawFreq);
    
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
    this.osc.frequency.exponentialRampToValueAtTime(quantizedFreq, now + this.glideTime);

    // Volumen
    const normY = (tiltY + 1) / 2;
    const volume = Math.max(0, Math.min(1, normY));
    
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.03);

    // Actualizar estado
    this.currentFrequency = quantizedFreq;
    this.currentVolume = volume;
    this.currentNote = this.getNoteName(quantizedFreq);
  }

  quantizeToScale(freq) {
    if (!this.scaleNotes?.length) return freq;

    return this.scaleNotes.reduce((closest, note) => 
      Math.abs(freq - note) < Math.abs(freq - closest) ? note : closest
    );
  }

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
      console.log('🎵 Onda:', type);
    }
  }

  setScale(scaleName) {
    this.currentScale = scaleName;
    this.scaleNotes = this.getScaleNotes(scaleName);
    console.log('🎼 Escala:', scaleName);
  }

  getScaleNotes(scaleName) {
    const baseFreq = 261.63; // C4
    
    const scales = {
      major: [0, 2, 4, 5, 7, 9, 11, 12],
      ionian: [0, 2, 4, 5, 7, 9, 11, 12],
      minor: [0, 2, 3, 5, 7, 8, 10, 12],
      dorian: [0, 2, 3, 5, 7, 9, 10, 12],
      pentatonic_major: [0, 2, 4, 7, 9, 12],
      pentatonic_minor: [0, 3, 5, 7, 10, 12],
      blues: [0, 3, 5, 6, 7, 10, 12],
      lydian: [0, 2, 4, 6, 7, 9, 11, 12],
      mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    };

    const intervals = scales[scaleName] || scales.pentatonic_major;
    const notes = [];

    // Generar 3 octavas
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
    // Reservado para efectos futuros (reverb, filtros, etc.)
  }

  dispose() {
    this.osc?.stop();
    this.osc?.disconnect();
    this.gain?.disconnect();
    this.audioContext?.close();
  }
}
