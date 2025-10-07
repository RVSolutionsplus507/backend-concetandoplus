import { Router } from 'express';
import { GameController } from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/games - Obtener juegos disponibles
router.get('/', GameController.getAvailableGames);

// POST /api/games - Crear nuevo juego
router.post('/', GameController.createGame);

// POST /api/games/join - Unirse a un juego
router.post('/join', GameController.joinGame);

// POST /api/games/:gameId/join - Unirse a un juego por ID (requiere autenticación)
router.post('/:gameId/join', authenticateToken, GameController.joinGame);

// GET /api/games/:roomCode - Obtener información del juego
router.get('/:roomCode', GameController.getGame);

// PUT /api/games/:gameId/start - Iniciar juego
router.put('/:gameId/start', GameController.startGame);

// PUT /api/games/:gameId/end - Finalizar juego
router.put('/:gameId/end', GameController.endGame);

export default router;
