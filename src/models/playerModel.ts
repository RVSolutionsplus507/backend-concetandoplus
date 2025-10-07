import { JoinGameRequest, PlayerResponse, PlayerRole } from '../types';
import { PrismaClient, Player } from '../../generated/prisma';

const prisma = new PrismaClient();

const getPrismaClient = () => {
  return prisma;
};

export class PlayerModel {
  static async addPlayerToGame(data: JoinGameRequest): Promise<PlayerResponse> {
    const prismaClient = getPrismaClient();
    const player = await prismaClient.player.create({
      data: {
        name: data.playerName,
        color: data.playerColor,
        gameId: data.roomCode, // Necesitamos el gameId, no roomCode
        isHost: false,
        role: 'PLAYER'
      }
    });

    return {
      id: player.id,
      name: player.name,
      score: player.score,
      color: player.color,
      isHost: player.isHost,
      role: player.role as unknown as PlayerRole,
      hasReadExplanations: player.hasReadExplanations
    };
  }
  

  static async updatePlayerScore(playerId: string, newScore: number): Promise<PlayerResponse> {
    const prismaClient = getPrismaClient();
    const player = await prismaClient.player.update({
      where: { id: playerId },
      data: {
        score: newScore
      }
    });

    return {
      id: player.id,
      name: player.name,
      score: player.score,
      color: player.color,
      isHost: player.isHost,
      role: player.role as unknown as PlayerRole,
      hasReadExplanations: player.hasReadExplanations
    };
  }

  static async markExplanationsRead(playerId: string): Promise<void> {
    const prismaClient = getPrismaClient();
    await prismaClient.player.update({
      where: { id: playerId },
      data: { hasReadExplanations: true }
    });
  }

  static async getGamePlayers(gameId: string): Promise<PlayerResponse[]> {
    const prismaClient = getPrismaClient();
    const players = await prismaClient.player.findMany({
      where: { gameId }
    });

    return players.map((player: Player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      color: player.color,
      isHost: player.isHost,
      role: player.role as unknown as PlayerRole,
      hasReadExplanations: player.hasReadExplanations
    }));
  }

  static async getCurrentPlayer(gameId: string, currentTurn: number): Promise<PlayerResponse | null> {
    const prismaClient = getPrismaClient();
    const players = await prismaClient.player.findMany({
      where: { gameId },
      orderBy: { createdAt: 'asc' }
    });

    if (currentTurn >= players.length) return null;

    const player = players[currentTurn];
    return {
      id: player.id,
      name: player.name,
      score: player.score,
      color: player.color,
      isHost: player.isHost,
      role: player.role as unknown as PlayerRole,
      hasReadExplanations: player.hasReadExplanations
    };
  }
}
