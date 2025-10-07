import { Server, Socket } from 'socket.io';
import { GameModel } from '../models/gameModel';
import { PlayerModel } from '../models/playerModel';
import { CardModel } from '../models/cardModel';
import { CardType, GamePhase } from '../types';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

// Gestión de salas en memoria
interface GameRoom {
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

interface PlayerInRoom {
  id: string;
  socketId: string;
  name: string;
  score: number;
  role: string;
  isConnected: boolean;
}

interface GameState {
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

const gameRooms = new Map<string, GameRoom>();
const playerSockets = new Map<string, string>(); // playerId -> socketId

export function initializeSocket(io: Server) {
  console.log('🎮 Inicializando Socket.IO para Conectando+')

  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id)
    
    // Debug: Log todos los eventos recibidos
    socket.onAny((eventName, ...args) => {
      console.log(`📥 Evento recibido: ${eventName}`, args[0])
    })

    // Unirse a una sala de juego
    socket.on('join-room', async (data: { playerId: string; playerName: string; roomCode: string }) => {
      try {
        console.log(`🎮 Jugador ${data.playerName} intentando unirse a sala ${data.roomCode}`);
        
        // Verificar si la sala existe en memoria, si no, intentar recrearla desde BD
        let room = gameRooms.get(data.roomCode);
        if (!room) {
          console.log(`❌ Sala ${data.roomCode} no existe en memoria, buscando en BD...`);
          
          // Intentar encontrar la sala en la base de datos
          const game = await GameModel.findByRoomCode(data.roomCode);
          if (!game) {
            console.log(`❌ Sala ${data.roomCode} tampoco existe en BD`);
            socket.emit('game-error', { 
              message: 'La sala no existe o ya terminó. Por favor, crea una nueva sala.' 
            });
            return;
          }

          // Recrear sala en memoria desde BD
          gameRooms.set(data.roomCode, {
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
          
          room = gameRooms.get(data.roomCode)!;
          console.log(`✅ Sala ${data.roomCode} recreada desde BD con ID: ${game.id}`);
        }
        
        // Verificar si la sala ya terminó
        if (room.gameState.phase === 'FINISHED' || room.currentPhase === 'FINISHED') {
          console.log(`🏁 Sala ${data.roomCode} ya terminó - no se permite unirse`);
          socket.emit('game-error', { 
            message: 'Esta partida ya terminó. Por favor, crea una nueva sala.' 
          });
          return;
        };
        
        // Buscar el rol del jugador en la BD
        const playerInGame = await prisma.player.findFirst({
          where: {
            gameId: room.id,
            name: data.playerName
          }
        });

        // Agregar jugador con su rol correcto
        room.players.set(data.playerId, {
          id: data.playerId,
          socketId: socket.id,
          name: data.playerName,
          score: playerInGame?.score || 0,
          role: (playerInGame?.role as 'PLAYER' | 'MODERATOR' | 'PLAYER_MODERATOR') || 'PLAYER',
          isConnected: true
        });

        console.log(`👤 Jugador ${data.playerName} agregado con rol: ${playerInGame?.role || 'PLAYER'}`);

        playerSockets.set(data.playerId, socket.id);
        
        // 🎯 CRÍTICO: Unir el socket a la sala
        socket.join(data.roomCode);
        console.log(`🔗 Socket ${socket.id} unido a sala ${data.roomCode}`);

        // Notificar a todos en la sala
        const playersArray = Array.from(room.players.values());
        const joinedPlayer = room.players.get(data.playerId);
        io.to(data.roomCode).emit('player-joined', { 
          player: {
            id: data.playerId,
            name: data.playerName,
            score: 0,
            role: joinedPlayer?.role || 'PLAYER'
          },
          players: playersArray,
          gameState: room.gameState
        });

        console.log(`✅ Jugador ${data.playerName} se unió a sala ${data.roomCode}`);
        
      } catch (error) {
        console.error('Error al unirse al juego:', error);
        socket.emit('error', { message: 'Error al unirse al juego' });
      }
    });

    // Iniciar juego (evento del frontend)
    socket.on('start-game', async (data: { roomCode: string; playerId: string }) => {
      try {
        console.log(`🚀 Evento start-game recibido: roomCode=${data.roomCode}, playerId=${data.playerId}`);
        
        let room = gameRooms.get(data.roomCode);
        if (!room) {
          console.log(`❌ Sala ${data.roomCode} no encontrada en memoria, recreando desde BD...`);
          
          // Intentar recrear la sala desde la base de datos
          const game = await GameModel.findByRoomCode(data.roomCode);
          if (!game) {
            console.log(`❌ Sala ${data.roomCode} tampoco existe en BD`);
            socket.emit('error', { message: 'Sala no encontrada' });
            return;
          }

          // Recrear sala en memoria
          gameRooms.set(data.roomCode, {
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
          
          room = gameRooms.get(data.roomCode)!;
          console.log(`✅ Sala ${data.roomCode} recreada en memoria`);
        }

        console.log(`✅ Sala encontrada: ${room.id}, jugadores conectados: ${room.players.size}`);

        // Verificar que hay suficientes jugadores
        if (room.players.size < 2) {
          socket.emit('error', { message: 'Se necesitan al menos 2 jugadores' });
          return;
        }

        // Actualizar estado del juego
        room.currentPhase = GamePhase.IN_PROGRESS;
        if (room.id) {
          await GameModel.updateGamePhase(room.id, 'IN_PROGRESS');
        }
        
        // Determinar primer jugador
        const playersArray = Array.from(room.players.values());
        const firstPlayer = playersArray[0];
        room.gameState.currentPlayerId = firstPlayer.id;
        const currentPlayerName = room.players.get(room.gameState.currentPlayerId!)?.name || 'Desconocido';
        console.log(`🎯 Primer jugador del juego: ${firstPlayer.name} (${firstPlayer.id})`);

        // Notificar inicio del juego
        io.to(data.roomCode).emit('game-started', {
          gameId: room.id,
          currentPlayerId: room.gameState.currentPlayerId,
          currentPlayerName,
          gameState: {
            ...room.gameState,
            currentPlayerId: room.gameState.currentPlayerId
          },
          players: playersArray.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            isCurrentTurn: p.id === firstPlayer.id
          }))
        });

        console.log(`🎮 Juego iniciado en sala ${data.roomCode} por ${data.playerId}`);
        
      } catch (error) {
        console.error('Error al iniciar juego:', error);
        socket.emit('error', { message: 'Error al iniciar juego' });
      }
    });

    // Iniciar fase de explicación
    socket.on('start-explanation', async (data: { gameId: string }) => {
      try {
        // Buscar sala por gameId
        let roomCode = '';
        let room: GameRoom | undefined;
        for (const [code, gameRoom] of gameRooms.entries()) {
          if (gameRoom.id === data.gameId) {
            roomCode = code;
            room = gameRoom;
            break;
          }
        }
        
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        // Verificar que hay suficientes jugadores
        if (room.players.size < 2) {
          socket.emit('error', { message: 'Se necesitan al menos 2 jugadores' });
          return;
        }

        // Actualizar fase a explicación
        room.currentPhase = GamePhase.EXPLANATION;
        if (room.id) {
          await GameModel.updateGamePhase(room.id, 'EXPLANATION');
        }
        
        // Notificar inicio de explicaciones
        io.to(roomCode).emit('explanation-started', {
          gameId: data.gameId
        });

        console.log(`📚 Fase de explicación iniciada en sala ${roomCode}`);
        
      } catch (error) {
        console.error('Error al iniciar fase de explicación:', error);
        socket.emit('error', { message: 'Error al iniciar fase de explicación' });
      }
    });

    // Leer carta de explicación
    socket.on('read-explanation', async (data: { gameId: string; playerId: string; cardType: CardType }) => {
      try {
        // Obtener carta de explicación
        const card = await CardModel.getExplanationCard(data.cardType);
        if (!card) {
          socket.emit('error', { message: 'Carta de explicación no encontrada' });
          return;
        }

        // Marcar que el jugador leyó la explicación
        await PlayerModel.markExplanationsRead(data.playerId);

        // Enviar carta de explicación al jugador
        socket.emit('explanation-card', {
          card,
          playerId: data.playerId
        });

        console.log(`📖 Carta de explicación ${data.cardType} enviada a jugador ${data.playerId}`);
        
      } catch (error) {
        console.error('Error al obtener carta de explicación:', error);
        socket.emit('error', { message: 'Error al obtener carta de explicación' });
      }
    });

    // Elegir pila de cartas
    socket.on('choose-pile', async (data: { gameId: string; playerId: string; cardType: CardType }) => {
      try {
        // Buscar sala por gameId
        let roomCode = '';
        let room: GameRoom | undefined;
        for (const [code, gameRoom] of gameRooms.entries()) {
          if (gameRoom.id === data.gameId) {
            roomCode = code;
            room = gameRoom;
            break;
          }
        }
        
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        // Notificar elección de pila
        io.to(roomCode).emit('pile-chosen', {
          playerId: data.playerId,
          cardType: data.cardType
        });

        console.log(`🎯 Jugador ${data.playerId} eligió pila ${data.cardType}`);
        
      } catch (error) {
        console.error('Error al elegir pila:', error);
        socket.emit('error', { message: 'Error al elegir pila' });
      }
    });

    // Sacar carta
    socket.on('draw-card', async (data: { roomCode: string; playerId: string; cardType: CardType }) => {
      try {
        console.log(`🃏 Backend recibió draw-card: roomCode=${data.roomCode}, playerId=${data.playerId}, cardType=${data.cardType}`);
        
        const room = gameRooms.get(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          console.log(`❌ No es turno de ${data.playerId}, turno actual: ${room.gameState.currentPlayerId}`);
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        // Si no hay jugador actual establecido, usar el primer jugador de la lista
        if (!room.gameState.currentPlayerId) {
          const playersArray = Array.from(room.players.values());
          room.gameState.currentPlayerId = playersArray[0].id;
          console.log(`🎯 Jugador actual establecido: ${room.gameState.currentPlayerId}`);
        }

        // Inicializar usedCards si no existe
        if (!room.gameState.usedCards) {
          room.gameState.usedCards = [];
        }

        // Obtener carta aleatoria del tipo especificado que no haya sido usada
        const card = await CardModel.getRandomCard(data.cardType, room.gameState.usedCards, room.allowedCategories);
        if (!card) {
          socket.emit('error', { message: 'No hay cartas disponibles de este tipo' });
          return;
        }

        // Agregar carta a las usadas
        room.gameState.usedCards.push(card.id);

        // Cambiar a fase IN_PROGRESS si está en EXPLANATION
        if (room.currentPhase === GamePhase.EXPLANATION) {
          room.currentPhase = GamePhase.IN_PROGRESS;
          if (room.id) {
            await GameModel.updateGamePhase(room.id, 'IN_PROGRESS');
          }
          console.log(`📚➡️🎮 Cambiando de EXPLANATION a IN_PROGRESS en sala ${data.roomCode}`);
        }

        // Actualizar estado del juego
        room.gameState.currentCard = card;
        
        // Notificar a todos los jugadores
        io.to(data.roomCode).emit('card-drawn', {
          card,
          playerId: data.playerId,
          playerName: room.players.get(data.playerId)?.name
        });

        // Notificar cambio de fase si fue necesario
        if (room.currentPhase === GamePhase.IN_PROGRESS) {
          io.to(data.roomCode).emit('phase-changed', {
            phase: GamePhase.IN_PROGRESS,
            gameId: room.id
          });
        }

        console.log(`🃏 Carta sacada en sala ${data.roomCode}: ${card.question}`);
        
      } catch (error) {
        console.error('Error al sacar carta:', error);
        socket.emit('error', { message: 'Error al sacar carta' });
      }
    });

    // Jugador terminó de leer la carta - INICIA TIMER DE 60 SEGUNDOS
    socket.on('card-read', async (data: { playerId: string; cardId: string }) => {
      try {
        const room = Array.from(gameRooms.values()).find(r => r.players.has(data.playerId));
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const player = room.players.get(data.playerId);
        if (!player) {
          socket.emit('error', { message: 'Jugador no encontrado' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        // Limpiar timer anterior si existe
        if (room.answerTimer) {
          clearTimeout(room.answerTimer);
        }

        // Notificar a todos que la carta fue leída y el timer inicia
        io.to(room.roomCode).emit('card-read', {
          playerId: data.playerId,
          playerName: player.name,
          cardId: data.cardId
        });

        console.log(`📖 Carta leída por ${player.name} - iniciando timer de 60s`);

        // Iniciar timer de 60 segundos
        room.answerTimer = setTimeout(() => {
          console.log(`⏰ Timer expirado para ${player.name} - pasando turno automáticamente`);
          
          // Notificar timeout
          io.to(room.roomCode).emit('answer-timeout', {
            playerId: data.playerId,
            playerName: player.name,
            message: 'Tiempo agotado'
          });

          // Limpiar carta y pasar al siguiente turno
          room.gameState.currentCard = undefined;
          room.gameState.currentAnswer = undefined;
          
          // Calcular siguiente jugador
          const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
          const currentIndex = playersArray.findIndex(p => p.id === data.playerId);
          const nextIndex = (currentIndex + 1) % playersArray.length;
          const nextPlayer = playersArray[nextIndex];
          
          room.gameState.currentPlayerId = nextPlayer.id;
          
          io.to(room.roomCode).emit('turn-ended', {
            currentPlayerId: nextPlayer.id,
            currentTurn: room.currentTurn,
            phase: 'PLAYING',
            reason: 'timeout'
          });
        }, 60000); // 60 segundos

        console.log(`⏱️ Timer de 60s iniciado para ${player.name}`);
        
        // Notificar que el jugador puede responder (con timer activo)
        io.to(room.roomCode).emit('answer-timer-started', {
          playerId: data.playerId,
          playerName: player.name,
          timeLimit: 60
        });
        
      } catch (error) {
        console.error('Error al procesar lectura de carta:', error);
        socket.emit('error', { message: 'Error al procesar lectura de carta' });
      }
    });

    // Jugador presionó "Ya Respondí" - DETENER TIMER E INICIAR VOTACIÓN
    socket.on('player-answered', async (data: { playerId: string; cardId: string }) => {
      try {
        const room = Array.from(gameRooms.values()).find(r => r.players.has(data.playerId));
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const player = room.players.get(data.playerId);
        if (!player) {
          socket.emit('error', { message: 'Jugador no encontrado' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        // Limpiar timer
        if (room.answerTimer) {
          clearTimeout(room.answerTimer);
          room.answerTimer = undefined;
          console.log(`✅ Timer detenido - ${player.name} respondió a tiempo`);
        }

        // Cambiar fase a votación
        room.gameState.phase = 'VOTING';
        
        // Calcular aprobaciones requeridas (mayoría de los votantes)
        const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
        const totalVoters = playersArray.length - 1; // Excluir al jugador que responde
        const requiredApprovals = Math.ceil(totalVoters / 2);
        
        console.log(`🗳️ Configuración de votación: ${playersArray.length} jugadores, ${totalVoters} votantes, ${requiredApprovals} aprobaciones requeridas`);

        // Preparar para votación
        room.gameState.currentAnswer = {
          playerId: data.playerId,
          playerName: player.name,
          answer: 'Respuesta verbal',
          cardId: data.cardId,
          votes: new Map(),
          requiredApprovals
        };

        // Notificar cambio de fase a votación
        io.to(room.roomCode).emit('phase-changed', {
          phase: 'VOTING',
          currentPlayerId: room.gameState.currentPlayerId,
          message: `${player.name} respondió. ¡Hora de votar!`
        });

        console.log(`📖 ${player.name} respondió a tiempo. Iniciando votación.`);
        
      } catch (error) {
        console.error('Error al procesar respuesta:', error);
        socket.emit('error', { message: 'Error al procesar respuesta' });
      }
    });

    // PASAR TURNO - Jugador decide no responder
    socket.on('skip-turn', async (data: { roomCode: string; playerId: string }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const player = room.players.get(data.playerId);
        if (!player) {
          socket.emit('error', { message: 'Jugador no encontrado' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        console.log(`⏭️ ${player.name} decidió pasar su turno`);

        // Limpiar timer si existe
        if (room.answerTimer) {
          clearTimeout(room.answerTimer);
          room.answerTimer = undefined;
        }

        // Limpiar carta actual
        room.gameState.currentCard = undefined;
        room.gameState.currentAnswer = undefined;

        // Calcular siguiente jugador (excluyendo moderadores)
        const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
        const currentIndex = playersArray.findIndex(p => p.id === data.playerId);
        const nextIndex = (currentIndex + 1) % playersArray.length;
        const nextPlayer = playersArray[nextIndex];

        room.gameState.currentPlayerId = nextPlayer.id;

        // Notificar que el jugador pasó su turno
        io.to(data.roomCode).emit('turn-skipped', {
          playerId: data.playerId,
          playerName: player.name,
          nextPlayerId: nextPlayer.id,
          nextPlayerName: nextPlayer.name
        });

        // Notificar cambio de turno
        io.to(data.roomCode).emit('turn-ended', {
          currentPlayerId: nextPlayer.id,
          currentTurn: room.currentTurn,
          phase: 'PLAYING',
          reason: 'skipped'
        });

        console.log(`⏭️ Turno pasado de ${player.name} a ${nextPlayer.name}`);
        
      } catch (error) {
        console.error('Error al pasar turno:', error);
        socket.emit('error', { message: 'Error al pasar turno' });
      }
    });

    // Responder pregunta
    socket.on('submit-answer', async (data: { roomCode: string; playerId: string; answer: string; timeUsed: number }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (!room || !room.gameState.currentCard) {
          socket.emit('error', { message: 'No hay carta activa' });
          return;
        }

        const player = room.players.get(data.playerId);
        if (!player) {
          socket.emit('error', { message: 'Jugador no encontrado' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          console.log(`❌ ${room.players.get(data.playerId)?.name} intentó responder fuera de turno`);
          return;
        }

        // Calcular aprobaciones requeridas (mayoría de los votantes)
        const totalPlayers = room.players.size;
        const totalVoters = totalPlayers - 1; // Excluir al jugador que responde
        const requiredApprovals = Math.ceil(totalVoters / 2); // Mayoría de votantes
        
        console.log(`🗳️ Configuración de votación (submit-answer): ${totalPlayers} jugadores, ${totalVoters} votantes, ${requiredApprovals} aprobaciones requeridas`);

        // Guardar respuesta para aprobación
        room.gameState.currentAnswer = {
          playerId: data.playerId,
          playerName: player.name,
          answer: data.answer,
          cardId: room.gameState.currentCard.id,
          votes: new Map(),
          requiredApprovals
        };

        // Notificar respuesta a todos para aprobación
        io.to(data.roomCode).emit('answer-submitted', {
          playerId: data.playerId,
          playerName: player.name,
          answer: data.answer,
          requiresApproval: true
        });

        console.log(`💬 Respuesta de ${player.name}: ${data.answer} - Esperando aprobación`);
        
      } catch (error) {
        console.error('Error al procesar respuesta:', error);
        socket.emit('error', { message: 'Error al procesar respuesta' });
      }
    });

    // Aprobar respuesta de otro jugador (mantener compatibilidad con approved: boolean)
    socket.on('approve-answer', async (data: { playerId: string; approved: boolean; roomCode?: string }) => {
      try {
        console.log('🗳️ Voto recibido en backend:', data)
        
        // Buscar la sala por playerId si no se proporciona roomCode
        const room = data.roomCode 
          ? gameRooms.get(data.roomCode)
          : Array.from(gameRooms.values()).find(r => r.players.has(data.playerId));
        if (!room) {
          console.log('❌ Sala no encontrada para approve-answer')
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }
        
        if (!room.gameState.currentAnswer) {
          console.log('❌ No hay respuesta actual para aprobar')
          socket.emit('error', { message: 'No hay respuesta para aprobar' });
          return;
        }

        const voter = room.players.get(data.playerId);
        if (!voter) {
          socket.emit('error', { message: 'Jugador no encontrado' });
          return;
        }

        const currentAnswer = room.gameState.currentAnswer;
        
        // Verificar que no sea el jugador que respondió
        if (data.playerId === currentAnswer.playerId) {
          socket.emit('error', { message: 'No puedes aprobar tu propia respuesta' });
          return;
        }

        // Registrar voto (convertir boolean a 'agree' | 'disagree')
        const vote: 'agree' | 'disagree' = data.approved ? 'agree' : 'disagree';
        currentAnswer.votes.set(data.playerId, vote);
        console.log(`📝 Voto registrado: ${voter.name} -> ${vote}, Total votos en Map: ${currentAnswer.votes.size}`);

        // Notificar aprobación individual
        io.to(room.roomCode).emit('vote-registered', {
          playerId: data.playerId,
          approved: data.approved,
          totalVotes: currentAnswer.votes.size,
          approvedVotes: Array.from(currentAnswer.votes.values()).filter(v => v === 'agree').length
        });

        console.log(`👍 ${voter.name} ${data.approved ? 'aprobó' : 'rechazó'} la respuesta`);

        // Verificar si todos los jugadores (excepto el que leyó) han votado
        const totalVoters = room.players.size - 1; // Excluir al jugador que leyó
        const totalVotes = currentAnswer.votes.size;
        
        console.log(`🗳️ Votación: ${totalVotes}/${totalVoters} votos recibidos`);
        console.log(`🎯 Jugadores en sala: ${room.players.size}, Votantes esperados: ${totalVoters}`);
        console.log(`📊 Votos actuales:`, Array.from(currentAnswer.votes.entries()));
        
        if (totalVotes >= totalVoters) {
          console.log(`✅ Votación completa, procesando resultado...`);
          const approvedVotes = Array.from(currentAnswer.votes.values()).filter(v => v === 'agree').length;
          const disagreeVotes = Array.from(currentAnswer.votes.values()).filter(v => v === 'disagree').length;
          
          // SI HAY AL MENOS 1 DESACUERDO → ACTIVAR DEBATE
          if (disagreeVotes > 0) {
            console.log(`🗣️ HAY DESACUERDOS (${disagreeVotes}) - Activando fase de DEBATE`);
            
            room.gameState.phase = 'DEBATE';
            room.gameState.isInDebate = true;
            
            // Notificar inicio de debate
            io.to(room.roomCode).emit('debate-started', {
              playerId: currentAnswer.playerId,
              playerName: currentAnswer.playerName,
              agreeVotes: approvedVotes,
              disagreeVotes,
              totalVotes,
              votes: Array.from(currentAnswer.votes.entries()).map(([id, vote]) => ({
                playerId: id,
                playerName: room.players.get(id)?.name,
                vote
              })),
              message: 'Hay desacuerdos. El moderador debe resolver el debate.'
            });
            
            console.log(`🗣️ Debate iniciado - Esperando decisión del moderador`);
            return; // Salir y esperar a que el moderador resuelva
          }
          
          // SI TODOS ESTÁN DE ACUERDO → OTORGAR PUNTOS AUTOMÁTICAMENTE
          const finalApproved = approvedVotes >= currentAnswer.requiredApprovals;
          
          // Actualizar puntuación si fue aprobada
          if (finalApproved) {
            const answeringPlayer = room.players.get(currentAnswer.playerId);
            if (answeringPlayer && room.gameState.currentCard) {
              answeringPlayer.score += room.gameState.currentCard.points;
              console.log(`🎯 Puntuación actualizada: ${answeringPlayer.name} ahora tiene ${answeringPlayer.score} puntos`);
            }
          }

          // Notificar resultado final
          const answeringPlayer = room.players.get(currentAnswer.playerId);
          console.log(`📊 Emitiendo voting-completed: aprobada=${finalApproved}, puntos=${finalApproved && room.gameState.currentCard ? room.gameState.currentCard.points : 0}`);
          
          io.to(room.roomCode).emit('voting-completed', {
            approved: finalApproved,
            playerId: currentAnswer.playerId,
            playerName: currentAnswer.playerName,
            pointsEarned: finalApproved && room.gameState.currentCard ? room.gameState.currentCard.points : 0,
            approvedVotes,
            totalVotes,
            newScore: answeringPlayer?.score || 0,
            message: finalApproved ? 'Respuesta aprobada' : 'Respuesta rechazada'
          });

          // Verificar condiciones de fin de juego
          const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
          const targetScore = room.targetScore || 20;
          console.log(`🔍 Verificando fin de juego. Puntuaciones:`, playersArray.map(p => `${p.name}: ${p.score}`));
          console.log(`🎯 Target score: ${targetScore}`);
          console.log(`🃏 Cartas usadas: ${room.gameState.usedCards?.length || 0}/56`);
          
          // Condición 1: Alguien alcanzó el targetScore
          const winnerByScore = playersArray.find(p => p.score >= targetScore);
          
          // Condición 2: Se acabaron las cartas (56 cartas totales)
          const cardsExhausted = (room.gameState.usedCards?.length || 0) >= 56;
          
          let winner = null;
          let winCondition = '';
          
          if (winnerByScore) {
            winner = winnerByScore;
            winCondition = `${targetScore} puntos alcanzados`;
          } else if (cardsExhausted) {
            // Ganador por mayor puntaje cuando se acaban las cartas
            winner = playersArray.reduce((prev, current) => 
              (prev.score > current.score) ? prev : current
            );
            winCondition = 'cartas agotadas - mayor puntaje';
          }
          
          if (winner) {
            console.log(`🎯 GANADOR DETECTADO: ${winner.name} con ${winner.score} puntos (${winCondition})`);
            
            // Finalizar juego
            room.currentPhase = 'FINISHED';
            room.gameState.phase = 'FINISHED';
            
            // Limpiar respuesta actual
            room.gameState.currentAnswer = undefined;
            room.gameState.currentCard = undefined;
            
            // Marcar partida como completada en la base de datos Y actualizar scores
            if (room.id) {
              await GameModel.updateGamePhase(room.id, 'FINISHED');
              console.log(`📊 Partida ${room.id} marcada como FINISHED`);
              
              // Actualizar scores de todos los jugadores en la BD
              for (const player of playersArray) {
                console.log(`💾 Actualizando score de ${player.name}: ${player.score} puntos`);
                await GameModel.updatePlayerScore(room.id, player.name, player.score);
              }
            }
            
            // EMITIR EVENTO GAME-ENDED
            const gameEndData = {
              winner: {
                id: winner.id,
                name: winner.name,
                score: winner.score
              },
              finalScores: playersArray.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score
              }))
            };
            
            console.log(`📡 Emitiendo game-ended:`, gameEndData);
            io.to(room.roomCode).emit('game-ended', gameEndData);
            
            // Emitir room-updated para sincronización
            io.to(room.roomCode).emit('room-updated', {
              currentPhase: 'FINISHED',
              gameState: { ...room.gameState, phase: 'FINISHED' },
              winner: gameEndData.winner,
              finalScores: gameEndData.finalScores
            });
            
            // ELIMINAR SALA después de un tiempo prudente (sin redirección automática)
            setTimeout(() => {
              console.log(`🗑️ Eliminando sala ${room.roomCode} - partida terminada`);
              gameRooms.delete(room.roomCode);
              
              // Limpiar conexiones de jugadores
              for (const player of playersArray) {
                playerSockets.delete(player.id);
              }
            }, 1000); // 1 segundo para actualizar stats rápidamente
            
            return;
          }

          // Limpiar respuesta actual SOLO si no hay ganador
          room.gameState.currentAnswer = undefined;
          room.gameState.currentCard = undefined;
          
          // Auto-avanzar al siguiente turno después de 3 segundos SOLO si no hay ganador
          setTimeout(async () => {
            // Calcular siguiente jugador
            const currentPlayerId = room.gameState.currentPlayerId;
            
            let nextPlayerId: string;
            
            if (playersArray.length === 2) {
              // Con 2 jugadores, alternar directamente
              const currentIndex = playersArray.findIndex(p => p.id === currentPlayerId);
              const nextIndex = (currentIndex + 1) % playersArray.length;
              nextPlayerId = playersArray[nextIndex].id;
            } else {
              // Con 3+ jugadores, seleccionar aleatoriamente excluyendo el actual
              const availablePlayers = playersArray.filter(p => p.id !== currentPlayerId);
              const randomIndex = Math.floor(Math.random() * availablePlayers.length);
              nextPlayerId = availablePlayers[randomIndex].id;
            }
            
            room.gameState.currentPlayerId = nextPlayerId;
            
            // Notificar cambio de turno
            const nextPlayer = playersArray.find(p => p.id === nextPlayerId);
            io.to(room.roomCode).emit('turn-ended', {
              currentPlayerId: nextPlayerId,
              currentTurn: room.currentTurn,
              phase: 'PLAYING'
            });
            
            console.log(`🔄 Auto-avance: Turno cambiado a ${nextPlayer?.name} en sala ${room.roomCode}`);
          }, 3000);
        }
        
      } catch (error) {
        console.error('Error al procesar aprobación:', error);
        socket.emit('error', { message: 'Error al procesar aprobación' });
      }
    });

    // RESOLVER DEBATE - Solo el moderador puede ejecutar esto
    socket.on('resolve-debate', async (data: { roomCode: string; moderatorId: string; grantPoints: boolean }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const moderator = room.players.get(data.moderatorId);
        if (!moderator) {
          socket.emit('error', { message: 'Moderador no encontrado' });
          return;
        }

        // Verificar que quien envía el evento es moderador
        if (moderator.role !== 'MODERATOR' && moderator.role !== 'PLAYER_MODERATOR') {
          socket.emit('error', { message: 'Solo el moderador puede resolver debates' });
          return;
        }

        if (!room.gameState.currentAnswer || !room.gameState.isInDebate) {
          socket.emit('error', { message: 'No hay debate activo' });
          return;
        }

        console.log(`👨‍⚖️ Moderador ${moderator.name} resolvió el debate: ${data.grantPoints ? 'OTORGAR' : 'NO OTORGAR'} puntos`);

        const currentAnswer = room.gameState.currentAnswer;
        const answeringPlayer = room.players.get(currentAnswer.playerId);

        // Otorgar puntos si el moderador lo decide
        if (data.grantPoints && answeringPlayer && room.gameState.currentCard) {
          answeringPlayer.score += room.gameState.currentCard.points;
          console.log(`🎯 Puntuación actualizada por moderador: ${answeringPlayer.name} ahora tiene ${answeringPlayer.score} puntos`);
        }

        // Notificar resolución del debate
        io.to(data.roomCode).emit('debate-resolved', {
          moderatorId: data.moderatorId,
          moderatorName: moderator.name,
          playerId: currentAnswer.playerId,
          playerName: currentAnswer.playerName,
          pointsGranted: data.grantPoints,
          pointsEarned: data.grantPoints && room.gameState.currentCard ? room.gameState.currentCard.points : 0,
          newScore: answeringPlayer?.score || 0,
          message: data.grantPoints ? 'El moderador otorgó los puntos' : 'El moderador no otorgó puntos'
        });

        // Limpiar estado de debate
        room.gameState.isInDebate = false;
        room.gameState.phase = 'PLAYING';

        // Verificar condiciones de fin de juego
        const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
        const targetScore = room.targetScore || 20;
        const winnerByScore = playersArray.find(p => p.score >= targetScore);
        const cardsExhausted = (room.gameState.usedCards?.length || 0) >= 56;

        let winner = null;
        if (winnerByScore) {
          winner = winnerByScore;
        } else if (cardsExhausted) {
          winner = playersArray.reduce((prev, current) => 
            (prev.score > current.score) ? prev : current
          );
        }

        if (winner) {
          console.log(`🎯 GANADOR DETECTADO: ${winner.name} con ${winner.score} puntos`);
          
          room.currentPhase = 'FINISHED';
          room.gameState.phase = 'FINISHED';
          room.gameState.currentAnswer = undefined;
          room.gameState.currentCard = undefined;
          
          console.log(`🔍 DEBUG - room.id: ${room.id}`);
          if (room.id) {
            await GameModel.updateGamePhase(room.id, 'FINISHED');
            console.log(`💾 Actualizando scores de ${playersArray.length} jugadores en BD`);
            for (const player of playersArray) {
              console.log(`💾 Actualizando ${player.name}: ${player.score} puntos`);
              await GameModel.updatePlayerScore(room.id, player.name, player.score);
            }
          } else {
            console.error(`❌ ERROR: room.id es undefined, no se pueden guardar scores`);
          }
          
          io.to(room.roomCode).emit('game-ended', {
            winner: {
              id: winner.id,
              name: winner.name,
              score: winner.score
            },
            finalScores: playersArray.map(p => ({
              id: p.id,
              name: p.name,
              score: p.score
            }))
          });
          
          setTimeout(() => {
            gameRooms.delete(room.roomCode);
            for (const player of playersArray) {
              playerSockets.delete(player.id);
            }
          }, 1000);
          
          return;
        }

        // Limpiar respuesta y pasar al siguiente turno después de 3 segundos
        room.gameState.currentAnswer = undefined;
        room.gameState.currentCard = undefined;

        setTimeout(() => {
          const currentPlayerId = room.gameState.currentPlayerId;
          let nextPlayerId: string;
          
          if (playersArray.length === 2) {
            const currentIndex = playersArray.findIndex(p => p.id === currentPlayerId);
            const nextIndex = (currentIndex + 1) % playersArray.length;
            nextPlayerId = playersArray[nextIndex].id;
          } else {
            const availablePlayers = playersArray.filter(p => p.id !== currentPlayerId);
            const randomIndex = Math.floor(Math.random() * availablePlayers.length);
            nextPlayerId = availablePlayers[randomIndex].id;
          }
          
          room.gameState.currentPlayerId = nextPlayerId;
          
          io.to(room.roomCode).emit('turn-ended', {
            currentPlayerId: nextPlayerId,
            currentTurn: room.currentTurn,
            phase: 'PLAYING'
          });
          
          console.log(`🔄 Turno cambiado a ${playersArray.find(p => p.id === nextPlayerId)?.name}`);
        }, 3000);
        
      } catch (error) {
        console.error('Error al resolver debate:', error);
        socket.emit('error', { message: 'Error al resolver debate' });
      }
    });

    // Pasar turno
    socket.on('next-turn', async (data: { roomCode: string; playerId: string }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        // Verificar que es el turno del jugador
        if (room.gameState.currentPlayerId !== data.playerId) {
          socket.emit('error', { message: 'No es tu turno' });
          return;
        }

        // Calcular siguiente jugador
        const playersArray = Array.from(room.players.values());
        const currentPlayerId = room.gameState.currentPlayerId;
        
        let nextPlayerId: string;
        
        if (playersArray.length === 2) {
          // Con 2 jugadores, alternar directamente
          const currentIndex = playersArray.findIndex(p => p.id === currentPlayerId);
          const nextIndex = (currentIndex + 1) % playersArray.length;
          nextPlayerId = playersArray[nextIndex].id;
        } else {
          // Con 3+ jugadores, seleccionar aleatoriamente excluyendo el actual
          const availablePlayers = playersArray.filter(p => p.id !== currentPlayerId);
          const randomIndex = Math.floor(Math.random() * availablePlayers.length);
          nextPlayerId = availablePlayers[randomIndex].id;
        }
        
        room.gameState.currentPlayerId = nextPlayerId;

        // Actualizar estado
        room.gameState.currentCard = undefined;
        room.currentTurn = (room.currentTurn || 0) + 1;

        // NO verificar ganador aquí - ya se verificó arriba inmediatamente después de la votación
        console.log('⚠️ Verificación de ganador duplicada eliminada del setTimeout');

        // Notificar cambio de turno
        const nextPlayer = playersArray.find(p => p.id === nextPlayerId);
        io.to(room.roomCode).emit('turn-ended', {
          currentPlayerId: nextPlayerId,
          currentTurn: room.currentTurn
        });

        console.log(`🔄 Turno cambiado a ${nextPlayer?.name} en sala ${data.roomCode}`);
        
      } catch (error) {
        console.error('Error al cambiar turno:', error);
        socket.emit('error', { message: 'Error al cambiar turno' });
      }
    });

    // FINALIZAR PARTIDA - Solo el moderador puede ejecutar esto
    socket.on('end-game-moderator', async (data: { roomCode: string; moderatorId: string }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        const moderator = room.players.get(data.moderatorId);
        if (!moderator) {
          socket.emit('error', { message: 'Moderador no encontrado' });
          return;
        }

        // Verificar que quien envía el evento es moderador
        if (moderator.role !== 'MODERATOR' && moderator.role !== 'PLAYER_MODERATOR') {
          socket.emit('error', { message: 'Solo el moderador puede finalizar la partida' });
          return;
        }

        console.log(`🛑 Moderador ${moderator.name} finalizó la partida manualmente`);

        // Limpiar timers
        if (room.answerTimer) {
          clearTimeout(room.answerTimer);
        }

        // Determinar ganador por mayor puntaje
        const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
        const winner = playersArray.reduce((prev, current) => 
          (prev.score > current.score) ? prev : current
        );

        // Finalizar juego
        room.currentPhase = 'FINISHED';
        room.gameState.phase = 'FINISHED';
        room.gameState.currentAnswer = undefined;
        room.gameState.currentCard = undefined;

        // Actualizar BD
        if (room.id) {
          await GameModel.updateGamePhase(room.id, 'FINISHED');
          for (const player of playersArray) {
            await GameModel.updatePlayerScore(room.id, player.id, player.score);
          }
        }

        // Notificar fin de juego
        io.to(data.roomCode).emit('game-ended', {
          winner: {
            id: winner.id,
            name: winner.name,
            score: winner.score
          },
          finalScores: playersArray.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score
          })),
          reason: 'moderator_ended'
        });

        console.log(`🏁 Partida finalizada por moderador. Ganador: ${winner.name} con ${winner.score} puntos`);

        // Eliminar sala después de un tiempo
        setTimeout(() => {
          gameRooms.delete(room.roomCode);
          for (const player of playersArray) {
            playerSockets.delete(player.id);
          }
          console.log(`🗑️ Sala ${room.roomCode} eliminada`);
        }, 1000);
        
      } catch (error) {
        console.error('Error al finalizar partida:', error);
        socket.emit('error', { message: 'Error al finalizar partida' });
      }
    });

    // Obtener estado de la sala
    socket.on('get-room-state', (data: { roomCode: string }) => {
      const room = gameRooms.get(data.roomCode);
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
    });

    // Manejo de desconexión
    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
      
      // Encontrar y actualizar el estado del jugador
      for (const [playerId, socketId] of playerSockets.entries()) {
        if (socketId === socket.id) {
          playerSockets.delete(playerId);
          
          // Buscar en qué sala estaba el jugador
          for (const [roomCode, room] of gameRooms.entries()) {
            const player = room.players.get(playerId);
            if (player) {
              player.isConnected = false;
              
              // Notificar a otros jugadores
              socket.to(roomCode).emit('player-disconnected', {
                playerId,
                playerName: player.name
              });
              
              console.log(`👋 Jugador ${player.name} se desconectó de sala ${roomCode}`);
              break;
            }
          }
          break;
        }
      }
    });

