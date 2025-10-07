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
}
