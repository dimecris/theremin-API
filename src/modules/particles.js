/**
 * MÓDULO DE PARTÍCULAS
 * Gestiona las partículas visuales con movimiento independiente
 */

export class Particle {
  
  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor(p) {
    this.p = p;
    this.x = p.random(p.width);
    this.y = p.random(p.height);
    this.vx = 0;
    this.vy = 0;
    this.size = p.random(3, 8);
    
    // Propiedades para movimiento orgánico individual
    this.noiseOffsetX = p.random(1000);
    this.noiseOffsetY = p.random(1000);
    this.baseSpeed = p.random(0.5, 1.5);
  }

  // ============================================
  // UPDATE
  // ============================================
  
  /**
   * Actualiza posición de la partícula según inclinación y ruido Perlin
   * @param {number} tiltX - Inclinación horizontal (-1 a 1)
   * @param {number} tiltY - Inclinación vertical (-1 a 1)
   * @param {Object} style - Estilo meteorológico (opcional)
   */
  update(tiltX, tiltY, style) {
    const p = this.p;
    
    // Aplicar influencia del tilt
    this.vx += tiltX * 0.5;
    this.vy += tiltY * 0.5;
    
    // Añadir movimiento orgánico individual usando Perlin noise
    const noiseX = p.noise(this.noiseOffsetX + p.millis() * 0.0001) - 0.5;
    const noiseY = p.noise(this.noiseOffsetY + p.millis() * 0.0001) - 0.5;
    
    this.vx += noiseX * 0.3;
    this.vy += noiseY * 0.3;
    
    // Aplicar fricción
    this.vx *= 0.92;
    this.vy *= 0.92;
    
    // Actualizar posición
    this.x += this.vx * this.baseSpeed;
    this.y += this.vy * this.baseSpeed;

    // Rebotar en los bordes
    if (this.x < 0 || this.x > p.width) this.vx *= -0.6;
    if (this.y < 0 || this.y > p.height) this.vy *= -0.6;
    
    // Mantener dentro de los límites
    this.x = Math.max(0, Math.min(p.width, this.x));
    this.y = Math.max(0, Math.min(p.height, this.y));
  }

  // ============================================
  // DISPLAY
  // ============================================
  
  /**
   * Dibuja la partícula con efectos visuales según el clima
   * @param {Object} style - Estilo meteorológico con colores y valores normalizados
   */
  display(style) {
    const p = this.p;
    
    // Aplicar glow si hay alta humedad
    if (style && style.h01 > 0.6) {
      p.drawingContext.shadowBlur = p.map(style.h01, 0.6, 1, 5, 20);
      p.drawingContext.shadowColor = style.secondary || '#FF007A';
    }
    
    p.noStroke();
    
    // Usar color secundario del clima, o color por defecto
    if (style && style.secondary) {
      p.fill(style.secondary);
    } else {
      p.fill(0, 209, 255, 200);
    }
    
    p.ellipse(this.x, this.y, this.size);
    
    // Resetear sombra
    p.drawingContext.shadowBlur = 0;
  }
}