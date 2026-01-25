/**
 * MÓDULO DE AUDIO (THEREMIN)
 * Genera sonido mediante oscilador con efectos ambientales
 */

export class ThereminAudio {
  
  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor() {
    // Contexto de audio Web API
    this.audioContext = null;
    this.osc = null;
    this.gain = null;
    this.filter = null;
    this.lfo = null;
    this.lfoGain = null;
    this.isRunning = false;

    // Rango de frecuencias (A3 - A5)
    this.minFreq = 220;
    this.maxFreq = 880;

    // Configuración de sonido
    this.waveType = 'sine';
    this.currentScale = 'pentatonic_major';
    this.scaleNotes = this.getScaleNotes('pentatonic_major');
    this.glideTime = 0.05; // Portamento suave entre notas

    // Estado público para debug
    this.currentFrequency = 0;
    this.currentVolume = 0;
    this.currentNote = '-';
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  
  /**
   * Inicializa el contexto de audio y la cadena de efectos
   * Cadena: Oscilador -> Filtro -> Ganancia -> Salida
   */
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Crear oscilador principal
      this.osc = this.audioContext.createOscillator();
      this.osc.type = this.waveType;
      this.osc.frequency.setValueAtTime(this.minFreq, this.audioContext.currentTime);

      // Control de volumen
      this.gain = this.audioContext.createGain();
      this.gain.gain.setValueAtTime(0, this.audioContext.currentTime);

      // Filtro paso bajo para simular humedad
      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(12000, this.audioContext.currentTime);

      // LFO (Low Frequency Oscillator) para vibrato según viento
      this.lfo = this.audioContext.createOscillator();
      this.lfoGain = this.audioContext.createGain();
      this.lfo.frequency.setValueAtTime(5, this.audioContext.currentTime);
      this.lfoGain.gain.setValueAtTime(0, this.audioContext.currentTime);

      // Conectar cadena principal: osc -> filter -> gain -> destination
      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.audioContext.destination);

      // Conectar LFO para modular frecuencia
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc.frequency);
      this.lfo.start();

      console.log('Audio inicializado correctamente');
      return true;
    } catch (error) {
      console.error('Error inicializando audio:', error);
      return false;
    }
  }

  // ============================================
  // CONTROL DE REPRODUCCIÓN
  // ============================================
  
  /**
   * Inicia la reproducción de audio
   */
  async start() {
    if (!this.osc || this.isRunning) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.osc.start();
      this.isRunning = true;
      console.log('Theremin iniciado');
    } catch (error) {
      console.error('Error al iniciar theremin:', error);
    }
  }

  /**
   * Detiene la reproducción de audio
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      this.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      setTimeout(() => {
        this.osc?.stop();
        this.osc?.disconnect();
        this.osc = null;
        this.isRunning = false;
        console.log('Theremin detenido');
      }, 100);
    } catch (error) {
      console.error('Error al detener:', error);
    }
  }

  // ============================================
  // ACTUALIZACIÓN DE AUDIO
  // ============================================
  
  /**
   * Actualiza frecuencia y volumen según inclinación del dispositivo
   * @param {number} tiltX - Inclinación horizontal (-1 a 1)
   * @param {number} tiltY - Inclinación vertical (-1 a 1)
   */
  update(tiltX, tiltY) {
    if (!this.audioContext || !this.osc || !this.gain) return;

    const now = this.audioContext.currentTime;

    // Calcular frecuencia cuantizada a la escala musical
    const normX = (tiltX + 1) / 2;
    const rawFreq = this.minFreq + normX * (this.maxFreq - this.minFreq);
    const quantizedFreq = this.quantizeToScale(rawFreq);
    
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
    this.osc.frequency.exponentialRampToValueAtTime(quantizedFreq, now + this.glideTime);

    // Calcular volumen
    const normY = (tiltY + 1) / 2;
    const volume = Math.max(0, Math.min(1, normY));
    
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.03);

    // Actualizar estado para debug
    this.currentFrequency = quantizedFreq;
    this.currentVolume = volume;
    this.currentNote = this.getNoteName(quantizedFreq);
  }

  // ============================================
  // CUANTIZACIÓN MUSICAL
  // ============================================
  
  /**
   * Cuantiza una frecuencia a la nota más cercana de la escala
   */
  quantizeToScale(freq) {
    if (!this.scaleNotes?.length) return freq;

    return this.scaleNotes.reduce((closest, note) => 
      Math.abs(freq - note) < Math.abs(freq - closest) ? note : closest
    );
  }

  /**
   * Convierte una frecuencia a nombre de nota (ej: A4, C#5)
   */
  getNoteName(freq) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = 12 * Math.log2(freq / A4);
    const noteIndex = Math.round(halfSteps) % 12;
    const octave = Math.floor((Math.round(halfSteps) + 57) / 12);
    
    return `${noteNames[(noteIndex + 12) % 12]}${octave}`;
  }

  // ============================================
  // CONFIGURACIÓN DE SONIDO
  // ============================================
  
  /**
   * Cambia el tipo de forma de onda
   */
  setWaveType(type) {
    const validTypes = ['sine', 'square', 'sawtooth', 'triangle'];
    if (validTypes.includes(type) && this.osc) {
      this.waveType = type;
      this.osc.type = type;
      console.log('Tipo de onda:', type);
    }
  }

  /**
   * Cambia la escala musical
   */
  setScale(scaleName) {
    this.currentScale = scaleName;
    this.scaleNotes = this.getScaleNotes(scaleName);
    console.log('Escala musical:', scaleName);
  }

  /**
   * Genera las frecuencias de una escala musical
   */
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

    // Generar 3 octavas de la escala
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

  // ============================================
  // EFECTOS AMBIENTALES
  // ============================================
  
  /**
   * Aplica efectos de audio según condiciones meteorológicas
   * @param {Object} style - Objeto con datos del clima (h01: humedad, w01: viento)
   */
  setEnvironment(style) {
    if (!this.audioContext || !this.filter || !this.lfoGain) {
      console.log('Audio no inicializado, saltando efectos ambientales');
      return;
    }

    const now = this.audioContext.currentTime;

    // Humedad afecta al filtro paso bajo (2kHz - 12kHz)
    // Más humedad = frecuencia de corte más baja = sonido más apagado
    const cutoff = 2000 + (1 - (style?.h01 ?? 0)) * 10000;
    this.filter.frequency.setTargetAtTime(cutoff, now, 0.05);

    // Viento afecta a la profundidad del vibrato
    // Más viento = más oscilación en la frecuencia
    const depthHz = (style?.w01 ?? 0) * 8;
    this.lfoGain.gain.setTargetAtTime(depthHz, now, 0.05);
  }

  // ============================================
  // LIMPIEZA
  // ============================================
  
  /**
   * Limpia y cierra todos los recursos de audio
   */
  dispose() {
    this.osc?.stop();
    this.lfo?.stop();
    this.osc?.disconnect();
    this.filter?.disconnect();
    this.gain?.disconnect();
    this.lfo?.disconnect();
    this.lfoGain?.disconnect();
    this.audioContext?.close();
    
    this.audioContext = null;
    this.osc = null;
    this.gain = null;
    this.filter = null;
    this.lfo = null;
    this.lfoGain = null;
  }
}
