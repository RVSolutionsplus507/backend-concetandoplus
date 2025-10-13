import { CardType } from '../types';

// Interfaces compartidas entre handlers
export interface PlayerInRoom {
  id: string;
  socketId: string;
  name: string;
  score: number;
  role: string;
  isConnected: boolean;
}

export interface GameState {
  phase: string;
  currentPlayerId?: string;
  currentCard?: any;
  currentAnswer?: {
    playerId: string;
    playerName: string;
    answer: string;
    cardId: string;
    votes: Map<string, 'agree' | 'disagree'>;
    requiredApprovals: number;
  };
  turnOrder: string[];
  usedCards?: string[];
  isInDebate?: boolean;
  settings?: {
    maxPlayers: number;
    targetScore?: number;
    timeLimit?: number;
    allowedCategories?: CardType[];
  };
}

export interface GameRoom {
  id?: string;
  roomCode: string;
  players: Map<string, PlayerInRoom>;
  gameState: GameState;
  currentPhase?: string;
  currentTurn?: number;
  targetScore?: number;
  allowedCategories?: CardType[];
  answerTimer?: NodeJS.Timeout;
}
