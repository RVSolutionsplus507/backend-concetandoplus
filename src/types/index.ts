// Re-exportar tipos de Prisma para usar en toda la aplicación
import { GameStatus, GamePhase, CardType, Difficulty, PlayerRole } from '../../generated/prisma';
export { GameStatus, GamePhase, CardType, Difficulty, PlayerRole };

export interface CreateGameRequest {
  hostName: string;
  hostColor: string;
  targetScore?: number;
  allowedCategories?: CardType[];
}

export interface JoinGameRequest {
  roomCode: string;
  playerName: string;
  playerColor: string;
}

export interface GameResponse {
  id: string;
  roomCode: string;
  status: GameStatus;
  phase: GamePhase;
  currentTurn: number;
  targetScore: number | null;
  allowedCategories?: CardType[];
  isFinished?: boolean;
  players: PlayerResponse[];
}

export interface PlayerResponse {
  id: string;
  name: string;
  score: number;
  color: string;
  isHost: boolean;
  role: PlayerRole;
  hasReadExplanations: boolean;
}

export interface CardResponse {
  id: string;
  type: CardType;
  isExplanation: boolean;
  question: string;
  options?: any;
  points: number;
  difficulty: Difficulty;
  imageUrl: string;
  cardNumber: number;
}

export interface SubmitAnswerRequest {
  gameId: string;
  playerId: string;
  roundId: string;
  answer: string;
}

export interface SocketEvents {
  // Cliente → Servidor
  'join-room': (data: { roomCode: string; playerName: string; playerColor: string }) => void;
  'start-explanation': (data: { gameId: string }) => void;
  'read-explanation': (data: { gameId: string; playerId: string; cardType: CardType }) => void;
  'choose-pile': (data: { gameId: string; playerId: string; cardType: CardType }) => void;
  'draw-card': (data: { gameId: string; playerId: string; cardType: CardType }) => void;
  'submit-answer': (data: SubmitAnswerRequest) => void;
  'end-turn': (data: { gameId: string; playerId: string }) => void;

  // Servidor → Clientes
  'player-joined': (data: { player: PlayerResponse; game: GameResponse }) => void;
  'explanation-started': (data: { gameId: string }) => void;
  'explanation-card': (data: { card: CardResponse; playerId: string }) => void;
  'pile-chosen': (data: { playerId: string; cardType: CardType }) => void;
  'card-drawn': (data: { card: CardResponse; playerId: string }) => void;
  'answer-submitted': (data: { playerId: string; isCorrect: boolean; pointsEarned: number }) => void;
  'turn-ended': (data: { nextPlayerId: string; currentTurn: number }) => void;
  'phase-changed': (data: { phase: GamePhase; gameId: string }) => void;
  'game-ended': (data: { winner: PlayerResponse; finalScores: PlayerResponse[] }) => void;
  'error': (data: { message: string }) => void;
}

// Los enums ya están definidos arriba, no necesitamos re-exportarlos
