/**
 * MÓDULO DE PARTÍCULAS
 * Gestiona las partículas visuales con movimiento independiente
 */

export class Particle {
  constructor(p) {
    this.p = p; // Referencia a la instancia de p5
    this.x = p.random(p.width);
    this.y = p.random(p.height);
    this.vx = 0;
    this.vy = 0;
    this.size = p.random(3, 8);
    
    // Propiedades únicas para movimiento independiente
    this.noiseOffsetX = p.random(1000);
    this.noiseOffsetY = p.random(1000);
    this.baseSpeed = p.random(0.5, 1.5);
  }

  update(tiltX, tiltY, style) {
    const p = this.p;
    
    // Aplicar influencia del tilt (común a todas)
    this.vx += tiltX * 0.5;
    this.vy += tiltY * 0.5;
    
    // Añadir movimiento orgánico individual usando Perlin noise
    const noiseX = p.noise(this.noiseOffsetX + p.millis() * 0.0001) - 0.5;
    const noiseY = p.noise(this.noiseOffsetY + p.millis() * 0.0001) - 0.5;
    
    this.vx += noiseX * 0.3;
    this.vy += noiseY * 0.3;
    
    // Fricción
    this.vx *= 0.92;
    this.vy *= 0.92;
    
    // Actualizar posición
    this.x += this.vx * this.baseSpeed;
    this.y += this.vy * this.baseSpeed;

    // Rebotar en los bordes
    if (this.x < 0 || this.x > p.width) this.vx *= -0.6;
    if (this.y < 0 || this.y > p.height) this.vy *= -0.6;
    
    // Mantener en pantalla
    this.x = Math.max(0, Math.min(p.width, this.x));
    this.y = Math.max(0, Math.min(p.height, this.y));
  }

  display(style) {
    const p = this.p;
    
    // Aplicar glow si hay mucha humedad
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
    
    // Resetear shadow
    p.drawingContext.shadowBlur = 0;
  }
}