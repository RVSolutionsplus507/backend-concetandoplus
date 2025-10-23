import { CardType, CardResponse, Difficulty } from '../types';
import { PrismaClient, Card, CardPile } from '../../generated/prisma';

// Inicialización directa de Prisma Client
const prisma = new PrismaClient();

const getPrismaClient = () => {
  return prisma;
};

export class CardModel {
  static async getNextCardFromPile(gameId: string, cardType: CardType): Promise<CardResponse | null> {
    const prismaClient = getPrismaClient();
    const cardPile = await prismaClient.cardPile.findFirst({
      where: {
        gameId,
        cardType: cardType as unknown as CardType,
        isUsed: false
      },
      orderBy: { position: 'asc' },
      include: { card: true }
    });

    if (!cardPile) return null;

    // Marcar carta como usada
    await prismaClient.cardPile.update({
      where: { id: cardPile.id },
      data: { isUsed: true }
    });

    return {
      id: cardPile.card.id,
      type: cardPile.card.type as unknown as CardType,
      isExplanation: cardPile.card.isExplanation,
      question: cardPile.card.question,
      options: cardPile.card.options as Record<string, unknown> | undefined,
      points: cardPile.card.points,
      difficulty: cardPile.card.difficulty as unknown as Difficulty,
      imageUrl: cardPile.card.imageUrl,
      cardNumber: cardPile.card.cardNumber
    };
  }

  static async getExplanationCard(cardType: CardType, allowedCategories?: CardType[]): Promise<CardResponse | null> {
    const prismaClient = getPrismaClient();
    
    // Si se especifican categorías permitidas, validar que el tipo solicitado esté permitido
    if (allowedCategories && !allowedCategories.includes(cardType)) {
      console.log(`⚠️ Categoría ${cardType} no está en las permitidas: ${allowedCategories.join(', ')}`);
      return null;
    }
    
    const card = await prismaClient.card.findFirst({
      where: {
        type: cardType as unknown as CardType,
        isExplanation: true
      }
    });

    if (!card) return null;

    return {
      id: card.id,
      type: card.type as unknown as CardType,
      isExplanation: card.isExplanation,
      question: card.question,
      options: card.options as Record<string, unknown> | undefined,
      points: card.points,
      difficulty: card.difficulty as unknown as Difficulty,
      imageUrl: card.imageUrl,
      cardNumber: card.cardNumber
    };
  }

  static async getAllCards(): Promise<CardResponse[]> {
    const prismaClient = getPrismaClient();
    const cards = await prismaClient.card.findMany();

    return cards.map((card: Card) => ({
      id: card.id,
      type: card.type as unknown as CardType,
      isExplanation: card.isExplanation,
      question: card.question,
      options: card.options as Record<string, unknown> | undefined,
      points: card.points,
      difficulty: card.difficulty as unknown as Difficulty,
      imageUrl: card.imageUrl,
      cardNumber: card.cardNumber
    }));
  }

  static async getCardsByType(cardType: CardType, includeExplanations: boolean = false): Promise<CardResponse[]> {
    const prismaClient = getPrismaClient();
    const cards = await prismaClient.card.findMany({
      where: {
        type: cardType as unknown as CardType,
        ...(includeExplanations ? {} : { isExplanation: false })
      }
    });

    return cards.map((card: Card) => ({
      id: card.id,
      type: card.type as unknown as CardType,
      isExplanation: card.isExplanation,
      question: card.question,
      options: card.options as Record<string, unknown> | undefined,
      points: card.points,
      difficulty: card.difficulty as unknown as Difficulty,
      imageUrl: card.imageUrl,
      cardNumber: card.cardNumber
    }));
  }

  static async getRandomCard(cardType: CardType, usedCardIds: string[] = [], allowedCategories?: CardType[]): Promise<CardResponse | null> {
    const prismaClient = getPrismaClient();
    
    // Si se especifican categorías permitidas, validar que el tipo solicitado esté permitido
    if (allowedCategories && !allowedCategories.includes(cardType)) {
      return null;
    }
    
    // Obtener todas las cartas del tipo especificado (excluyendo explicaciones y cartas usadas)
    const cards = await prismaClient.card.findMany({
      where: {
        type: cardType as unknown as CardType,
        isExplanation: false,
        id: {
          notIn: usedCardIds
        }
      }
    });

    if (cards.length === 0) return null;

    // Seleccionar carta aleatoria
    const randomIndex = Math.floor(Math.random() * cards.length);
    const card = cards[randomIndex];

    return {
      id: card.id,
      type: card.type as unknown as CardType,
      isExplanation: card.isExplanation,
      question: card.question,
      options: card.options as Record<string, unknown> | undefined,
      points: card.points,
      difficulty: card.difficulty as unknown as Difficulty,
      imageUrl: card.imageUrl,
      cardNumber: card.cardNumber
    };
  }
}
