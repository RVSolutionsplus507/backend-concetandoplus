import { Server, Socket } from 'socket.io';
import { GameModel } from '../../models/gameModel';
import { gameRoomStore } from '../GameRoomStore';
import { debateService } from '../../services/DebateService';
import { gameService } from '../../services/GameService';
import { turnService } from '../../services/TurnService';
import { dailyService } from '../../services/dailyService';
import { PlayerInRoom, GameRoom } from '../types';

export class DebateHandler {
  constructor(private io: Server) {}

  // Resolver debate
  async handleResolveDebate(socket: Socket, data: { roomCode: string; moderatorId: string; grantPoints: boolean }) {
    try {
      const room = gameRoomStore.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const moderator = room.players.get(data.moderatorId);
      if (!moderator) {
        socket.emit('error', { message: 'Moderador no encontrado' });
        return;
      }

      if (!debateService.canResolveDebate(moderator.role)) {
        socket.emit('error', { message: 'Solo el moderador puede resolver debates' });
        return;
      }

      if (!room.gameState.currentAnswer || !room.gameState.isInDebate) {
        socket.emit('error', { message: 'No hay debate activo' });
        return;
      }

      console.log(`👨‍⚖️ Moderador ${moderator.name} resolvió: ${data.grantPoints ? 'OTORGAR' : 'DENEGAR'} puntos`);

      const currentAnswer = room.gameState.currentAnswer;
      const answeringPlayer = room.players.get(currentAnswer.playerId);

      // Aplicar decisión
      if (answeringPlayer && room.gameState.currentCard) {
        debateService.applyModeratorDecision(answeringPlayer, data.grantPoints, room.gameState.currentCard.points);
        console.log(`🎯 ${answeringPlayer.name}: ${answeringPlayer.score} puntos`);
      }

      // Notificar resolución
      this.io.to(data.roomCode).emit('debate-resolved', {
        moderatorId: data.moderatorId,
        moderatorName: moderator.name,
        playerId: currentAnswer.playerId,
        playerName: currentAnswer.playerName,
        pointsGranted: data.grantPoints,
        pointsEarned: data.grantPoints && room.gameState.currentCard ? room.gameState.currentCard.points : 0,
        newScore: answeringPlayer?.score || 0,
        message: data.grantPoints ? 'El moderador otorgó los puntos' : 'El moderador no otorgó puntos'
      });

      // Limpiar debate
      room.gameState.isInDebate = false;
      room.gameState.phase = 'PLAYING';

      // Verificar victoria
      const playersArray: PlayerInRoom[] = Array.from(room.players.values());
      const targetScore = room.targetScore || 20;
      const usedCardsCount = room.gameState.usedCards?.length || 0;

      const result = gameService.checkWinConditions(playersArray, targetScore, usedCardsCount);

      if (result.winner) {
        await this.handleGameEnd(room, result.winner, playersArray);
        return;
      }

      // Continuar juego
      room.gameState.currentAnswer = undefined;
      room.gameState.currentCard = undefined;

      setTimeout(() => {
        const nextPlayer = turnService.getNextPlayer(room.gameState.currentPlayerId!, playersArray);
        room.gameState.currentPlayerId = nextPlayer.id;

        this.io.to(room.roomCode).emit('turn-ended', {
          currentPlayerId: nextPlayer.id,
          currentTurn: room.currentTurn,
          phase: 'PLAYING'
        });

        console.log(`🔄 Turno: ${nextPlayer.name}`);
      }, 3000);
    } catch (error) {
      console.error('Error al resolver debate:', error);
      socket.emit('error', { message: 'Error al resolver debate' });
    }
  }

  // Finalizar juego
  private async handleGameEnd(room: GameRoom, winner: PlayerInRoom, playersArray: PlayerInRoom[]) {
    console.log(`🎯 GANADOR: ${winner.name} (${winner.score} pts)`);

    room.currentPhase = 'FINISHED';
    room.gameState.phase = 'FINISHED';
    room.gameState.currentAnswer = undefined;
    room.gameState.currentCard = undefined;

    // Guardar en BD
    if (room.id) {
      await GameModel.updateGamePhase(room.id, 'FINISHED');
      const eligiblePlayers = playersArray.filter(p => p.role !== 'MODERATOR');
      for (const player of eligiblePlayers) {
        await GameModel.updatePlayerScore(room.id, player.name, player.score);
      }
    }

    this.io.to(room.roomCode).emit('game-ended', {
      winner: { id: winner.id, name: winner.name, score: winner.score },
      finalScores: playersArray.filter(p => p.role !== 'MODERATOR').map(p => ({
        id: p.id, name: p.name, score: p.score
      }))
    });

    setTimeout(async () => {
      // Cleanup Daily.co room if it exists
      if (room.id && dailyService.isConfigured()) {
        try {
          const game = await GameModel.findById(room.id);
          if (game?.dailyRoomName) {
            await dailyService.deleteRoom(game.dailyRoomName);
            console.log(`🎥 Daily.co room ${game.dailyRoomName} eliminada`);
          }
        } catch (error) {
          console.error('Error al eliminar sala de Daily.co:', error);
        }
      }

      gameRoomStore.deleteRoom(room.roomCode);
      playersArray.forEach(p => gameRoomStore.deletePlayerSocket(p.id));
    }, 1000);
  }
}