    // Reconexión de jugador
    socket.on('reconnect-player', async (data: { roomCode: string; playerId: string }) => {
      try {
        const room = gameRooms.get(data.roomCode);
        if (room) {
          const player = room.players.get(data.playerId);
          if (player) {
            player.socketId = socket.id;
            player.isConnected = true;
            playerSockets.set(data.playerId, socket.id);
            
            socket.join(data.roomCode);
            
            // Enviar estado actual al jugador reconectado
            const playersArray = Array.from(room.players.values());
            socket.emit('reconnected', {
              players: playersArray,
              gameState: room.gameState,
              currentPhase: room.currentPhase
            });
            
            // Notificar a otros jugadores
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
    });
  });

  // Limpiar salas vacías cada 5 minutos
  setInterval(() => {
    for (const [roomCode, room] of gameRooms.entries()) {
      const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
      if (connectedPlayers.length === 0) {
        gameRooms.delete(roomCode);
        console.log(`🧹 Sala vacía eliminada: ${roomCode}`);
      }
    }
  }, 5 * 60 * 1000);
};

// Exportar funciones útiles
export const getGameRoom = (roomCode: string) => gameRooms.get(roomCode);
export const getAllGameRooms = () => Array.from(gameRooms.values());
export const getPlayerSocket = (playerId: string) => playerSockets.get(playerId);
