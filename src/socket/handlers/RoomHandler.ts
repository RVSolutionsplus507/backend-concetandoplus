import { Server, Socket } from 'socket.io';
import { GameModel } from '../../models/gameModel';
import { PrismaClient } from '../../../generated/prisma';
import { gameRoomStore } from '../GameRoomStore';
import { CardType, GamePhase } from '../../types';
import { NotFoundError, ForbiddenError } from '../../errors/AppError';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

export class RoomHandler {
  constructor(private io: Server) {}

  // Unirse a sala
  async handleJoinRoom(socket: Socket, data: { playerId: string; playerName: string; roomCode: string }) {
    try {
      logger.info('Player joining room', { playerId: data.playerId, playerName: data.playerName, roomCode: data.roomCode });

      let room = gameRoomStore.getRoom(data.roomCode);

      // Recrear desde BD si no existe en memoria
      if (!room) {
        logger.debug('Room not in memory, fetching from database', { roomCode: data.roomCode });
        const game = await GameModel.findByRoomCode(data.roomCode);

        if (!game) {
          throw new NotFoundError('Sala');
        }

        // Recrear sala
        gameRoomStore.setRoom(data.roomCode, {
          id: game.id,
          roomCode: data.roomCode,
          players: new Map(),
          targetScore: game.targetScore || 20,
          allowedCategories: (game.allowedCategories || ['RC', 'AC', 'E', 'CE']) as CardType[],
          gameState: {
            phase: 'WAITING',
            currentPlayerId: undefined,
            currentCard: null,
            currentAnswer: undefined,
            turnOrder: [],
            settings: {
              maxPlayers: game.players?.length || 2,
              targetScore: game.targetScore || 20,
              allowedCategories: (game.allowedCategories || ['RC', 'AC', 'E', 'CE']) as CardType[]
            }
          },
          currentTurn: game.currentTurn || 1,
          currentPhase: game.phase as string
        });

        room = gameRoomStore.getRoom(data.roomCode)!;
        console.log(`✅ Sala ${data.roomCode} recreada desde BD`);
      }

      // Verificar si ya terminó
      if (room.gameState.phase === 'FINISHED' || room.currentPhase === 'FINISHED') {
        throw new ForbiddenError('Esta partida ya terminó. Por favor, crea una nueva sala.');
      }

      // Buscar rol del jugador
      const playerInGame = await prisma.player.findFirst({
        where: { gameId: room.id, name: data.playerName }
      });

      // Agregar jugador
      room.players.set(data.playerId, {
        id: data.playerId,
        socketId: socket.id,
        name: data.playerName,
        score: playerInGame?.score || 0,
        role: (playerInGame?.role as 'PLAYER' | 'MODERATOR' | 'PLAYER_MODERATOR') || 'PLAYER',
        isConnected: true
      });

      console.log(`👤 Jugador ${data.playerName} agregado con rol: ${playerInGame?.role || 'PLAYER'}`);

      gameRoomStore.setPlayerSocket(data.playerId, socket.id);
      socket.join(data.roomCode);

      // Notificar
      const playersArray = Array.from(room.players.values());
      const joinedPlayer = room.players.get(data.playerId);

      // Obtener datos de Daily.co desde la base de datos
      const game = await GameModel.findByRoomCode(data.roomCode);

      this.io.to(data.roomCode).emit('player-joined', {
        player: {
          id: data.playerId,
          name: data.playerName,
          score: 0,
          role: joinedPlayer?.role || 'PLAYER'
        },
        players: playersArray,
        gameState: room.gameState,
        roomCode: data.roomCode,
        dailyRoomUrl: game?.dailyRoomUrl || null,
        dailyRoomName: game?.dailyRoomName || null
      });

      console.log(`✅ Jugador ${data.playerName} se unió a sala ${data.roomCode}`);
    } catch (error) {
      console.error('Error al unirse al juego:', error);
      socket.emit('error', { message: 'Error al unirse al juego' });
    }
  }

  // Obtener estado de sala
  handleGetRoomState(socket: Socket, data: { roomCode: string }) {
    const room = gameRoomStore.getRoom(data.roomCode);
    if (room) {
      const playersArray = Array.from(room.players.values());
      socket.emit('room-state', {
        players: playersArray,
        gameState: room.gameState,
        currentPhase: room.currentPhase,
        currentTurn: room.currentTurn
      });
    } else {
      socket.emit('error', { message: 'Sala no encontrada' });
    }
  }

  // Reconexión
  async handleReconnect(socket: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const room = gameRoomStore.getRoom(data.roomCode);
      if (room) {
        const player = room.players.get(data.playerId);
        if (player) {
          player.socketId = socket.id;
          player.isConnected = true;
          gameRoomStore.setPlayerSocket(data.playerId, socket.id);

          socket.join(data.roomCode);

          const playersArray = Array.from(room.players.values());
          socket.emit('reconnected', {
            players: playersArray,
            gameState: room.gameState,
            currentPhase: room.currentPhase
          });

          socket.to(data.roomCode).emit('player-reconnected', {
            playerId: data.playerId,
            playerName: player.name
          });

          console.log(`🔄 Jugador ${player.name} se reconectó a sala ${data.roomCode}`);
        }
      }
    } catch (error) {
      console.error('Error en reconexión:', error);
      socket.emit('error', { message: 'Error al reconectar' });
    }
  }

  // Desconexión
  handleDisconnect(socket: Socket) {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);

    const playerId = gameRoomStore.findPlayerBySocketId(socket.id);
    if (playerId) {
      gameRoomStore.deletePlayerSocket(playerId);

      // Buscar sala del jugador
      for (const room of gameRoomStore.getAllRooms()) {
        const player = room.players.get(playerId);
        if (player) {
          player.isConnected = false;

          socket.to(room.roomCode).emit('player-disconnected', {
            playerId,
            playerName: player.name
          });

          console.log(`👋 Jugador ${player.name} se desconectó de sala ${room.roomCode}`);
          break;
        }
      }
    }
  }
}
