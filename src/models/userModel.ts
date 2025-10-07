import { PrismaClient, GameStatus } from '../../generated/prisma';

let prisma: PrismaClient | null = null;

const getPrismaClient = async () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class UserModel {
  static async createUser(userData: {
    email: string;
    name: string;
    password: string;
    role?: 'USER' | 'ADMIN';
  }) {
    const client = await getPrismaClient();
    return await client.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
  }

  static async findByEmail(email: string) {
    const client = await getPrismaClient();
    return await client.user.findUnique({
      where: { email }
    });
  }

  static async findById(id: string) {
    const client = await getPrismaClient();
    return await client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
  }

  static async updateUser(id: string, data: {
    name?: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
  }) {
    const client = await getPrismaClient();
    return await client.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });
  }

  static async deleteUser(id: string) {
    const client = await getPrismaClient();
    return await client.user.delete({
      where: { id }
    });
  }

  static async getAllUsers() {
    const client = await getPrismaClient();
    return await client.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
  }

  static async getUserStats(userId: string) {
    const client = await getPrismaClient();
    
    // Obtener el usuario primero
    const user = await client.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        averageScore: 0,
        categoryStats: {
          RC: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
          AC: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
          E: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
          CE: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 }
        }
      };
    }

    // Buscar jugadores por nombre (ya que Player no tiene relación directa con User)
    const players = await client.player.findMany({
      where: {
        name: user.name,
        game: {
          status: GameStatus.FINISHED
        }
      },
      include: {
        game: true
      }
    });

    const gamesPlayed = players.length;
    
    // Calcular victorias: el jugador con más puntos en cada partida
    let gamesWon = 0;
    const gameIds = new Set(players.map(p => p.gameId));
    
    for (const gameId of gameIds) {
      const gamePlayers = await client.player.findMany({
        where: { gameId },
        orderBy: { score: 'desc' }
      });
      
      if (gamePlayers.length > 0 && gamePlayers[0].name === user.name) {
        gamesWon++;
      }
    }
    
    const totalScore = players.reduce((sum: number, p: { score: number }) => sum + p.score, 0);
    const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

    return {
      gamesPlayed,
      gamesWon,
      totalScore,
      averageScore,
      categoryStats: {
        RC: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
        AC: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
        E: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 },
        CE: { questionsAnswered: 0, correctAnswers: 0, totalPoints: 0, accuracy: 0 }
      }
    };
  }
}
