# Theremin Glitch

Aplicación experimental que explora la relación entre el movimiento del dispositivo y el sonido sintetizado, acompañada por visualizaciones generativas que evolucionan con el audio y el gesto.

## Descripción

Theremin Glitch es una experiencia audiovisual interactiva donde el móvil "toca" el sonido mediante el movimiento: **gesto → sonido → visual generativo**. No busca afinación perfecta, sino textura sonora y sorpresa visual.

## Características

- **Síntesis de audio reactiva**: Oscilador con filtro pasa-bajos controlado por inclinación
- **Cuantización musical**: Las frecuencias se ajustan a una escala pentatónica mayor
- **Sensores de movimiento**: Utiliza giroscopio mediante Capacitor Motion API
- **Feedback háptico**: Vibraciones mediante Capacitor Haptics API
- **Visualización generativa**: Sistema de partículas y ondas reactivas con p5.js
- **Almacenamiento local**: Configuración y sesiones guardadas en LocalStorage

## Tecnologías

- **Vite** - Build tool y dev server
- **Capacitor** - Framework para aplicaciones nativas
  - `@capacitor/motion` - Sensores de orientación
  - `@capacitor/haptics` - Feedback táctil
- **p5.js** - Visualización canvas
- **p5.sound** - Síntesis de audio

## Estructura del Proyecto

```
theremin/
├── public/
│   ├── p5.js
│   └── p5.sound.min.js
├── src/
│   ├── modules/
│   │   ├── audio.js      # Síntesis de audio y cuantización
│   │   ├── motion.js     # Lectura de sensores
│   │   ├── storage.js    # Almacenamiento local
│   │   └── sketch.js     # Visualización p5.js
│   ├── css/
│   │   └── style.css
│   └── main.js           # Orquestador principal
├── index.html
├── capacitor.config.json
├── package.json
└── vite.config.js
```

## Instalación desde cero

### 1. Verificar entorno

```bash
# Verificar Node.js y npm instalados
node -v
npm -v
```

### 2. Crear proyecto con Vite

```bash
# Crear proyecto (template vanilla)
npm create vite@latest theremin -- --template vanilla

# Entrar al directorio e instalar dependencias
cd theremin
npm install
```

### 3. Instalar Capacitor

📖 [Documentación oficial de Capacitor](https://capacitorjs.com/docs/getting-started)

```bash
# Instalar Capacitor Core y CLI
npm install @capacitor/core @capacitor/cli --save

# Inicializar Capacitor (modo interactivo)
npx cap init

# O configurar todas las opciones en un comando
npx cap init "Theremin" "com.theremin.app" --web-dir dist
```

### 4. Añadir plataforma Android

📖 [Configuración Android en Capacitor](https://capacitorjs.com/docs/android)

```bash
# Añadir plataforma Android
npm install @capacitor/android
npx cap add android
```

### 5. Instalar plugins de Capacitor

```bash
# Instalar Motion y Haptics
npm install @capacitor/motion @capacitor/haptics
```

### 6. Configurar p5.js

**Problema**: La librería p5.sound (v1.11.1) utiliza referencias globales que rompen la aplicación si se importan como módulos ES modernos (`import ...`).

**Solución**: Cargar p5.js como scripts clásicos en modo instancia.

```bash
# Descargar p5.js y p5.sound en la carpeta public/
cd public
curl -O https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js
curl -O https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.sound.min.js
cd ..
```

En `index.html`, cargar los scripts **antes** del código module:

```html
<!-- Scripts p5 ANTES del module -->
<script src="/p5.js"></script>
<script src="/p5.sound.min.js"></script>

<!-- Código module AL FINAL -->
<script type="module" src="/src/main.js"></script>
```

En el código JavaScript, usar **modo instancia** de p5.js:

```javascript
// src/modules/sketch.js
export const createSketch = (motionSensor, thereminAudio, storage) => {
  return new p5((p) => {
    p.setup = () => {
      // Código aquí
    };
    
    p.draw = () => {
      // Código aquí
    };
  });
};
```

## Desarrollo

```bash
# Ejecutar en desarrollo (navegador)
npm run dev
```

## Build y Deploy en Android

```bash
# Compilar el proyecto
npm run build

# Sincronizar con Capacitor
npx cap sync

# Abrir en Android Studio
npx cap open android
```

Desde Android Studio, conectar el dispositivo y pulsar **Run** para instalar la app.

## Controles

### En Navegador (Modo Debug Desktop)
- **Ratón**: Mover para simular inclinación del dispositivo

> **Nota**: El modo debug solo está disponible en desktop. Los controles táctiles están diseñados para dispositivo móvil.

### En Dispositivo Móvil
- **Inclinación horizontal (eje X)**: Controla la frecuencia del tono
- **Inclinación vertical (eje Y)**: Controla el brillo del sonido (filtro) y volumen
- **Botón "Iniciar Theremin"**: Activa sensores y audio (requerido por políticas del navegador)
- **Botones de tipo de onda**: Cambian el timbre (Sinusoidal, Cuadrada, Diente de Sierra, Triangular)

## Mapeo Sensor → Audio

```javascript
// Eje X (izquierda/derecha) → Frecuencia (200-1000 Hz)
tiltX → frequency (cuantizada a escala pentatónica mayor)

// Eje Y (adelante/atrás) → Filtro + Volumen
tiltY → filterFrequency (400-1400 Hz)
tiltY → volume (baseVolume + intensity)
```

## Configuración Guardada

El sistema almacena en LocalStorage:
- Tipo de onda del oscilador
- Sensibilidad de los sensores
- Modo visual
- Contador de sesiones
- Timestamp de última sesión

## Autor

Kris Darias - Grado Multimedia UOC

## Licencia

MIT