import { Router } from 'express';
import { CardController } from '../controllers/cardController';

const router = Router();

// GET /api/cards - Obtener todas las cartas
router.get('/', CardController.getAllCards);

// GET /api/cards/type/:cardType - Obtener cartas por tipo
router.get('/type/:cardType', CardController.getCardsByType);

// GET /api/cards/explanation/:cardType - Obtener carta de explicación
router.get('/explanation/:cardType', CardController.getExplanationCard);

// POST /api/cards/draw/:gameId/:cardType - Sacar carta de pila
router.post('/draw/:gameId/:cardType', CardController.drawCard);

export default router;
