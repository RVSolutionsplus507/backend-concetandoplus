import { Server, Socket } from 'socket.io';
import { GameModel } from '../../models/gameModel';
import { gameRoomStore } from '../GameRoomStore';
import { votingService } from '../../services/VotingService';
import { gameService } from '../../services/GameService';
import { turnService } from '../../services/TurnService';
import { dailyService } from '../../services/dailyService';
import { PlayerInRoom, GameRoom } from '../types';

export class VotingHandler {
  constructor(private io: Server) {}

  // Aprobar respuesta
  async handleApproveAnswer(socket: Socket, data: { playerId: string; approved: boolean; roomCode?: string }) {
    try {
      console.log('🗳️ Voto recibido:', data);

      const room = data.roomCode
        ? gameRoomStore.getRoom(data.roomCode)
        : gameRoomStore.findRoomByPlayerId(data.playerId);

      if (!room) {
        console.log('❌ Sala no encontrada');
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      if (!room.gameState.currentAnswer) {
        console.log('❌ No hay respuesta para aprobar');
        socket.emit('error', { message: 'No hay respuesta para aprobar' });
        return;
      }

      const voter = room.players.get(data.playerId);
      if (!voter) {
        socket.emit('error', { message: 'Jugador no encontrado' });
        return;
      }

      const currentAnswer = room.gameState.currentAnswer;

      // No puede votar su propia respuesta
      if (data.playerId === currentAnswer.playerId) {
        socket.emit('error', { message: 'No puedes aprobar tu propia respuesta' });
        return;
      }

      // Registrar voto
      const vote: 'agree' | 'disagree' = data.approved ? 'agree' : 'disagree';
      currentAnswer.votes.set(data.playerId, vote);
      console.log(`📝 Voto: ${voter.name} -> ${vote}, Total: ${currentAnswer.votes.size}`);

      // Notificar voto individual
      this.io.to(room.roomCode).emit('vote-registered', {
        playerId: data.playerId,
        approved: data.approved,
        totalVotes: currentAnswer.votes.size,
        approvedVotes: votingService.countVotes(currentAnswer.votes).approved
      });

      console.log(`👍 ${voter.name} ${data.approved ? 'aprobó' : 'rechazó'}`);

      // Verificar si todos votaron
      const totalVoters = room.players.size - 1;
      const totalVotes = currentAnswer.votes.size;

      console.log(`🗳️ Votación: ${totalVotes}/${totalVoters}`);

      if (votingService.hasAllVoted(totalVotes, totalVoters)) {
        await this.processVotingResult(room);
      }
    } catch (error) {
      console.error('Error al procesar voto:', error);
      socket.emit('error', { message: 'Error al procesar aprobación' });
    }
  }

  // Procesar resultado de votación
  private async processVotingResult(room: GameRoom) {
    console.log(`✅ Votación completa`);

    const currentAnswer = room.gameState.currentAnswer!;
    const votes = votingService.countVotes(currentAnswer.votes);

    // SI HAY DESACUERDOS → DEBATE
    if (votingService.shouldTriggerDebate(currentAnswer.votes)) {
      console.log(`🗣️ Desacuerdos detectados (${votes.disagreed}) - Activando DEBATE`);

      room.gameState.phase = 'DEBATE';
      room.gameState.isInDebate = true;

      this.io.to(room.roomCode).emit('debate-started', {
        playerId: currentAnswer.playerId,
        playerName: currentAnswer.playerName,
        agreeVotes: votes.approved,
        disagreeVotes: votes.disagreed,
        totalVotes: currentAnswer.votes.size,
        votes: Array.from(currentAnswer.votes.entries()).map(([id, vote]) => ({
          playerId: id,
          playerName: room.players.get(id)?.name,
          vote
        })),
        message: 'Hay desacuerdos. El moderador debe resolver el debate.'
      });

      console.log(`🗣️ Debate iniciado`);
      return;
    }

    // TODOS DE ACUERDO → OTORGAR/DENEGAR PUNTOS
    const finalApproved = votingService.isVotingApproved(votes.approved, currentAnswer.requiredApprovals);

    if (finalApproved) {
      const answeringPlayer = room.players.get(currentAnswer.playerId);
      if (answeringPlayer && room.gameState.currentCard) {
        gameService.updatePlayerScore(answeringPlayer, room.gameState.currentCard.points);
        console.log(`🎯 ${answeringPlayer.name} ahora tiene ${answeringPlayer.score} puntos`);
      }
    }

    // Notificar resultado
    const answeringPlayer = room.players.get(currentAnswer.playerId);
    this.io.to(room.roomCode).emit('voting-completed', {
      approved: finalApproved,
      playerId: currentAnswer.playerId,
      playerName: currentAnswer.playerName,
      pointsEarned: finalApproved && room.gameState.currentCard ? room.gameState.currentCard.points : 0,
      approvedVotes: votes.approved,
      totalVotes: currentAnswer.votes.size,
      newScore: answeringPlayer?.score || 0,
      message: finalApproved ? 'Respuesta aprobada' : 'Respuesta rechazada'
    });

    // Verificar victoria
    await this.checkWinConditions(room);
  }

  // Verificar condiciones de victoria
  private async checkWinConditions(room: GameRoom) {
    const playersArray: PlayerInRoom[] = Array.from(room.players.values());
    const targetScore = room.targetScore || 20;
    const usedCardsCount = room.gameState.usedCards?.length || 0;

    console.log(`🔍 Verificando victoria: target=${targetScore}, cartas=${usedCardsCount}/56`);

    const result = gameService.checkWinConditions(playersArray, targetScore, usedCardsCount);

    if (result.winner) {
      console.log(`🎯 GANADOR: ${result.winner.name} (${result.winner.score} pts) - ${result.condition}`);

      // Finalizar juego
      room.currentPhase = 'FINISHED';
      room.gameState.phase = 'FINISHED';
      room.gameState.currentAnswer = undefined;
      room.gameState.currentCard = undefined;

      // Guardar en BD
      if (room.id) {
        await GameModel.updateGamePhase(room.id, 'FINISHED');

        const eligiblePlayers = playersArray.filter((p: any) => p.role !== 'MODERATOR');
        for (const player of eligiblePlayers) {
          await GameModel.updatePlayerScore(room.id, player.name, player.score);
        }
      }

      // Emitir evento
      this.io.to(room.roomCode).emit('game-ended', {
        winner: { id: result.winner.id, name: result.winner.name, score: result.winner.score },
        finalScores: playersArray.filter(p => p.role !== 'MODERATOR').map(p => ({
          id: p.id, name: p.name, score: p.score
        }))
      });

      this.io.to(room.roomCode).emit('room-updated', {
        currentPhase: 'FINISHED',
        gameState: { ...room.gameState, phase: 'FINISHED' },
        winner: { id: result.winner.id, name: result.winner.name, score: result.winner.score },
        finalScores: playersArray.filter(p => p.role !== 'MODERATOR').map(p => ({
          id: p.id, name: p.name, score: p.score
        }))
      });

      // Eliminar sala y cleanup de Daily.co
      setTimeout(async () => {
        console.log(`🧹 [VOTING] Iniciando limpieza de sala ${room.roomCode}...`);

        // Cleanup Daily.co room if it exists
        if (room.id && dailyService.isConfigured()) {
          console.log(`🔍 [VOTING] Verificando sala de Daily.co para gameId: ${room.id}`);
          try {
            const game = await GameModel.findById(room.id);
            console.log(`📊 [VOTING] Game encontrado:`, {
              id: game?.id,
              roomCode: game?.roomCode,
              dailyRoomName: game?.dailyRoomName
            });

            if (game?.dailyRoomName) {
              console.log(`🎥 [VOTING] Intentando eliminar Daily.co room: ${game.dailyRoomName}`);
              const deleted = await dailyService.deleteRoom(game.dailyRoomName);
              if (deleted) {
                console.log(`✅ [VOTING] Daily.co room ${game.dailyRoomName} eliminada exitosamente`);
              } else {
                console.log(`⚠️ [VOTING] No se pudo eliminar la sala de Daily.co`);
              }
            } else {
              console.log(`⚠️ [VOTING] No hay dailyRoomName para eliminar`);
            }
          } catch (error) {
            console.error('❌ [VOTING] Error al eliminar sala de Daily.co:', error);
          }
        }

        gameRoomStore.deleteRoom(room.roomCode);
        playersArray.forEach(p => gameRoomStore.deletePlayerSocket(p.id));
        console.log(`🗑️ [VOTING] Sala ${room.roomCode} eliminada de memoria`);
      }, 1000);

      return;
    }

    // No hay ganador, continuar juego
    room.gameState.currentAnswer = undefined;
    room.gameState.currentCard = undefined;

    // Auto-avanzar turno después de 3s
    setTimeout(() => {
      const playersArray: PlayerInRoom[] = Array.from(room.players.values());
      const nextPlayer = turnService.getNextPlayer(room.gameState.currentPlayerId!, playersArray);

      room.gameState.currentPlayerId = nextPlayer.id;

      this.io.to(room.roomCode).emit('turn-ended', {
        currentPlayerId: nextPlayer.id,
        currentTurn: room.currentTurn,
        phase: 'PLAYING'
      });

      console.log(`🔄 Turno cambiado a ${nextPlayer.name}`);
    }, 3000);
  }
}
