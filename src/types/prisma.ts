// Interfaces específicas para los modelos de Prisma
import { CardType, Difficulty } from './index';

export interface PrismaPlayer {
  id: string;
  name: string;
  gameId: string;
  score: number;
  color: string;
  isHost: boolean;
  role: string;
  hasReadExplanations: boolean;
  createdAt: Date;
}

export interface PrismaCard {
  id: string;
  type: CardType;
  isExplanation: boolean;
  question: string;
  options: any;
  correctAnswer: string | null;
  points: number;
  difficulty: Difficulty;
  createdAt: Date;
}

export interface PrismaGame {
  id: string;
  roomCode: string;
  status: string;
  currentTurn: number;
  phase: string;
  targetScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  players: PrismaPlayer[];
}

export interface PrismaCardPile {
  id: string;
  gameId: string;
  cardType: string;
  cardId: string;
  position: number;
  isUsed: boolean;
  card: PrismaCard;
}
