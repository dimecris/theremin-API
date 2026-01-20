/**
 * MÓDULO DE SÍNTESIS DE AUDIO CON P5.SOUND
 * 
 * Usa la librería p5.sound en lugar de Web Audio API directamente.
 * p5.sound simplifica la síntesis de audio pero tiene menos control de bajo nivel.
 * 
 * HAPTICS (FEEDBACK TÁCTIL):
 * Este módulo usa @capacitor/haptics para dar feedback táctil en dispositivos móviles.
 * Los haptics son vibraciones controladas que mejoran la UX al proporcionar confirmación
 * física de acciones. En este theremin:
 * - ImpactStyle.Medium: vibración moderada al iniciar el audio (confirma acción importante)
 * - ImpactStyle.Light: vibración suave al parar (confirma finalización)
 * 
 * Los haptics NO funcionan en desktop/navegadores web, solo en apps móviles nativas
 * compiladas con Capacitor. Por eso usamos try/catch para evitar errores en desarrollo.
 */



import { Haptics, ImpactStyle } from '@capacitor/haptics';

export class ThereminAudio {
  constructor() {
    this.osc = null; // p5.Oscillator
    this.gain = null; // p5.Gain
    this.filter = null; // p5.Filter
    this.isPlaying = false;
    
    this.minFreq = 200;
    this.maxFreq = 1000;
    
    this.baseVolume = 0.3;
    this.targetFrequency = 440;
    
    this.pentatonicScale = this.generatePentatonicScale();
    this.useQuantization = true;
  }

  // Genera una escala pentatónica mayor (intervalos: 0, 2, 4, 7, 9 semitonos)
  // Ejemplo: Do, Re, Mi, Sol, La
  generatePentatonicScale() {
    const baseFreq = 220; // Frecuencia base: La (A3)
    const intervals = [0, 2, 4, 7, 9]; // Intervalos de la pentatónica mayor
    const octaves = 3; // Genera 3 octavas para tener suficiente rango
    const scale = [];
    
    for (let octave = 0; octave < octaves; octave++) {
      for (let interval of intervals) {
        // Calcula cada frecuencia usando la fórmula: freq = baseFreq * 2^(semitonos/12)
        const semitones = (octave * 12) + interval;
        const frequency = baseFreq * Math.pow(2, semitones / 12);
        scale.push(frequency);
      }
    }
    
    // Ordena las frecuencias de menor a mayor
    return scale.sort((a, b) => a - b);
  }

  // Encuentra la nota más cercana en la escala pentatónica para que suene musical
  quantizeFrequency(targetFreq) {
    if (!this.useQuantization) {
      return targetFreq;
    }
    
    let closest = this.pentatonicScale[0];
    let minDiff = Math.abs(targetFreq - closest);
    
    // Busca la frecuencia de la escala más cercana a la objetivo
    for (let freq of this.pentatonicScale) {
      const diff = Math.abs(targetFreq - freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = freq;
      }
    }
    
    return closest;
  }

  async init() {
    try {
      // Crea los objetos de p5.sound (requiere que p5 esté cargado en index.html)
      this.osc = new p5.Oscillator();
      this.filter = new p5.Filter();
      this.gain = new p5.Gain();
      
      // Configuro el oscilador
      this.osc.setType('sine');
      this.osc.freq(440);
      
      // Configuro el filtro pasa-bajos
      this.filter.setType('lowpass');
      this.filter.freq(2000);
      this.filter.res(1);
      
      // Configuro la ganancia (volumen)
      this.gain.setInput(this.osc);
      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      
      // Configuro volumen inicial a 0
      this.gain.amp(0);
      
      console.log('Audio inicializado con p5.sound');
      console.log('Escala pentatónica:', this.pentatonicScale.map(f => f.toFixed(1)));
      return true;
      
    } catch (error) {
      console.error('Error al inicializar el audio:', error);
      return false;
    }
  }

  async start() {
  if (!this.osc) return;

  // p5: asegúrate de activar audio tras gesto
  if (typeof userStartAudio === "function") {
    try { await userStartAudio(); } catch(e) {}
  }

  this.osc.start();
  this.gain.amp(this.baseVolume, 0.1);
  this.isPlaying = true;
}
  async stop() {
    if (!this.osc) return;cd 
    
    // Fade out del volumen
    this.gain.amp(0, 0.1);
    
    // Detengo el oscilador después del fade
    setTimeout(() => {
      if (this.osc) {
        this.osc.stop();
      }
    }, 100);
    
    this.isPlaying = false;
    
    // Feedback háptico suave al detener (vibración ligera para confirmar parada)
    // ImpactStyle.Light = vibración suave y breve
    // Usamos una vibración más suave que al iniciar porque es una acción menos prominente
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.log('Haptics no disponible en este dispositivo');
    }
    
    console.log('Audio pausado');
  }

  // Actualiza los parámetros del audio según la inclinación (llamado cada frame)
update(tiltX, tiltY) {
  if (!this.isPlaying || !this.osc) return;

  // 1) Evita NaN/Infinity
  if (!Number.isFinite(tiltX)) tiltX = 0;
  if (!Number.isFinite(tiltY)) tiltY = 0;

  // 2) Limita rango
  tiltX = Math.max(-1, Math.min(1, tiltX));
  tiltY = Math.max(-1, Math.min(1, tiltY));

  const normalizedX = (tiltX + 1) / 2;
  const rawFrequency = this.minFreq + (normalizedX * (this.maxFreq - this.minFreq));

  const frequency = this.quantizeFrequency(rawFrequency);

  // 3) Extra seguridad: freq nunca <= 0
  const safeFreq = Number.isFinite(frequency) ? Math.max(1, frequency) : 440;

  this.targetFrequency = safeFreq;
  this.osc.freq(safeFreq, 0.01);

  const normalizedY = (tiltY + 1) / 2;
  const filterFreq = 400 + (normalizedY * 1400);

  const safeFilter = Number.isFinite(filterFreq) ? Math.max(10, filterFreq) : 2000;
  this.filter.freq(safeFilter);
}


  // Cambia el tipo de onda del oscilador (cada tipo tiene un timbre diferente)
  setWaveType(type) {
    if (!this.osc) return;
    if (['sine', 'square', 'sawtooth', 'triangle'].includes(type)) {
      const wasPlaying = this.isPlaying;
      if (wasPlaying) {
        this.osc.stop();
      }
      this.osc.setType(type);
      if (wasPlaying) {
        this.osc.start();
        this.osc.freq(this.targetFrequency, 0.01); // Restaura frecuencia
        this.gain.amp(this.baseVolume, 0.1); // Restaura volumen
      }
      console.log('Tipo de onda cambiado a:', type);
    }
  }

  // Limpio los recursos al destruir el objeto
  dispose() {
    if (this.osc) {
      this.osc.stop();
      this.osc.dispose();
    }
    if (this.filter) {
      this.filter.dispose();
    }
    if (this.gain) {
      this.gain.dispose();
    }
  }
}