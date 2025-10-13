import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Rate limiter para eventos de Socket.io
export class SocketRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpiar entradas expiradas cada minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // Verifica si el socket puede emitir el evento
  checkLimit(socketId: string, event: string, maxPerMinute: number): boolean {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    // Si no existe o expiró, crear nueva entrada
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + 60000 // 1 minuto
      });
      return true;
    }

    // Verificar si excede el límite
    if (entry.count >= maxPerMinute) {
      logger.warn('Socket rate limit exceeded', {
        socketId,
        event,
        count: entry.count,
        limit: maxPerMinute
      });
      return false;
    }

    // Incrementar contador
    entry.count++;
    return true;
  }

  // Limpia entradas expiradas
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  // Destructor
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

export const socketRateLimiter = new SocketRateLimiter();
