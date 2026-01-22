// environment.js
export class EnvironmentService {
  // 1) Geocoding: ciudad → lat/lon (Open-Meteo tiene endpoint propio)
  async geocodeCity(city) {
    const q = encodeURIComponent(city.trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=es&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('Ciudad no encontrada');
    }

    const r = data.results[0];
    return {
      name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`,
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone || 'auto',
    };
  }

  // 2) Weather: lat/lon → estado actual (añadimos variables para mapeo visual/sonoro)
  async fetchMeteo(lat, lon, timezone = 'auto') {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      // Nota: usamos variables "current" para poder mapear en tiempo real.
      // - weather_code: clave para saber si hay niebla/lluvia/nieve/tormenta
      // - visibility y humidity: necesarios para fog/blur/reverb
      `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,visibility,precipitation,weather_code,is_day` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Meteo error: ${res.status}`);
    const data = await res.json();

    const c = data.current;
    // Normalizamos un “estado” simple para mapear a sonido/visual
    const meteo = {
      temperature: c.temperature_2m,              // ºC
      humidity: c.relative_humidity_2m,          // %
      cloudCover: c.cloud_cover,                  // 0..100
      windSpeed: c.wind_speed_10m,                // km/h (según config)
      visibility: c.visibility,                   // metros
      precipitation: c.precipitation,             // mm
      weatherCode: c.weather_code,                // WMO (Open-Meteo)
      isDay: c.is_day === 1,
    };

    return meteo;
  }

  // 3) Decisión de escala (simple, defendible y clara)
  decideScale(meteo) {
    const temp = meteo.temperature;
    const weather = meteo.weatherCode;

    // Tormentas y clima extremo
    if (this.isStormCode(weather)) {
      return { scaleName: 'blues', mood: 'Tormentoso', waveType: 'square' };
    }

    // Nieve - etéreo y suave
    if (this.isSnowCode(weather)) {
      return { scaleName: 'lydian', mood: 'Nevado', waveType: 'sine' };
    }

    // Lluvia - melancólico pero consonante
    if (this.isRainCode(weather)) {
      return { scaleName: 'dorian', mood: 'Lluvioso', waveType: 'triangle' };
    }

    // Niebla - misterioso
    if (this.isFogCode(weather)) {
      return { scaleName: 'pentatonic_minor', mood: 'Neblinoso', waveType: 'sine' };
    }

    // Por temperatura (cuando no hay condiciones especiales)
    if (temp < 0) {
      return { scaleName: 'pentatonic_minor', mood: 'Gélido', waveType: 'sine' };
    } else if (temp >= 0 && temp < 10) {
      return { scaleName: 'dorian', mood: 'Frío', waveType: 'triangle' };
    } else if (temp >= 10 && temp < 20) {
      return { scaleName: 'pentatonic_major', mood: 'Templado', waveType: 'sine' };
    } else if (temp >= 20 && temp < 30) {
      return { scaleName: 'mixolydian', mood: 'Cálido', waveType: 'sawtooth' };
    } else {
      return { scaleName: 'major', mood: 'Caluroso', waveType: 'sine' };
    }
  }

  // 4) WeatherStyle: normaliza 0..1 + paleta + flags (contrato UI/Audio)
  buildWeatherStyle(meteo) {
    const temp = meteo.temperature;
    const palette = this.pickPaletteByTemp(temp);

    return {
      // Normalizado 0..1
      t01: this.normalize(temp, -20, 40),
      h01: this.normalize(meteo.humidity, 0, 100),
      c01: this.normalize(meteo.cloudCover, 0, 100),
      w01: this.normalize(meteo.windSpeed, 0, 30),
      vis01: this.normalize(meteo.visibility, 0, 10000),
      fog01: 1 - this.normalize(meteo.visibility, 0, 10000),
      p01: this.normalize(meteo.precipitation, 0, 10),

      // Colores
      primary: palette.primary,
      secondary: palette.secondary,
      gradientStart: palette.gradientStart,
      gradientEnd: palette.gradientEnd,

      // Flags
      isFog: this.isFogCode(meteo.weatherCode),
      isRain: this.isRainCode(meteo.weatherCode),
      isSnow: this.isSnowCode(meteo.weatherCode),
      isStorm: this.isStormCode(meteo.weatherCode),
      isDay: meteo.isDay,

      // NUEVO: Datos raw para debug
      rawData: {
        temperature: meteo.temperature,
        humidity: meteo.humidity,
        windSpeed: meteo.windSpeed,
        cloudCover: meteo.cloudCover
      }
    };
  }

  pickPaletteByTemp(tempC) {
    if (tempC < 0) {
      return {
        name: 'Hielo Ártico',
        primary: '#AEEFFF',
        secondary: '#2E5A88',
        gradientStart: '#0A1929',
        gradientEnd: '#2E5A88'
      };
    } else if (tempC < 10) {
      return {
        name: 'Noche de Invierno',
        primary: '#7BB4FF',
        secondary: '#4B0082',
        gradientStart: '#1A0033',
        gradientEnd: '#4B0082'
      };
    } else if (tempC < 20) {
      return {
        name: 'Azul Eléctrico',
        primary: '#00D1FF',
        secondary: '#FF007A',
        gradientStart: '#000814',
        gradientEnd: '#001D3D'
      };
    } else if (tempC < 30) {
      return {
        name: 'Atardecer Tropical',
        primary: '#FFD700',
        secondary: '#FF4500',
        gradientStart: '#3D0814',
        gradientEnd: '#8B0000'
      };
    } else {
      return {
        name: 'Calor Volcánico',
        primary: '#FF3131',
        secondary: '#5D0000',
        gradientStart: '#2D0000',
        gradientEnd: '#8B0000'
      };
    }
  }

  normalize(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // WMO / Open-Meteo weather codes (subset):
  // Fog: 45, 48
  // Rain: 51,53,55,61,63,65,80,81,82
  // Snow: 71,73,75,77,85,86
  // Storm: 95,96,99
  isFogCode(code) {
    return code === 45 || code === 48;
  }
  isRainCode(code) {
    return [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
  }
  isSnowCode(code) {
    return [71, 73, 75, 77, 85, 86].includes(code);
  }
  isStormCode(code) {
    return [95, 96, 99].includes(code);
  }
}
