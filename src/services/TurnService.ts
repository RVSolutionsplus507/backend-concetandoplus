interface PlayerInRoom {
  id: string;
  socketId: string;
  name: string;
  score: number;
  role: string;
  isConnected: boolean;
}

// Servicio para manejo de turnos
export class TurnService {
  // Obtiene jugadores elegibles (sin moderadores)
  getEligiblePlayers(players: PlayerInRoom[]): PlayerInRoom[] {
    return players.filter(p => p.role !== 'MODERATOR');
  }

  // Calcula siguiente jugador
  getNextPlayer(currentPlayerId: string, players: PlayerInRoom[]): PlayerInRoom {
    const eligiblePlayers = this.getEligiblePlayers(players);

    if (eligiblePlayers.length === 2) {
      // Con 2 jugadores, alternar
      const currentIndex = eligiblePlayers.findIndex(p => p.id === currentPlayerId);
      const nextIndex = (currentIndex + 1) % eligiblePlayers.length;
      return eligiblePlayers[nextIndex];
    } else {
      // Con 3+, seleccionar aleatoriamente excluyendo actual
      const availablePlayers = eligiblePlayers.filter(p => p.id !== currentPlayerId);
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      return availablePlayers[randomIndex];
    }
  }

  // Verifica si es el turno del jugador
  isPlayerTurn(playerId: string, currentPlayerId: string | undefined): boolean {
    return currentPlayerId === playerId;
  }

  // Selecciona primer jugador
  selectFirstPlayer(players: PlayerInRoom[]): PlayerInRoom {
    const eligiblePlayers = this.getEligiblePlayers(players);
    return eligiblePlayers[0];
  }
}

export const turnService = new TurnService();
