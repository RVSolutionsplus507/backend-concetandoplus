import express from 'express'
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  getGames,
  createGame,
  getGameDetails,
  updateGameStatus,
  getGlobalStats
} from '../controllers/adminController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = express.Router()

// Middleware para verificar que sea admin
router.use(authenticateToken)
router.use(requireAdmin)

// Rutas de usuarios
router.get('/users', getUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

// Rutas de partidas
router.get('/games', getGames)
router.post('/games', createGame)
router.get('/games/:id', getGameDetails)
router.put('/games/:id/status', updateGameStatus)

// Rutas de estadísticas
router.get('/stats', getGlobalStats)

export default router
