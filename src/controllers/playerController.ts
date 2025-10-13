import { Request, Response, NextFunction } from 'express';
import { PlayerModel } from '../models/playerModel';
import { GameModel } from '../models/gameModel';
import { SubmitAnswerRequest } from '../types';
import { AppError } from '../errors/AppError';

export class PlayerController {
  static async updateScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { playerId } = req.params;
      const { points } = req.body;
      
      const player = await PlayerModel.updatePlayerScore(playerId, points);

      res.status(200).json({
        success: true,
        data: player,
        message: 'Puntuación actualizada'
      });
    } catch (error) {
      next(error);
    }
  }

  static async markExplanationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { playerId } = req.params;
      
      await PlayerModel.markExplanationsRead(playerId);

      res.status(200).json({
        success: true,
        message: 'Explicaciones marcadas como leídas'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGamePlayers(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId } = req.params;
      
      const players = await PlayerModel.getGamePlayers(gameId);

      res.status(200).json({
        success: true,
        data: players
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const answerData: SubmitAnswerRequest = req.body;
      
      // Aquí iría la lógica para validar la respuesta
      // Por ahora, simulamos una respuesta correcta
      const isCorrect = true; // TODO: Implementar validación real
      const pointsEarned = isCorrect ? 3 : 0; // TODO: Obtener puntos de la carta

      if (isCorrect) {
        await PlayerModel.updatePlayerScore(answerData.playerId, pointsEarned);
      }

      res.status(200).json({
        success: true,
        data: { isCorrect, pointsEarned },
        message: isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { playerId } = req.params;
      
      // El parámetro playerId en realidad es el userId del usuario autenticado
      const stats = await GameModel.getPlayerStats(playerId);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas del jugador obtenidas'
      });
    } catch (error) {
      next(error);
    }
  }
}
