let prisma: any = null;

const getPrismaClient = async () => {
  if (!prisma) {
    const { PrismaClient } = await import('../../generated/prisma');
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
    
    // Obtener todas las partidas completadas del usuario
    const players = await client.player.findMany({
      where: {
        id: userId,
        game: {
          status: 'COMPLETED'
        }
      },
      include: {
        game: true
      }
    });

    const gamesPlayed = players.length;
    const gamesWon = players.filter((p: { game: { winnerId: string | null } }) => p.game.winnerId === userId).length;
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
