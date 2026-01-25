Recopilando información del área de trabajo# Theremin Meteorológico

Aplicación experimental que explora la relación entre el clima, el movimiento del dispositivo y el sonido sintetizado, acompañada por visualizaciones generativas que evolucionan con el audio y las condiciones meteorológicas.

## Descripción

Theremin Meteorológico es una experiencia audiovisual interactiva donde el clima y el movimiento se transforman en música y arte generativo: **clima + gesto → sonido → visual**. Las condiciones meteorológicas determinan la escala musical, el timbre y los colores, mientras que el movimiento del dispositivo controla la melodía en tiempo real.

## Características

### Audio Generativo
- **Síntesis adaptativa**: Oscilador con filtro pasa-bajos modulado por humedad y LFO de vibrato controlado por viento
- **Cuantización musical inteligente**: Las frecuencias se ajustan automáticamente a escalas musicales según el clima (pentatónica mayor, dórico, blues, lydio, mixolidio)
- **Efectos atmosféricos**: La humedad oscurece el timbre y el viento añade vibrato natural
- **Portamento suave**: Transiciones fluidas entre notas (glide time de 50ms)

### Datos Meteorológicos en Tiempo Real
- **Open-Meteo API**: Temperatura, humedad, velocidad del viento, nubosidad, visibilidad, precipitación y códigos meteorológicos
- **Geocoding**: Búsqueda de ciudades por nombre con autocompletado
- **Mapeo contextual**: Cada condición climática (tormenta, niebla, nieve, lluvia) determina una escala y tipo de onda específicos

