interface PlayerInRoom {
  id: string;
  socketId: string;
  name: string;
  score: number;
  role: string;
  isConnected: boolean;
}

interface WinConditionResult {
  winner: PlayerInRoom | null;
  condition: string;
}

// Servicio para lógica de juego
export class GameService {
  // Verifica condiciones de victoria
  checkWinConditions(
    players: PlayerInRoom[],
    targetScore: number,
    usedCardsCount: number
  ): WinConditionResult {
    const eligiblePlayers = players.filter(p => p.role !== 'MODERATOR');

    // Condición 1: Alguien alcanzó targetScore
    const winnerByScore = eligiblePlayers.find(p => p.score >= targetScore);
    if (winnerByScore) {
      return {
        winner: winnerByScore,
        condition: `${targetScore} puntos alcanzados`
      };
    }

    // Condición 2: Cartas agotadas (56 total)
    if (usedCardsCount >= 56) {
      const winner = eligiblePlayers.reduce((prev, current) =>
        (prev.score > current.score) ? prev : current
      );
      return {
        winner,
        condition: 'cartas agotadas - mayor puntaje'
      };
    }

    return { winner: null, condition: '' };
  }

  // Verifica si el juego puede iniciar
  canStartGame(playerCount: number): { canStart: boolean; reason?: string } {
    if (playerCount < 2) {
      return { canStart: false, reason: 'Se necesitan al menos 2 jugadores' };
    }
    return { canStart: true };
  }

  // Actualiza puntuación del jugador
  updatePlayerScore(player: PlayerInRoom, points: number): void {
    player.score += points;
  }

  // Verifica mínimo de jugadores
  hasMinimumPlayers(playerCount: number): boolean {
    return playerCount >= 2;
  }

  // Determina ganador por mayor puntaje
  getWinnerByScore(players: PlayerInRoom[]): PlayerInRoom {
    const eligiblePlayers = players.filter(p => p.role !== 'MODERATOR');
    return eligiblePlayers.reduce((prev, current) =>
      (prev.score > current.score) ? prev : current
    );
  }
}

export const gameService = new GameService();
