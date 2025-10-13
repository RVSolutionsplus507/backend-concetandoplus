interface PlayerInRoom {
  id: string;
  socketId: string;
  name: string;
  score: number;
  role: string;
  isConnected: boolean;
}

// Servicio para lógica de debates
export class DebateService {
  // Verifica si el rol es moderador
  isModeratorRole(role: string): boolean {
    return role === 'MODERATOR' || role === 'PLAYER_MODERATOR';
  }

  // Resuelve debate y retorna puntos otorgados
  resolveDebate(grantPoints: boolean, points: number): number {
    return grantPoints ? points : 0;
  }

  // Verifica si el jugador puede resolver debate
  canResolveDebate(playerRole: string): boolean {
    return this.isModeratorRole(playerRole);
  }

  // Aplica decisión del moderador
  applyModeratorDecision(player: PlayerInRoom, grantPoints: boolean, cardPoints: number): void {
    if (grantPoints) {
      player.score += cardPoints;
    }
  }
}

export const debateService = new DebateService();
