import { Server, Socket } from 'socket.io';
import { GameModel } from '../../models/gameModel';
import { CardModel } from '../../models/cardModel';
import { gameRoomStore } from '../GameRoomStore';
import { turnService } from '../../services/TurnService';
import { gameService } from '../../services/GameService';
import { dailyService } from '../../services/dailyService';
import { CardType, GamePhase } from '../../types';

export class GameHandler {
  constructor(private io: Server) {}

  // Iniciar juego
  async handleStartGame(socket: Socket, data: { roomCode: string; playerId: string }) {
    try {
      console.log(`🚀 Evento start-game: roomCode=${data.roomCode}`);

      const room = gameRoomStore.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const validation = gameService.canStartGame(room.players.size);
      if (!validation.canStart) {
        socket.emit('error', { message: validation.reason });
        return;
      }

      // Actualizar fase
      room.currentPhase = GamePhase.IN_PROGRESS;
      if (room.id) {
        await GameModel.updateGamePhase(room.id, 'IN_PROGRESS');
      }

      // Primer jugador
      const playersArray = Array.from(room.players.values());
      const firstPlayer = turnService.selectFirstPlayer(playersArray);
      room.gameState.currentPlayerId = firstPlayer.id;

      console.log(`🎯 Primer jugador: ${firstPlayer.name}`);

      // Notificar
      this.io.to(data.roomCode).emit('game-started', {
        gameId: room.id,
        currentPlayerId: firstPlayer.id,
        currentPlayerName: firstPlayer.name,
        gameState: room.gameState,
        players: playersArray.map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          isCurrentTurn: p.id === firstPlayer.id
        }))
      });

      console.log(`🎮 Juego iniciado en sala ${data.roomCode}`);
    } catch (error) {
      console.error('Error al iniciar juego:', error);
      socket.emit('error', { message: 'Error al iniciar juego' });
    }
  }

  // Iniciar explicación
  async handleStartExplanation(socket: Socket, data: { gameId: string }) {
    try {
      const result = gameRoomStore.findRoomByGameId(data.gameId);
      if (!result) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const { roomCode, room } = result;

      if (!gameService.hasMinimumPlayers(room.players.size)) {
        socket.emit('error', { message: 'Se necesitan al menos 2 jugadores' });
        return;
      }

      room.currentPhase = GamePhase.EXPLANATION;
      if (room.id) {
        await GameModel.updateGamePhase(room.id, 'EXPLANATION');
      }

      this.io.to(roomCode).emit('explanation-started', { gameId: data.gameId });
      console.log(`📚 Fase de explicación iniciada en sala ${roomCode}`);
    } catch (error) {
      console.error('Error al iniciar explicación:', error);
      socket.emit('error', { message: 'Error al iniciar fase de explicación' });
    }
  }

  // Sacar carta
  async handleDrawCard(socket: Socket, data: { roomCode: string; playerId: string; cardType: CardType }) {
    try {
      console.log(`🃏 draw-card: roomCode=${data.roomCode}, playerId=${data.playerId}, type=${data.cardType}`);

      const room = gameRoomStore.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      // Verificar turno
      if (!turnService.isPlayerTurn(data.playerId, room.gameState.currentPlayerId)) {
        console.log(`❌ No es turno de ${data.playerId}`);
        socket.emit('error', { message: 'No es tu turno' });
        return;
      }

      // Inicializar cartas usadas
      if (!room.gameState.usedCards) {
        room.gameState.usedCards = [];
      }

      // Obtener carta
      const card = await CardModel.getRandomCard(data.cardType, room.gameState.usedCards, room.allowedCategories);
      if (!card) {
        socket.emit('error', { message: 'No hay cartas disponibles de este tipo' });
        return;
      }

      room.gameState.usedCards.push(card.id);

      // Cambiar fase si necesario
      if (room.currentPhase === GamePhase.EXPLANATION) {
        room.currentPhase = GamePhase.IN_PROGRESS;
        if (room.id) {
          await GameModel.updateGamePhase(room.id, 'IN_PROGRESS');
        }
        console.log(`📚➡️🎮 Cambiando a IN_PROGRESS`);
      }

      room.gameState.currentCard = card;

      // Notificar
      this.io.to(data.roomCode).emit('card-drawn', {
        card,
        playerId: data.playerId,
        playerName: room.players.get(data.playerId)?.name
      });

      if (room.currentPhase === GamePhase.IN_PROGRESS) {
        this.io.to(data.roomCode).emit('phase-changed', {
          phase: GamePhase.IN_PROGRESS,
          gameId: room.id
        });
      }

      console.log(`🃏 Carta sacada: ${card.question}`);
    } catch (error) {
      console.error('Error al sacar carta:', error);
      socket.emit('error', { message: 'Error al sacar carta' });
    }
  }

  // Finalizar partida (moderador)
  async handleEndGame(socket: Socket, data: { roomCode: string; moderatorId: string }) {
    try {
      const room = gameRoomStore.getRoom(data.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Sala no encontrada' });
        return;
      }

      const moderator = room.players.get(data.moderatorId);
      if (!moderator || (moderator.role !== 'MODERATOR' && moderator.role !== 'PLAYER_MODERATOR')) {
        socket.emit('error', { message: 'Solo el moderador puede finalizar la partida' });
        return;
      }

      console.log(`🛑 Moderador ${moderator.name} finalizó la partida`);

      // Limpiar timer
      if (room.answerTimer) {
        clearTimeout(room.answerTimer);
      }

      // Determinar ganador
      const playersArray = Array.from(room.players.values());
      const winner = gameService.getWinnerByScore(playersArray);

      // Finalizar
      room.currentPhase = 'FINISHED';
      room.gameState.phase = 'FINISHED';
      room.gameState.currentAnswer = undefined;
      room.gameState.currentCard = undefined;

      // Actualizar BD
      if (room.id) {
        await GameModel.updateGamePhase(room.id, 'FINISHED');
        for (const player of playersArray.filter(p => p.role !== 'MODERATOR')) {
          await GameModel.updatePlayerScore(room.id, player.id, player.score);
        }
      }

      // Notificar
      this.io.to(data.roomCode).emit('game-ended', {
        winner: { id: winner.id, name: winner.name, score: winner.score },
        finalScores: playersArray.filter(p => p.role !== 'MODERATOR').map(p => ({
          id: p.id, name: p.name, score: p.score
        })),
        reason: 'moderator_ended'
      });

      console.log(`🏁 Partida finalizada. Ganador: ${winner.name} (${winner.score} pts)`);

      // Eliminar sala y cleanup de Daily.co
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
        console.log(`🗑️ Sala ${room.roomCode} eliminada`);
      }, 1000);
    } catch (error) {
      console.error('Error al finalizar partida:', error);
      socket.emit('error', { message: 'Error al finalizar partida' });
    }
  }
}