### Sensores de Movimiento
- **Control gestual**: Giroscopio/acelerómetro mediante [`@capacitor/motion`](https://capacitorjs.com/docs/apis/motion)
- **Detección de shake**: Agitar el dispositivo cambia aleatoriamente de ciudad
- **Modo debug**: Simulación con ratón para desarrollo en desktop

### Feedback Háptico
- **Vibraciones contextuales**: Mediante [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics)
- **Feedback al cambiar onda**: Vibración ligera
- **Feedback al cambiar ciudad**: Vibración media

### Visualización Generativa
- **Sistema de partículas**: 100 partículas con movimiento Perlin noise independiente
- **Ondas reactivas**: Amplitud y frecuencia controladas por inclinación, forma según tipo de onda (sine, square, sawtooth, triangle)
- **Efectos climáticos**: Niebla, nubes, lluvia y nieve renderizados en tiempo real
- **Paletas dinámicas**: Gradientes de color adaptados a la temperatura (-20°C a 40°C)

### Persistencia de Datos
- **LocalStorage**: Configuración, estadísticas de sesión y última ubicación
- **Sesiones rastreadas**: Contador de usos y timestamps

## Tecnologías

- **[Vite](https://vitejs.dev/)** - Build tool y dev server ultrarrápido
- **[Capacitor](https://capacitorjs.com/)** - Framework para aplicaciones nativas (iOS/Android)
  - [`@capacitor/motion`](https://capacitorjs.com/docs/apis/motion) - Sensores de orientación y aceleración
  - [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics) - Feedback táctil
  - [`@capacitor/screen-orientation`](https://capacitorjs.com/docs/apis/screen-orientation) - Control de orientación
- **[p5.js](https://p5js.org/)** - Librería de visualización canvas en modo instancia
- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** - Síntesis de audio nativa del navegador
- **[Open-Meteo API](https://open-meteo.com/)** - Datos meteorológicos en tiempo real (geocoding + weather)

## Estructura del Proyecto

```
theremin/
├── public/
│   ├── p5_v2.js               # p5.js v1.7.0 (modo instancia)
├── src/
│   ├── modules/
│   │   ├── audio.js           # ThereminAudio - Síntesis Web Audio API
│   │   ├── motion.js          # MotionSensor - Lectura de sensores
│   │   ├── storage.js         # ThereminStorage - LocalStorage
│   │   ├── environment.js     # EnvironmentService - API meteorológica
│   │   ├── sketch.js          # createSketch - Canvas p5.js
│   │   └── particles.js       # Particle - Sistema de partículas
│   ├── css/
│   │   └── style.css          # Estilos glassmorphic
│   ├── assets/
│   │   └── icons/             # SVG icons
│   └── main.js                # Orquestador principal
├── android/                   # Proyecto nativo Android
├── ios/                       # Proyecto nativo iOS
├── index.html
├── capacitor.config.json
├── package.json
└── vite.config.js
```

## Instalación desde Cero

### 1. Verificar Entorno

```bash
# Verificar Node.js ≥ 18 y npm instalados
node -v  # v18.0.0 o superior
npm -v   # v9.0.0 o superior
```

### 2. Crear Proyecto con Vite

```bash
# Crear proyecto (template vanilla)
npm create vite@latest theremin-meteo -- --template vanilla

# Entrar al directorio e instalar dependencias
cd theremin-meteo
npm install
```

### 3. Instalar Capacitor

📖 [Documentación oficial de Capacitor](https://capacitorjs.com/docs/getting-started)

```bash
# Instalar Capacitor Core y CLI
npm install @capacitor/core @capacitor/cli

# Inicializar Capacitor
npx cap init "Theremin Meteo" "com.theremin.meteo" --web-dir dist
```

### 4. Añadir Plataformas Nativas

#### Android

📖 [Configuración Android en Capacitor](https://capacitorjs.com/docs/android)

```bash
# Requisitos previos:
# - Android Studio instalado
# - JDK 17 configurado
# - Android SDK Platform 33 o superior

npm install @capacitor/android
npx cap add android
```

#### iOS (opcional)

📖 [Configuración iOS en Capacitor](https://capacitorjs.com/docs/ios)

```bash
# Requisitos previos:
# - macOS con Xcode 14+ instalado
# - CocoaPods instalado (gem install cocoapods)

npm install @capacitor/ios
npx cap add ios
```

### 5. Instalar Plugins de Capacitor

```bash
# Motion API y Haptics
npm install @capacitor/motion @capacitor/haptics @capacitor/screen-orientation
```

### 6. Configurar p5.js

Cargar p5.js como scripts clásicos en modo instancia.

```bash
# Descargar p5.js en public/
cd public
curl -O https://cdn.jsdelivr.net/npm/p5.sound@0.2.0/dist/p5.sound.min.js"
    
```

En index.html, cargar los scripts **antes** del código module:

```html
<!-- Scripts p5 ANTES del module -->
<script src="/p5_v2.js"></script>

<!-- Código module AL FINAL -->
<script type="module" src="/src/main.js"></script>
```

En el código JavaScript, usar **modo instancia** de p5.js:

```javascript
// src/modules/sketch.js
export function createSketch(motionSensor, thereminAudio, storage) {
  return new p5((p) => {
    p.setup = () => {
      const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
      cnv.parent('p5-container');
    };
    
    p.draw = () => {
      p.background(0);
      // Renderizado aquí
    };
  });
}
```

### 7. Configurar Orientación de Pantalla

En capacitor.config.json:

```json
{
  "appId": "com.theremin.meteo",
  "appName": "Theremin Meteorológico",
  "webDir": "dist",
  "plugins": {
    "ScreenOrientation": {
      "orientation": "portrait"
    }
  }
}
```

## Desarrollo

```bash
# Ejecutar en desarrollo (navegador)
npm run dev

# Abrir en http://localhost:5173
```

### Modo Debug en Desktop

- **Ratón**: Mover para simular inclinación del dispositivo
- **Doble click**: Simular shake (cambiar ciudad)
- **Tecla D**: Toggle debug overlay

## Build y Deploy

### Build para Web

```bash
npm run dev 
# Salida en dist/
# Se abre un servidor local
```

### Build para Android

```bash
# 1. Compilar proyecto web
npm run build

# 2. Sincronizar con Capacitor
npx cap sync android

# 3. Abrir en Android Studio
npx cap open android

# 4. Conectar dispositivo Android vía USB o simulador
```

**Requisitos Android**:
- Android Studio Hedgehog o superior
- JDK 17
- Android SDK Platform 33+
- Gradle 8.0+

### Build para iOS

```bash
# 1. Compilar proyecto web
npm run build

# 2. Sincronizar con Capacitor
npx cap sync ios

# 3. Abrir en Xcode
npx cap open ios

# 4. Conectar dispositivo iOS vía cable
# 5. En Xcode: Product > Run
```

**Requisitos iOS**:
- macOS con Xcode 14+
- CocoaPods instalado


## Controles

### En Navegador (Desktop Debug Mode)
- **Mover ratón**: Simular inclinación del dispositivo
  - Horizontal (X) → Frecuencia (220-880 Hz)
  - Vertical (Y) → Volumen (0-30%)
- **Doble click**: Simular shake → Cambiar a ciudad aleatoria
- **Tecla D**: Mostrar/ocultar debug overlay
- **Tecla ESC**: Cerrar menú lateral

### En Dispositivo Móvil
- **Inclinación horizontal (eje X)**: Controla la frecuencia del tono (cuantizada a escala musical)
- **Inclinación vertical (eje Y)**: Controla el volumen del audio
- **Shake**: Cambia a una ciudad aleatoria de la lista predefinida
- **Botón "Iniciar Audio"**: Activa sensores y audio (requerido por políticas de autoplay del navegador)
- **Botones de tipo de onda**: Sine, Square, Sawtooth, Triangle (cambian el timbre)
- **Input de ciudad**: Buscar ciudad específica + botón "Aplicar"
- **Botón "More" (⋯)**: Abre panel con selector de ondas y búsqueda de ciudad
- **Botón "Info" (ⓘ)**: Vuelve a la pantalla de bienvenida

## Mapeo Sensor → Audio

```javascript
// FRECUENCIA (Eje X horizontal: izquierda/derecha)
tiltX (-1 a 1) → normX (0 a 1)
rawFreq = 220 + normX * (880 - 220) Hz
quantizedFreq = closestNoteInScale(rawFreq)
oscillator.frequency.exponentialRampToValueAtTime(quantizedFreq, now + 0.05)

// VOLUMEN (Eje Y vertical: adelante/atrás)
tiltY (-1 a 1) → normY (0 a 1)
volume = normY * 0.3 (30% máximo)
gainNode.gain.linearRampToValueAtTime(volume, now + 0.03)

// EFECTOS CLIMÁTICOS
humidity (0-100%) → filterCutoff (2000-12000 Hz)
windSpeed (0-30 km/h) → lfoDepth (0-8 Hz de vibrato)
```

## Mapeo Clima → Escalas Musicales

La aplicación decide automáticamente la escala musical según las condiciones:

| Condición | Escala | Tipo de Onda | Mood |
|-----------|--------|--------------|------|
| **Fenómenos Extremos** |
| Tormenta (WMO 95,96,99) | Blues | Square | Tormentoso |
| Nieve (WMO 71-77,85-86) | Lydian | Sine | Nevado |
| Lluvia (WMO 51-65,80-82) | Dorian | Triangle | Lluvioso |
| Niebla (WMO 45,48) | Pentatonic Minor | Sine | Neblinoso |
| **Temperatura** |
| < 0°C | Pentatonic Minor | Sine | Gélido |
| 0-10°C | Dorian | Triangle | Frío |
| 10-20°C | Pentatonic Major | Sine | Templado |
| 20-30°C | Mixolydian | Sawtooth | Cálido |
| > 30°C | Major | Sine | Caluroso |

**Escalas disponibles**: Major (Ionian), Minor, Dorian, Pentatonic Major, Pentatonic Minor, Blues, Lydian, Mixolydian, Chromatic.

## Paletas de Color Térmicas

Los gradientes de fondo se adaptan a la temperatura

## Configuración Guardada (LocalStorage)

El sistema persiste automáticamente:

```javascript
// theremin_settings
{
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle',
  sensitivity: 1.0,
  visualMode: 0 | 1,  // 0 = solo partículas, 1 = ondas activas
  locationName: 'Barcelona, Catalunya, España',
  locationLat: 41.3851,
  locationLon: 2.1734,
  scaleName: 'pentatonic_major',
  mood: 'Templado',
  weatherStyle: { t01, h01, c01, w01, ... },
  meteoLastFetch: '2025-01-15T10:30:00.000Z'
}

// theremin_stats
{
  totalSessions: 42,
  lastSession: '2025-01-15T10:30:00.000Z',
  firstSession: '2025-01-01T08:00:00.000Z'
}
```

## Arquitectura del Código

### Clases Principales

#### `ThereminAudio`
- **Responsabilidad**: Síntesis de audio Web Audio API
- **Métodos clave**:
  - `init()`: Crea AudioContext, oscilador, filtro, ganancia y LFO
  - `update(tiltX, tiltY)`: Actualiza frecuencia y volumen según inclinación
  - `quantizeToScale(freq)`: Cuantiza frecuencia a la nota más cercana de la escala
  - `setEnvironment(style)`: Aplica efectos según clima (humedad → filtro, viento → vibrato)
  - `setWaveType(type)`: Cambia forma de onda (sine, square, sawtooth, triangle)
  - `setScale(scaleName)`: Cambia escala musical

#### `MotionSensor`
- **Responsabilidad**: Lectura de sensores DeviceOrientation/DeviceMotion
- **Métodos clave**:
  - `requestPermissions()`: Solicita permisos en iOS 13+
  - `init()`: Inicializa listeners de orientación y aceleración
  - `setupDebugMode()`: Modo mouse para desarrollo desktop
  - `onShakeDetected(callback)`: Registra callback para detección de shake
  - `getTiltX()`, `getTiltY()`: Devuelven valores normalizados (-1 a 1)

#### `EnvironmentService`
- **Responsabilidad**: Datos meteorológicos Open-Meteo API
- **Métodos clave**:
  - `geocodeCity(cityName)`: Convierte nombre → coordenadas + timezone
  - `fetchMeteo(lat, lon, timezone)`: Obtiene datos meteorológicos actuales
  - `decideScale(meteo)`: Decide escala musical según condiciones
  - `buildWeatherStyle(meteo)`: Normaliza valores y asigna paleta de colores
  - `pickPaletteByTemp(t)`: Selecciona paleta según temperatura

#### `ThereminStorage`
- **Responsabilidad**: Persistencia en LocalStorage
- **Métodos clave**:
  - `loadSettings()`: Carga configuración o devuelve defaults
  - `updateSetting(key, value)`: Actualiza un valor específico
  - `registerSession()`: Incrementa contador de sesiones
  - `getSessionStats()`: Devuelve estadísticas de uso
  - `clearAll()`: Limpia toda la configuración

#### `createSketch()`
- **Responsabilidad**: Canvas p5.js en modo instancia
- **Funciones clave**:
  - `drawThermalGradient(style)`: Renderiza gradiente de fondo
  - `drawWaves(tiltX, tiltY, style)`: Dibuja 3 capas de ondas reactivas
  - `drawFog(intensity)`: Renderiza niebla según visibilidad
  - `drawClouds(cover)`: Renderiza capas de nubes animadas
  - `drawPrecipitation(style, pitch)`: Renderiza lluvia o nieve
  - `updateDebug(tiltX, tiltY)`: Actualiza overlay de debug

#### `Particle`
- **Responsabilidad**: Partículas con movimiento orgánico
- **Métodos clave**:
  - `update(tiltX, tiltY, style)`: Actualiza posición con Perlin noise + tilt
  - `display(style)`: Renderiza partícula con glow según humedad

### Flujo de Datos

```
1. [Inicio de App]
   └─> loadCityWeather('Barcelona')
       ├─> EnvironmentService.geocodeCity() → {lat, lon, timezone}
       ├─> EnvironmentService.fetchMeteo() → {temperature, humidity, wind, ...}
       ├─> EnvironmentService.decideScale() → {scaleName, mood, waveType}
       └─> EnvironmentService.buildWeatherStyle() → {t01, h01, w01, colors, ...}

2. [Usuario presiona "Iniciar Audio"]
   └─> initializeAndStartAudio()
       ├─> MotionSensor.requestPermissions()
       ├─> MotionSensor.init()
       ├─> ThereminAudio.init()
       ├─> ThereminAudio.setWaveType(waveType)
       ├─> ThereminAudio.setScale(scaleName)
       ├─> ThereminAudio.setEnvironment(weatherStyle)
       └─> ThereminAudio.start()

3. [Loop de Renderizado p5.js]
   └─> p.draw() (60 FPS)
       ├─> drawThermalGradient(weatherStyle)
       ├─> drawFog(weatherStyle.fog01)
       ├─> drawClouds(weatherStyle.c01)
       ├─> particles.update(tiltX, tiltY, weatherStyle)
       ├─> particles.display(weatherStyle)
       ├─> drawWaves(tiltX, tiltY, weatherStyle)
       ├─> drawPrecipitation(weatherStyle, tiltY)
       └─> updateDebug(tiltX, tiltY)

4. [Loop de Audio]
   └─> MotionSensor.getTiltX/Y() → ThereminAudio.update(tiltX, tiltY)
       ├─> Cuantizar frecuencia a escala musical
       ├─> Aplicar portamento (glide 50ms)
       ├─> Calcular volumen según tiltY
       └─> Actualizar oscilador
```

## Debug Overlay

Presiona **D** en desktop o activa desde el menú lateral:

```
MOTION
Tilt X: -0.345
Tilt Y: 0.128
Intensidad: 0.367

AUDIO
Frecuencia: 349.2 Hz
Tipo de Onda: sine
Volumen: 0.64
Escala: pentatonic_major
Nota: F4

CLIMA
Temperatura: 18.5°C
Humedad: 72%
Viento: 12.3 km/h
Nubes: 45%

SISTEMA
Sesiones: 42
Modo: SENSOR (device)
```


## Ciudades Predefinidas (Shake)

```javascript
const RANDOM_CITIES = [
  'Barcelona', 'Madrid', 'París', 'Londres', 'Nueva York',
  'Tokio', 'Reykjavik', 'Dubai', 'Sídney', 'Río de Janeiro',
  'Moscú', 'Ciudad del Cabo', 'Mumbai', 'Toronto', 'Berlín',
  'Roma', 'Estocolmo', 'Buenos Aires', 'Oslo', 'Helsinki'
];
```

## APIs Utilizadas

### Open-Meteo Weather API
- **Geocoding**: `https://geocoding-api.open-meteo.com/v1/search`
- **Weather**: `https://api.open-meteo.com/v1/forecast`
- **Documentación**: [https://open-meteo.com/en/docs](https://open-meteo.com/en/docs)

### Capacitor APIs
- **Motion**: [https://capacitorjs.com/docs/apis/motion](https://capacitorjs.com/docs/apis/motion)
- **Haptics**: [https://capacitorjs.com/docs/apis/haptics](https://capacitorjs.com/docs/apis/haptics)
- **Screen Orientation**: [https://capacitorjs.com/docs/apis/screen-orientation](https://capacitorjs.com/docs/apis/screen-orientation)

### Web Audio API
- **AudioContext**: [https://developer.mozilla.org/en-US/docs/Web/API/AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- **OscillatorNode**: [https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- **BiquadFilterNode**: [https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)

## Autor

**Kris Darias**  
Grado en Multimedia - UOC  
[GitHub](https://github.com/krisdarias)

## Licencia

MIT License - Ver LICENSE

---

**Nota de desarrollo**: Este proyecto utiliza p5.js en modo instancia para evitar conflictos con módulos ES6. La librería `p5.sound` no se usa directamente; en su lugar, se implementa síntesis de audio mediante Web Audio API nativa para mayor control sobre los efectos climáticos.