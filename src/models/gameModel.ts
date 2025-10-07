import { PrismaClient, Game, Player, Card, GameStatus, GamePhase, CardType } from '../../generated/prisma';
import { CreateGameRequest, GameResponse, PlayerResponse } from '../types';
import { generateRoomCode } from '../utils/helpers';

// Initialize Prisma Client
const prisma = new PrismaClient();

export class GameModel {
  static async getAvailableGames(): Promise<GameResponse[]> {
    const games = await prisma.game.findMany({
      include: {
        players: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return games.map((game: Game & { players: Player[] }) => {
      const isFinished = game.status === 'FINISHED' || game.phase === 'FINISHED';
      let winner = null;
      
      if (isFinished && game.players.length > 0) {
        // Encontrar el ganador (jugador que alcanzó el targetScore o tiene mayor puntuación)
        const playersWithTargetScore = game.players.filter((p: Player) => p.score >= (game.targetScore || 20));
        
        if (playersWithTargetScore.length > 0) {
          // Si hay jugadores que alcanzaron el target, el ganador es quien tiene más puntos
          winner = playersWithTargetScore.reduce((prev: Player, current: Player) => 
            (prev.score > current.score) ? prev : current
          );
        } else {
          // Si nadie alcanzó el target, el ganador es quien tiene más puntos
          winner = game.players.reduce((prev: Player, current: Player) => 
            (prev.score > current.score) ? prev : current
          );
        }
      }

      return {
        id: game.id,
        roomCode: game.roomCode,
        status: game.status,
        phase: game.phase,
        currentTurn: game.currentTurn,
        targetScore: game.targetScore,
        allowedCategories: (Array.isArray(game.allowedCategories) 
          ? game.allowedCategories 
          : ['RC', 'AC', 'E', 'CE']) as unknown as CardType[],
        isFinished,
        winner: winner ? {
          id: winner.id,
          name: winner.name,
          score: winner.score
        } : null,
        players: game.players.map((player: Player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
          color: player.color,
          isHost: player.isHost,
          role: player.role,
          hasReadExplanations: player.hasReadExplanations
        }))
      };
    });
  }

  static async createGame(data: CreateGameRequest): Promise<GameResponse> {
    const roomCode = generateRoomCode();
    
    // Validar targetScore (5-20)
    const targetScore = data.targetScore || 20;
    if (targetScore < 5 || targetScore > 20) {
      throw new Error('El puntaje objetivo debe estar entre 5 y 20');
    }

    // Validar categorías permitidas
    const allowedCategories = data.allowedCategories || ['RC', 'AC', 'E', 'CE'];
    if (allowedCategories.length === 0) {
      throw new Error('Debe seleccionar al menos una categoría');
    }
    
    const game = await prisma.game.create({
      data: {
        roomCode,
        targetScore,
        allowedCategories,
        players: {
          create: {
            name: data.hostName,
            color: data.hostColor,
            isHost: true,
            role: 'PLAYER'
          }
        }
      },
      include: {
        players: true
      }
    });

    return {
      id: game.id,
      roomCode: game.roomCode,
      status: game.status as any,
      phase: game.phase as any,
      currentTurn: game.currentTurn,
      targetScore: game.targetScore,
      allowedCategories: (Array.isArray(game.allowedCategories) 
        ? game.allowedCategories 
        : ['RC', 'AC', 'E', 'CE']) as any,
      players: game.players.map((player: any) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        color: player.color,
        isHost: player.isHost,
        role: player.role,
        hasReadExplanations: player.hasReadExplanations
      }))
    };
  }

