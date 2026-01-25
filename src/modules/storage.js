/**
 * MÓDULO DE ALMACENAMIENTO (localStorage)
 * Gestiona configuración y estadísticas del usuario
 */

export class ThereminStorage {
  
  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor() {
    this.STORAGE_KEY = 'theremin_settings';
    this.STATS_KEY = 'theremin_stats';
  }

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  
  /**
   * Carga la configuración guardada o devuelve valores por defecto
   * @returns {Object} Objeto con toda la configuración
   */
  loadSettings() {
    const defaultSettings = {
      waveType: 'sine',
      sensitivity: 1.0,
      visualMode: 1,
      locationName: '',
      locationLat: null,
      locationLon: null,
      scaleName: 'pentatonic_major',
      mood: 'Neutral',
      weatherStyle: null,
      meteoLastFetch: null
    };

    try {
      const savedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }

    return defaultSettings;
  }

  /**
   * Actualiza un valor específico de la configuración
   * @param {string} key - Clave del setting a actualizar
   * @param {*} value - Nuevo valor
   */
  updateSetting(key, value) {
    try {
      const currentSettings = this.loadSettings();
      currentSettings[key] = value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentSettings));
      console.log(`Setting actualizado: ${key} = ${value}`);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================
  
  /**
   * Registra una nueva sesión de uso
   */
  registerSession() {
    try {
      const stats = this.getSessionStats();
      stats.totalSessions += 1;
      stats.lastSession = new Date().toISOString();
      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
      console.log('Sesión registrada:', stats.totalSessions);
    } catch (error) {
      console.error('Error registrando sesión:', error);
    }
  }

  /**
   * Obtiene las estadísticas de uso
   * @returns {Object} Objeto con estadísticas de sesiones
   */
  getSessionStats() {
    try {
      const savedStats = localStorage.getItem(this.STATS_KEY);
      if (savedStats) {
        return JSON.parse(savedStats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }

    // Valores por defecto si no existen
    return {
      totalSessions: 0,
      lastSession: null,
      firstSession: new Date().toISOString()
    };
  }

  // ============================================
  // LIMPIEZA
  // ============================================
  
  /**
   * Elimina toda la configuración y estadísticas guardadas
   */
  clearAll() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.STATS_KEY);
      console.log('Almacenamiento limpiado');
    } catch (error) {
      console.error('Error limpiando almacenamiento:', error);
    }
  }
}
