/**
 * SERVICIO DE DATOS METEOROLÓGICOS
 * Geocoding + Weather API (Open-Meteo) + Mapeo a escalas musicales
 */

export class EnvironmentService {
  
  /**
   * Geocoding: ciudad → coordenadas
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

  /**
   * Weather: coordenadas → estado meteorológico actual
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

  /**
   * Decisión de escala musical según clima
   */
  decideScale(meteo) {
    const { temperature: t, weatherCode: w } = meteo;

    // Clima extremo
    if (this.isStormCode(w)) return { scaleName: 'blues', mood: 'Tormentoso', waveType: 'square' };
    if (this.isSnowCode(w))  return { scaleName: 'lydian', mood: 'Nevado', waveType: 'sine' };
    if (this.isRainCode(w))  return { scaleName: 'dorian', mood: 'Lluvioso', waveType: 'triangle' };
    if (this.isFogCode(w))   return { scaleName: 'pentatonic_minor', mood: 'Neblinoso', waveType: 'sine' };

    // Por temperatura
    if (t < 0)   return { scaleName: 'pentatonic_minor', mood: 'Gélido', waveType: 'sine' };
    if (t < 10)  return { scaleName: 'dorian', mood: 'Frío', waveType: 'triangle' };
    if (t < 20)  return { scaleName: 'pentatonic_major', mood: 'Templado', waveType: 'sine' };
    if (t < 30)  return { scaleName: 'mixolydian', mood: 'Cálido', waveType: 'sawtooth' };
    return { scaleName: 'major', mood: 'Caluroso', waveType: 'sine' };
  }

  /**
   * Construir estilo visual/sonoro normalizado (0..1)
   */
  buildWeatherStyle(meteo) {
    const palette = this.pickPaletteByTemp(meteo.temperature);

    return {
      // Valores normalizados 0..1
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

      // Flags booleanos
      isFog: this.isFogCode(meteo.weatherCode),
      isRain: this.isRainCode(meteo.weatherCode),
      isSnow: this.isSnowCode(meteo.weatherCode),
      isStorm: this.isStormCode(meteo.weatherCode),
      isDay: meteo.isDay,

      // Datos raw para debug
      rawData: {
        temperature: meteo.temperature,
        humidity: meteo.humidity,
        windSpeed: meteo.windSpeed,
        cloudCover: meteo.cloudCover
      }
    };
  }

  /**
   * Paleta de colores según temperatura
   */
  pickPaletteByTemp(t) {
    if (t < 0) return {
      name: 'Hielo Ártico',
      primary: '#AEEFFF',
      secondary: '#2E5A88',
      gradientStart: '#0A1929',
      gradientEnd: '#2E5A88'
    };
    
    if (t < 10) return {
      name: 'Noche de Invierno',
      primary: '#7BB4FF',
      secondary: '#4B0082',
      gradientStart: '#1A0033',
      gradientEnd: '#4B0082'
    };
    
    if (t < 20) return {
      name: 'Azul Eléctrico',
      primary: '#00D1FF',
      secondary: '#FF007A',
      gradientStart: '#000814',
      gradientEnd: '#001D3D'
    };
    
    if (t < 30) return {
      name: 'Atardecer Tropical',
      primary: '#FFD700',
      secondary: '#FF4500',
      gradientStart: '#3D0814',
      gradientEnd: '#8B0000'
    };
    
    return {
      name: 'Calor Volcánico',
      primary: '#FF3131',
      secondary: '#5D0000',
      gradientStart: '#2D0000',
      gradientEnd: '#8B0000'
    };
  }

  /**
   * Normalizar valor entre 0 y 1
   */
  norm(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Clasificación de códigos WMO (Open-Meteo)
   */
  isFogCode(code)   { return [45, 48].includes(code); }
  isRainCode(code)  { return [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code); }
  isSnowCode(code)  { return [71, 73, 75, 77, 85, 86].includes(code); }
  isStormCode(code) { return [95, 96, 99].includes(code); }
}