  static async findByRoomCode(roomCode: string): Promise<GameResponse | null> {
    const game = await prisma.game.findUnique({
      where: { roomCode },
      include: {
        players: true
      }
    });

    if (!game) return null;

    return {
      id: game.id,
      roomCode: game.roomCode,
      status: game.status as any,
      phase: game.phase as any,
      currentTurn: game.currentTurn,
      targetScore: game.targetScore,
      allowedCategories: (Array.isArray(game.allowedCategories) 
        ? game.allowedCategories 
        : ['RC', 'AC', 'E', 'CE']) as any,
      players: game.players.map((player: any) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        color: player.color,
        isHost: player.isHost,
        role: player.role,
        hasReadExplanations: player.hasReadExplanations
      }))
    };
  }

  static async findById(gameId: string): Promise<GameResponse | null> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true
      }
    });

    if (!game) return null;

    return {
      id: game.id,
      roomCode: game.roomCode,
      status: game.status as any,
      phase: game.phase as any,
      currentTurn: game.currentTurn,
      targetScore: game.targetScore,
      allowedCategories: (Array.isArray(game.allowedCategories) 
        ? game.allowedCategories 
        : ['RC', 'AC', 'E', 'CE']) as any,
      players: game.players.map((player: any) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        color: player.color,
        isHost: player.isHost,
        role: player.role,
        hasReadExplanations: player.hasReadExplanations
      }))
    };
  }

  static async updateGameStatus(gameId: string, status: string): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: status as unknown as GameStatus }
    });
  }

  static async updateGamePhase(gameId: string, phase: 'WAITING' | 'EXPLANATION' | 'IN_PROGRESS' | 'FINISHED' | 'COMPLETED'): Promise<void> {
    const updateData: { phase: GamePhase; status?: GameStatus } = { phase: phase as unknown as GamePhase }
    
    // Sincronizar status con phase cuando el juego termina
    if (phase === 'FINISHED' || phase === 'COMPLETED') {
      updateData.status = 'FINISHED' as unknown as GameStatus
    }
    
    await prisma.game.update({
      where: { id: gameId },
      data: updateData
    });
  }

  static async getPlayerStats(userId: string): Promise<{
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    averageScore: number;
  }> {
    console.log(`📊 Obteniendo estadísticas para usuario: ${userId}`);
    
    // Primero obtenemos el usuario para conseguir su nombre
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log(`❌ Usuario no encontrado: ${userId}`);
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        averageScore: 0
      };
    }

    console.log(`👤 Usuario encontrado: ${user.name}`);
    
    // Buscamos todos los jugadores con el mismo nombre en juegos terminados
    const playerGames = await prisma.player.findMany({
      where: { 
        name: user.name,
        game: { phase: 'FINISHED' }
      },
      include: { game: true }
    });

    console.log(`📊 Partidas encontradas para ${user.name}:`, playerGames.length);
    console.log(`📊 Detalle de partidas:`, playerGames.map(pg => ({
      gameId: pg.gameId,
      score: pg.score,
      gamePhase: pg.game.phase
    })));

    const gamesPlayed = playerGames.length;
    
    // Calculamos victorias: jugador con mayor puntuación en cada juego
    let gamesWon = 0;
    const gameIds = [...new Set(playerGames.map(pg => pg.gameId))];
    
    for (const gameId of gameIds) {
      const gamePlayersInThisGame = await prisma.player.findMany({
        where: { gameId }
      });
      
      if (gamePlayersInThisGame.length > 0) {
        const winner = gamePlayersInThisGame.reduce((prev, current) => 
          prev.score > current.score ? prev : current
        );
        
        if (winner.name === user.name) {
          gamesWon++;
        }
      }
    }
    
    const totalScore = playerGames.reduce((sum: number, pg: Player) => sum + pg.score, 0);
    const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

    const stats = {
      gamesPlayed,
      gamesWon,
      totalScore,
      averageScore
    };

    console.log(`📊 Estadísticas calculadas para ${user.name}:`, stats);
    return stats;
  }

  static async updatePlayerScore(gameId: string, playerName: string, score: number): Promise<void> {
    console.log(`💾 Actualizando score en BD: gameId=${gameId}, playerName=${playerName}, score=${score}`);
    
    const result = await prisma.player.updateMany({
      where: {
        gameId: gameId,
        name: playerName
      },
      data: {
        score: score
      }
    });
    
    console.log(`✅ Score actualizado en BD para ${playerName}: ${result.count} registros actualizados`);
  }

  static async nextTurn(gameId: string): Promise<number> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });

    if (!game) throw new Error('Juego no encontrado');

    const nextTurn = (game.currentTurn + 1) % game.players.length;
    
    await prisma.game.update({
      where: { id: gameId },
      data: { currentTurn: nextTurn }
    });

    return nextTurn;
  }

  static async initializeCardPiles(gameId: string): Promise<void> {
    const cards = await prisma.card.findMany();
    
    // Agrupar cartas por tipo
    const cardsByType = {
      RC: cards.filter((card: Card) => card.type === 'RC'),
      AC: cards.filter((card: Card) => card.type === 'AC'),
      E: cards.filter((card: Card) => card.type === 'E'),
      CE: cards.filter((card: Card) => card.type === 'CE')
    };

    // Crear pilas mezcladas para cada tipo
    for (const [cardType, typeCards] of Object.entries(cardsByType)) {
      const shuffledCards = typeCards.sort(() => Math.random() - 0.5);
      
      const cardPileData = shuffledCards.map((card: Card, index: number) => ({
        gameId,
        cardType: cardType as CardType,
        cardId: card.id,
        position: index
      }));

      await prisma.cardPile.createMany({
        data: cardPileData
      });
    }
  }
}
