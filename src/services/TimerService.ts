// Servicio para manejo de timers
export class TimerService {
  // Inicia timer con callback
  startAnswerTimer(timeLimit: number, onTimeout: () => void): NodeJS.Timeout {
    return setTimeout(onTimeout, timeLimit);
  }

  // Limpia timer si existe
  clearTimer(timer?: NodeJS.Timeout): void {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export const timerService = new TimerService();
