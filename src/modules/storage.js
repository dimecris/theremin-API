/**
 * MÓDULO DE ALMACENAMIENTO LOCAL
 * 
 * Este módulo gestiona la persistencia de datos usando LocalStorage del navegador.
 * Guarda la configuración del usuario (tipo de onda, sensibilidad) y estadísticas
 * de uso (número de sesiones, última fecha de uso).
 * 
 * Permite que la configuración se mantenga entre sesiones y que el usuario
 * no tenga que reconfigurar la aplicación cada vez que la abre.
 */

export class ThereminStorage {
  constructor() {
    this.storageKey = 'theremin_settings';
    
    // Defino la configuración por defecto que se usará la primera vez
    this.defaultSettings = {
      waveType: 'sine',
      visualMode: 1,
      lastSession: null,
      sessionCount: 0
    };
    
    // Referencia única del objeto settings para mantener consistencia entre módulos
    this.settings = null;
  }

  // Carga la configuración desde localStorage. Solo se carga una vez, luego se reutiliza la referencia
  loadSettings() {
    // Si ya está cargada, devuelve la referencia existente
    if (this.settings) {
      return this.settings;
    }
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (stored) {
        this.settings = JSON.parse(stored);
        console.log('Configuración cargada:', this.settings);
      } else {
        this.settings = { ...this.defaultSettings };
        console.log('No hay configuración guardada, usando valores por defecto');
      }
      
      return this.settings;
      
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      this.settings = { ...this.defaultSettings };
      return this.settings;
    }
  }

  // Guarda la configuración en localStorage y actualiza la referencia interna
  saveSettings(settings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
      this.settings = settings; // Actualiza la referencia
      console.log('Configuración guardada:', settings);
      return true;
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      return false;
    }
  }

  // Actualiza solo un campo y mantiene la referencia
  updateSetting(key, value) {
    if (!this.settings) {
      this.loadSettings();
    }
    
    // Modifica el objeto directamente para mantener la misma referencia
    this.settings[key] = value;
    return this.saveSettings(this.settings);
  }

  // Registra una nueva sesión cada vez que se inicia la aplicación
  registerSession() {
    const settings = this.loadSettings();
    settings.sessionCount++;
    settings.lastSession = new Date().toISOString();
    this.saveSettings(settings);
    
    console.log(`Sesión ${settings.sessionCount} registrada`);
    return settings.sessionCount;
  }

  // Resetea toda la configuración a valores por defecto (no usado actualmente)
  resetSettings() {
    try {
      localStorage.removeItem(this.storageKey);
      this.settings = null; // Elimina la referencia
      console.log('Configuración reseteada');
      return true;
    } catch (error) {
      console.error('Error al resetear configuración:', error);
      return false;
    }
  }

}