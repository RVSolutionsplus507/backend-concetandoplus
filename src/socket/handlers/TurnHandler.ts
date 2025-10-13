import { Server, Socket } from 'socket.io';
import { gameRoomStore } from '../GameRoomStore';
import { turnService } from '../../services/TurnService';
import { votingService } from '../../services/VotingService';
import { timerService } from '../../services/TimerService';
import { PlayerInRoom, GameRoom } from '../types';

export class TurnHandler {
  constructor(private io: Server) {}

  // Carta leída - iniciar timer
  async handleCardRead(socket: Socket, data: { playerId: string; cardId: string }) {
    try {
      const room = gameRoomStore.findRoomByPlayerId(data.playerId);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const player = room.players.get(data.playerId);
      if (!player) {
        socket.emit('error', { message: 'Jugador no encontrado' });
        return;
      }

      if (!turnService.isPlayerTurn(data.playerId, room.gameState.currentPlayerId)) {
        socket.emit('error', { message: 'No es tu turno' });
        return;
      }

      // Limpiar timer anterior
      timerService.clearTimer(room.answerTimer);

      // Notificar carta leída
      this.io.to(room.roomCode).emit('card-read', {
        playerId: data.playerId,
        playerName: player.name,
        cardId: data.cardId
      });

      console.log(`📖 Carta leída por ${player.name} - timer 60s`);

      // Iniciar timer 60s
      room.answerTimer = timerService.startAnswerTimer(60000, () => {
        this.handleAnswerTimeout(room, data.playerId, player.name);
      });

      this.io.to(room.roomCode).emit('answer-timer-started', {
        playerId: data.playerId,
        playerName: player.name,
        timeLimit: 60
      });
    } catch (error) {
      console.error('Error al procesar card-read:', error);
      socket.emit('error', { message: 'Error al procesar lectura de carta' });
    }
  }

  // Timeout de respuesta
  private handleAnswerTimeout(room: GameRoom, playerId: string, playerName: string) {
    console.log(`⏰ Timer expirado para ${playerName}`);

    this.io.to(room.roomCode).emit('answer-timeout', {
      playerId,
      playerName,
      message: 'Tiempo agotado'
    });

    // Limpiar y pasar turno
    room.gameState.currentCard = undefined;
    room.gameState.currentAnswer = undefined;

    const playersArray: PlayerInRoom[] = Array.from(room.players.values());
    const nextPlayer = turnService.getNextPlayer(playerId, playersArray);

    room.gameState.currentPlayerId = nextPlayer.id;

    this.io.to(room.roomCode).emit('turn-ended', {
      currentPlayerId: nextPlayer.id,
      currentTurn: room.currentTurn,
      phase: 'PLAYING',
      reason: 'timeout'
    });
  }

  // Jugador respondió
  async handlePlayerAnswered(socket: Socket, data: { playerId: string; cardId: string }) {
    try {
      const room = gameRoomStore.findRoomByPlayerId(data.playerId);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const player = room.players.get(data.playerId);
      if (!player) {
        socket.emit('error', { message: 'Jugador no encontrado' });
        return;
      }

      if (!turnService.isPlayerTurn(data.playerId, room.gameState.currentPlayerId)) {
        socket.emit('error', { message: 'No es tu turno' });
        return;
      }

      // Detener timer
      timerService.clearTimer(room.answerTimer);
      room.answerTimer = undefined;
      console.log(`✅ Timer detenido - ${player.name} respondió`);

      // Cambiar a votación
      room.gameState.phase = 'VOTING';

      const playersArray = Array.from(room.players.values()).filter(p => p.role !== 'MODERATOR');
      const requiredApprovals = votingService.calculateRequiredApprovals(playersArray.length);

      console.log(`🗳️ Votación iniciada: ${playersArray.length} jugadores, ${requiredApprovals} aprobaciones requeridas`);

      room.gameState.currentAnswer = {
        playerId: data.playerId,
        playerName: player.name,
        answer: 'Respuesta verbal',
        cardId: data.cardId,
        votes: new Map(),
        requiredApprovals
      };

      this.io.to(room.roomCode).emit('phase-changed', {
        phase: 'VOTING',
        currentPlayerId: room.gameState.currentPlayerId,
        message: `${player.name} respondió. ¡Hora de votar!`
      });

      console.log(`📖 ${player.name} respondió. Votación iniciada.`);
    } catch (error) {
      console.error('Error al procesar player-answered:', error);
      socket.emit('error', { message: 'Error al procesar respuesta' });
    }
  }

  // Pasar turno
  async handleSkipTurn(socket: Socket, data: { roomCode: string; playerId: string }) {
    try {
      const room = gameRoomStore.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const player = room.players.get(data.playerId);
      if (!player) {
        socket.emit('error', { message: 'Jugador no encontrado' });
        return;
      }

      if (!turnService.isPlayerTurn(data.playerId, room.gameState.currentPlayerId)) {
        socket.emit('error', { message: 'No es tu turno' });
        return;
      }

      console.log(`⏭️ ${player.name} pasó su turno`);

      // Limpiar timer
      timerService.clearTimer(room.answerTimer);
      room.answerTimer = undefined;

      // Limpiar estado
      room.gameState.currentCard = undefined;
      room.gameState.currentAnswer = undefined;

      // Siguiente jugador
      const playersArray: PlayerInRoom[] = Array.from(room.players.values());
      const nextPlayer = turnService.getNextPlayer(data.playerId, playersArray);

      room.gameState.currentPlayerId = nextPlayer.id;

      this.io.to(data.roomCode).emit('turn-skipped', {
        playerId: data.playerId,
        playerName: player.name,
        nextPlayerId: nextPlayer.id,
        nextPlayerName: nextPlayer.name
      });

      this.io.to(data.roomCode).emit('turn-ended', {
        currentPlayerId: nextPlayer.id,
        currentTurn: room.currentTurn,
        phase: 'PLAYING',
        reason: 'skipped'
      });

      console.log(`⏭️ Turno: ${player.name} → ${nextPlayer.name}`);
    } catch (error) {
      console.error('Error al pasar turno:', error);
      socket.emit('error', { message: 'Error al pasar turno' });
    }
  }
}
