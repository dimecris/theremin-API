/**
 * SERVICIO DE DATOS METEOROLÓGICOS
 * Geocoding + Weather API (Open-Meteo) + Mapeo a escalas musicales
 */

export class EnvironmentService {
  
  // ============================================
  // GEOCODING
  // ============================================
  
  /**
   * Geocoding: convierte nombre de ciudad a coordenadas geográficas
   * @param {string} city - Nombre de la ciudad
   * @returns {Object} Objeto con name, lat, lon, timezone
   */
  async geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=es&format=json`;
    const res = await fetch(url);
    
    if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
    
    const data = await res.json();
    if (!data.results?.length) throw new Error('Ciudad no encontrada');

    const r = data.results[0];
    return {
      name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`,
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone || 'auto'
    };
  }

  // ============================================
  // DATOS METEOROLÓGICOS
  // ============================================
  
  /**
   * Obtiene datos meteorológicos actuales de una ubicación
   * @param {number} lat - Latitud
   * @param {number} lon - Longitud
   * @param {string} timezone - Zona horaria
   * @returns {Object} Datos meteorológicos actuales
   */
  async fetchMeteo(lat, lon, timezone = 'auto') {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,visibility,precipitation,weather_code,is_day&timezone=${encodeURIComponent(timezone)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Meteo error: ${res.status}`);
    
    const { current: c } = await res.json();
    
    return {
      temperature: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      cloudCover: c.cloud_cover,
      windSpeed: c.wind_speed_10m,
      visibility: c.visibility,
      precipitation: c.precipitation,
      weatherCode: c.weather_code,
      isDay: c.is_day === 1
    };
  }

  // ============================================
  // MAPEO A ESCALAS MUSICALES
  // ============================================
  
  /**
   * Determina la escala musical según las condiciones meteorológicas
   * @param {Object} meteo - Datos meteorológicos
   * @returns {Object} Escala musical, mood y tipo de onda
   */
  decideScale(meteo) {
    const { temperature: t, weatherCode: w } = meteo;

    // Clasificación por fenómenos meteorológicos
    if (this.isStormCode(w)) return { scaleName: 'blues', mood: 'Tormentoso', waveType: 'square' };
    if (this.isSnowCode(w))  return { scaleName: 'lydian', mood: 'Nevado', waveType: 'sine' };
    if (this.isRainCode(w))  return { scaleName: 'dorian', mood: 'Lluvioso', waveType: 'triangle' };
    if (this.isFogCode(w))   return { scaleName: 'pentatonic_minor', mood: 'Neblinoso', waveType: 'sine' };

    // Clasificación por temperatura
    if (t < 0)   return { scaleName: 'pentatonic_minor', mood: 'Gélido', waveType: 'sine' };
    if (t < 10)  return { scaleName: 'dorian', mood: 'Frío', waveType: 'triangle' };
    if (t < 20)  return { scaleName: 'pentatonic_major', mood: 'Templado', waveType: 'sine' };
    if (t < 30)  return { scaleName: 'mixolydian', mood: 'Cálido', waveType: 'sawtooth' };
    return { scaleName: 'major', mood: 'Caluroso', waveType: 'sine' };
  }

  // ============================================
  // ESTILO VISUAL Y SONORO
  // ============================================
  
  /**
   * Construye un objeto de estilo visual y sonoro normalizado
   * @param {Object} meteo - Datos meteorológicos
   * @returns {Object} Estilo con valores normalizados y paleta de colores
   */
  buildWeatherStyle(meteo) {
    const palette = this.pickPaletteByTemp(meteo.temperature);

    return {
      // Valores normalizados entre 0 y 1
      t01: this.norm(meteo.temperature, -20, 40),
      h01: this.norm(meteo.humidity, 0, 100),
      c01: this.norm(meteo.cloudCover, 0, 100),
      w01: this.norm(meteo.windSpeed, 0, 30),
      vis01: this.norm(meteo.visibility, 0, 10000),
      fog01: 1 - this.norm(meteo.visibility, 0, 10000),
      p01: this.norm(meteo.precipitation, 0, 10),

      // Paleta de colores
      primary: palette.primary,
      secondary: palette.secondary,
      gradientStart: palette.gradientStart,
      gradientEnd: palette.gradientEnd,

      // Indicadores booleanos
      isFog: this.isFogCode(meteo.weatherCode),
      isRain: this.isRainCode(meteo.weatherCode),
      isSnow: this.isSnowCode(meteo.weatherCode),
      isStorm: this.isStormCode(meteo.weatherCode),
      isDay: meteo.isDay,

      // Datos originales para debug
      rawData: {
        temperature: meteo.temperature,
        humidity: meteo.humidity,
        windSpeed: meteo.windSpeed,
        cloudCover: meteo.cloudCover
      }
    };
  }

  // ============================================
  // PALETAS DE COLORES
  // ============================================
  
  /**
   * Selecciona paleta de colores según la temperatura
   * @param {number} t - Temperatura en grados Celsius
   * @returns {Object} Paleta con colores primary, secondary y gradientes
   */
  pickPaletteByTemp(t) {
    if (t < 0) return {
      name: 'Hielo Profundo',
      primary: '#8FBFD9',
      secondary: '#3E5F73',
      gradientStart: '#0B141C',
      gradientEnd: '#1C2E3A'
    };

    if (t < 10) return {
      name: 'Noche Fría',
      primary: '#6FA3C9',
      secondary: '#3A3F58',
      gradientStart: '#0F1120',
      gradientEnd: '#1F2238'
    };

    if (t < 20) return {
      name: 'Bruma Digital',
      primary: '#4FA3C4',
      secondary: '#B04A6A',
      gradientStart: '#0C0F14',
      gradientEnd: '#1A2230'
    };

    if (t < 30) return {
      name: 'Atardecer Suave',
      primary: '#D6A85F',
      secondary: '#A65A4D',
      gradientStart: '#1A1412',
      gradientEnd: '#3A2320'
    };

    return {
      name: 'Calor Denso',
      primary: '#C05A5A',
      secondary: '#5A2A2A',
      gradientStart: '#140A0A',
      gradientEnd: '#2A1414'
    };
  }

  // ============================================
  // UTILIDADES
  // ============================================
  
  /**
   * Normaliza un valor entre 0 y 1
   * @param {number} value - Valor a normalizar
   * @param {number} min - Valor mínimo del rango
   * @param {number} max - Valor máximo del rango
   * @returns {number} Valor normalizado entre 0 y 1
   */
  norm(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // ============================================
  // CLASIFICADORES DE CÓDIGOS METEOROLÓGICOS
  // ============================================
  
  isFogCode(code)   { return [45, 48].includes(code); }
  isRainCode(code)  { return [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code); }
  isSnowCode(code)  { return [71, 73, 75, 77, 85, 86].includes(code); }
  isStormCode(code) { return [95, 96, 99].includes(code); }
}
