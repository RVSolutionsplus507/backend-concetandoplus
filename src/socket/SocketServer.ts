import { Server, Socket } from 'socket.io';
import { RoomHandler } from './handlers/RoomHandler';
import { GameHandler } from './handlers/GameHandler';
import { VotingHandler } from './handlers/VotingHandler';
import { TurnHandler } from './handlers/TurnHandler';
import { DebateHandler } from './handlers/DebateHandler';
import { gameRoomStore } from './GameRoomStore';
import { socketRateLimiter } from './SocketRateLimiter';
import {
  safeValidateSocketData,
  JoinRoomSchema,
  GetRoomStateSchema,
  ReconnectPlayerSchema,
  StartGameSchema,
  StartExplanationSchema,
  DrawCardSchema,
  EndGameModeratorSchema,
  CardReadSchema,
  PlayerAnsweredSchema,
  SkipTurnSchema,
  ApproveAnswerSchema,
  ResolveDebateSchema
} from './validators/socketSchemas';

export function initializeSocket(io: Server) {
  console.log('🎮 Inicializando Socket.IO para Conectando+');

  // Inicializar handlers
  const roomHandler = new RoomHandler(io);
  const gameHandler = new GameHandler(io);
  const votingHandler = new VotingHandler(io);
  const turnHandler = new TurnHandler(io);
  const debateHandler = new DebateHandler(io);

  io.on('connection', (socket: Socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Debug events
    socket.onAny((eventName, ...args) => {
      console.log(`📥 Evento: ${eventName}`, args[0]);
    });

    // Room events
    socket.on('join-room', (data) => {
      if (!socketRateLimiter.checkLimit(socket.id, 'join-room', 5)) {
        socket.emit('game-error', { message: 'Demasiadas peticiones. Espera un momento.' });
        return;
      }

      const validation = safeValidateSocketData(JoinRoomSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en join-room:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para unirse a la sala',
          details: validation.details
        });
        return;
      }

      roomHandler.handleJoinRoom(socket, validation.data);
    });

    socket.on('get-room-state', (data) => {
      const validation = safeValidateSocketData(GetRoomStateSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en get-room-state:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para obtener estado de sala',
          details: validation.details
        });
        return;
      }

      roomHandler.handleGetRoomState(socket, validation.data);
    });

    socket.on('reconnect-player', (data) => {
      const validation = safeValidateSocketData(ReconnectPlayerSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en reconnect-player:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para reconectar jugador',
          details: validation.details
        });
        return;
      }

      roomHandler.handleReconnect(socket, validation.data);
    });

    // Game events
    socket.on('start-game', (data) => {
      if (!socketRateLimiter.checkLimit(socket.id, 'start-game', 3)) {
        socket.emit('game-error', { message: 'Demasiadas peticiones. Espera un momento.' });
        return;
      }

      const validation = safeValidateSocketData(StartGameSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en start-game:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para iniciar juego',
          details: validation.details
        });
        return;
      }

      gameHandler.handleStartGame(socket, validation.data);
    });

    socket.on('start-explanation', (data) => {
      const validation = safeValidateSocketData(StartExplanationSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en start-explanation:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para iniciar explicación',
          details: validation.details
        });
        return;
      }

      gameHandler.handleStartExplanation(socket, validation.data);
    });

    socket.on('draw-card', (data) => {
      if (!socketRateLimiter.checkLimit(socket.id, 'draw-card', 30)) {
        socket.emit('game-error', { message: 'Demasiadas peticiones. Espera un momento.' });
        return;
      }

      const validation = safeValidateSocketData(DrawCardSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en draw-card:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para sacar carta',
          details: validation.details
        });
        return;
      }

      gameHandler.handleDrawCard(socket, validation.data);
    });

    socket.on('end-game-moderator', (data) => {
      const validation = safeValidateSocketData(EndGameModeratorSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en end-game-moderator:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para finalizar juego',
          details: validation.details
        });
        return;
      }

      gameHandler.handleEndGame(socket, validation.data);
    });

    // Turn events
    socket.on('card-read', (data) => {
      const validation = safeValidateSocketData(CardReadSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en card-read:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para lectura de carta',
          details: validation.details
        });
        return;
      }

      turnHandler.handleCardRead(socket, validation.data);
    });

    socket.on('player-answered', (data) => {
      const validation = safeValidateSocketData(PlayerAnsweredSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en player-answered:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para respuesta de jugador',
          details: validation.details
        });
        return;
      }

      turnHandler.handlePlayerAnswered(socket, validation.data);
    });

    socket.on('skip-turn', (data) => {
      const validation = safeValidateSocketData(SkipTurnSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en skip-turn:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para saltar turno',
          details: validation.details
        });
        return;
      }

      turnHandler.handleSkipTurn(socket, validation.data);
    });

    // Voting events
    socket.on('approve-answer', (data) => {
      if (!socketRateLimiter.checkLimit(socket.id, 'approve-answer', 60)) {
        socket.emit('game-error', { message: 'Demasiadas peticiones. Espera un momento.' });
        return;
      }

      const validation = safeValidateSocketData(ApproveAnswerSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en approve-answer:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para aprobar respuesta',
          details: validation.details
        });
        return;
      }

      votingHandler.handleApproveAnswer(socket, validation.data);
    });

    // Debate events
    socket.on('resolve-debate', (data) => {
      const validation = safeValidateSocketData(ResolveDebateSchema, data);
      if (!validation.success) {
        console.error('❌ Validación fallida en resolve-debate:', validation.details);
        socket.emit('game-error', {
          message: 'Datos inválidos para resolver debate',
          details: validation.details
        });
        return;
      }

      debateHandler.handleResolveDebate(socket, validation.data);
    });

    // Disconnect
    socket.on('disconnect', () => roomHandler.handleDisconnect(socket));
  });

  // Limpiar salas vacías cada 5 minutos
  setInterval(() => {
    gameRoomStore.cleanupEmptyRooms();
  }, 5 * 60 * 1000);
}

// Exports para compatibilidad
export const getGameRoom = (roomCode: string) => gameRoomStore.getRoom(roomCode);
export const getAllGameRooms = () => gameRoomStore.getAllRooms();
export const getPlayerSocket = (playerId: string) => gameRoomStore.getPlayerSocket(playerId);
