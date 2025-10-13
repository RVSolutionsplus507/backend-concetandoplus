import { Request, Response, NextFunction } from 'express';
import { GameModel } from '../models/gameModel';
import { PlayerModel } from '../models/playerModel';
import { CreateGameRequest, JoinGameRequest } from '../types';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../errors/AppError';
import { dailyService } from '../services/dailyService';

export class GameController {
  static async getAvailableGames(req: Request, res: Response, next: NextFunction) {
    try {
      const games = await GameModel.getAvailableGames();
      
      res.status(200).json({
        success: true,
        data: games
      });
    } catch (error) {
      next(error);
    }
  }

  static async createGame(req: Request, res: Response, next: NextFunction) {
    try {
      const gameData: CreateGameRequest = req.body;

      const game = await GameModel.createGame(gameData);
      await GameModel.initializeCardPiles(game.id);

      // Create Daily.co video room for the game
      console.log('🎥 Verificando configuración de Daily.co...');
      console.log('🎥 Daily.co configurado:', dailyService.isConfigured());

      if (dailyService.isConfigured()) {
        console.log('🎥 Intentando crear sala de Daily.co para roomCode:', game.roomCode);
        try {
          const dailyRoom = await dailyService.createRoom(game.roomCode, 8);
          console.log('🎥 Respuesta de Daily.co:', dailyRoom);

          if (dailyRoom) {
            // Update game with Daily.co room info
            await GameModel.updateDailyRoomInfo(game.id, dailyRoom.name, dailyRoom.url);
            game.dailyRoomName = dailyRoom.name;
            game.dailyRoomUrl = dailyRoom.url;
            console.log('✅ Sala de Daily.co creada:', dailyRoom.url);
          } else {
            console.log('⚠️ dailyService.createRoom retornó null o undefined');
          }
        } catch (error) {
          console.error('❌ Error al crear sala de Daily.co:', error);
        }
      } else {
        console.log('⚠️ Daily.co no está configurado. Verifica DAILY_API_KEY y DAILY_DOMAIN en .env');
      }

      res.status(201).json({
        success: true,
        data: game,
        message: 'Juego creado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.params;
      const joinData: JoinGameRequest = req.body;
      
      // Si hay gameId en params, buscar por ID; si no, usar roomCode del body
      let game;
      if (gameId) {
        game = await GameModel.findById(gameId);
      } else {
        game = await GameModel.findByRoomCode(joinData.roomCode);
      }
      
      if (!game) {
        throw new NotFoundError('Juego');
      }

      if (game.players.length >= 8) {
        throw new ValidationError('La sala está llena (máximo 8 jugadores)');
      }

      // Si se une por gameId, usar información del usuario autenticado
      if (gameId) {
        // El usuario ya está autenticado, verificar si está asignado al juego
        const userInGame = game.players.some((player: any) => player.name === (req as any).user?.name);
        if (!userInGame) {
          throw new ForbiddenError('No estás asignado a esta partida');
        }

        // El usuario está asignado, permitir acceso al juego
        res.status(200).json({
          success: true,
          data: { game },
          message: 'Acceso a la partida exitoso'
        });
        return;
      }

      // Lógica original para unirse por roomCode
      const colorInUse = game.players.some((player: any) => player.color === joinData.playerColor);
      if (colorInUse) {
        throw new ConflictError('Color ya seleccionado por otro jugador');
      }

      const playerData = {
        ...joinData,
        roomCode: game.id // Usar gameId en lugar de roomCode
      };

      const player = await PlayerModel.addPlayerToGame(playerData);
      const updatedGame = await GameModel.findByRoomCode(joinData.roomCode);

      res.status(200).json({
        success: true,
        data: { player, game: updatedGame },
        message: 'Jugador unido exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomCode } = req.params;
      
      const game = await GameModel.findByRoomCode(roomCode);
      if (!game) {
        throw new NotFoundError('Juego');
      }

      res.status(200).json({
        success: true,
        data: game
      });
    } catch (error) {
      next(error);
    }
  }

  static async startGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.params;
      
      await GameModel.updateGameStatus(gameId, 'IN_PROGRESS' as any);

      res.status(200).json({
        success: true,
        message: 'Juego iniciado'
      });
    } catch (error) {
      next(error);
    }
  }

  static async endGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.params;
      
      await GameModel.updateGameStatus(gameId, 'FINISHED' as any);
      const players = await PlayerModel.getGamePlayers(gameId);
      const winner = players.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );

      res.status(200).json({
        success: true,
        data: { winner, finalScores: players },
        message: 'Juego finalizado'
      });
    } catch (error) {
      next(error);
    }
  }
}
