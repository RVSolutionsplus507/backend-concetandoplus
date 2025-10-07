import { Router } from 'express';
import { PlayerController } from '../controllers/playerController';

const router = Router();

// PUT /api/players/:playerId/score - Actualizar puntuación
router.put('/:playerId/score', PlayerController.updateScore);

// PUT /api/players/:playerId/explanations - Marcar explicaciones como leídas
router.put('/:playerId/explanations', PlayerController.markExplanationsRead);

// GET /api/players/game/:gameId - Obtener jugadores del juego
router.get('/game/:gameId', PlayerController.getGamePlayers);

// POST /api/players/answer - Enviar respuesta
router.post('/answer', PlayerController.submitAnswer);

// GET /api/players/:playerId/stats - Obtener estadísticas del jugador
router.get('/:playerId/stats', PlayerController.getPlayerStats);

export default router;
