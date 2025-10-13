import { Request, Response, NextFunction } from 'express';
import { CardModel } from '../models/cardModel';
import { CardType } from '../types';
import { NotFoundError } from '../errors/AppError';

export class CardController {
  static async drawCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { gameId, cardType } = req.params;
      
      const card = await CardModel.getNextCardFromPile(gameId, cardType as CardType);
      if (!card) {
        throw new NotFoundError('No hay más cartas disponibles en esta pila');
      }

      res.status(200).json({
        success: true,
        data: card,
        message: 'Carta sacada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExplanationCard(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardType } = req.params;
      
      const card = await CardModel.getExplanationCard(cardType as CardType);
      if (!card) {
        throw new NotFoundError('Carta de explicación');
      }

      res.status(200).json({
        success: true,
        data: card
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllCards(req: Request, res: Response, next: NextFunction) {
    try {
      const cards = await CardModel.getAllCards();

      res.status(200).json({
        success: true,
        data: cards
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCardsByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { cardType } = req.params;
      const { includeExplanations } = req.query;
      
      const cards = await CardModel.getCardsByType(
        cardType as CardType, 
        includeExplanations === 'true'
      );

      res.status(200).json({
        success: true,
        data: cards
      });
    } catch (error) {
      next(error);
    }
  }
}
