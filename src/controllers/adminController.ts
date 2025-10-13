import { Request, Response } from 'express'
import { PrismaClient } from '../../generated/prisma'
import { dailyService } from '../services/dailyService'
import { GameModel } from '../models/gameModel'

const prisma = new PrismaClient()

// GET /api/admin/users - Obtener todos los usuarios
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('🔍 DEBUG Backend - Usuarios encontrados:', users.length)
    console.log('🔍 DEBUG Backend - Usuarios raw:', users)

    const usersWithStats = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        avgScore: 0
      }
    }))

    console.log('🔍 DEBUG Backend - Usuarios procesados:', usersWithStats)
    console.log('🔍 DEBUG Backend - Usuarios USER:', usersWithStats.filter(u => u.role === 'USER'))

    res.json(usersWithStats)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// POST /api/admin/users - Crear nuevo usuario
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role = 'USER' } = req.body

    if (!name || !email) {
      res.status(400).json({ error: 'Nombre y email son requeridos' })
      return
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' })
      return
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role as 'ADMIN' | 'USER',
        password: 'temp123'
      }
    })

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// PUT /api/admin/users/:id - Actualizar usuario
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, email, role } = req.body

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role: role as 'ADMIN' | 'USER' })
      }
    })

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// DELETE /api/admin/users/:id - Eliminar usuario
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (user?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        res.status(400).json({ error: 'No se puede eliminar el último administrador' })
        return
      }
    }

    await prisma.user.delete({
      where: { id }
    })

    res.json({ message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// GET /api/admin/games - Obtener todas las partidas
export const getGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await prisma.game.findMany({
      include: {
        players: {
          select: {
            id: true,
            name: true,
            score: true,
            isHost: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const gamesWithPlayers = games.map((game) => {
      const targetScore = game.targetScore || 20
      const winner = game.players.find(p => p.score >= targetScore)
      return {
        id: game.id,
        roomCode: game.roomCode,
        status: game.phase === 'FINISHED' ? 'FINISHED' : game.status,
        currentTurn: game.currentTurn,
        phase: game.phase,
        targetScore: game.targetScore,
        allowedCategories: game.allowedCategories,
        createdAt: game.createdAt,
        winner: winner ? { name: winner.name, score: winner.score } : null,
        players: game.players.map((player) => ({
          id: player.id,
          name: player.name,
          score: player.score,
          isHost: player.isHost
        }))
      }
    })

    res.json(gamesWithPlayers)
  } catch (error) {
    console.error('Error fetching games:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// POST /api/admin/games - Crear nueva partida
export const createGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      roomCode, 
      selectedUsers = [], 
      targetScore = 20,
      allowedCategories = ['RC', 'AC', 'E', 'CE'],
      playerRole = 'PLAYER'
    } = req.body

    if (!roomCode) {
      res.status(400).json({ error: 'El código de sala es requerido' })
      return
    }

    // Validar targetScore
    if (targetScore < 5 || targetScore > 20) {
      res.status(400).json({ error: 'El targetScore debe estar entre 5 y 20' })
      return
    }

    // Validar allowedCategories
    if (!Array.isArray(allowedCategories) || allowedCategories.length === 0) {
      res.status(400).json({ error: 'Debe seleccionar al menos una categoría' })
      return
    }

    // Crear la partida
    const game = await prisma.game.create({
      data: {
        roomCode,
        targetScore,
        allowedCategories,
        status: 'WAITING',
        currentTurn: 0,
        phase: 'EXPLANATION'
      }
    })

    // Create Daily.co video room for the game
    console.log('🎥 [ADMIN] Verificando configuración de Daily.co...')
    console.log('🎥 [ADMIN] Daily.co configurado:', dailyService.isConfigured())

    if (dailyService.isConfigured()) {
      console.log('🎥 [ADMIN] Intentando crear sala de Daily.co para roomCode:', game.roomCode)
      try {
        const dailyRoom = await dailyService.createRoom(game.roomCode, 8)
        console.log('🎥 [ADMIN] Respuesta de Daily.co:', dailyRoom)

        if (dailyRoom) {
          // Update game with Daily.co room info
          await GameModel.updateDailyRoomInfo(game.id, dailyRoom.name, dailyRoom.url)
          console.log('✅ [ADMIN] Sala de Daily.co creada:', dailyRoom.url)
        } else {
          console.log('⚠️ [ADMIN] dailyService.createRoom retornó null o undefined')
        }
      } catch (error) {
        console.error('❌ [ADMIN] Error al crear sala de Daily.co:', error)
      }
    } else {
      console.log('⚠️ [ADMIN] Daily.co no está configurado. Verifica DAILY_API_KEY y DAILY_DOMAIN en .env')
    }

    // Obtener el admin actual del token
    const adminId = (req.user as { id: string })?.id
    const admin = adminId ? await prisma.user.findUnique({ where: { id: adminId } }) : null

    // Asignar jugadores
    const playerColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    const playersData: Array<{
      gameId: string
      name: string
      color: string
      isHost: boolean
      score: number
      hasReadExplanations: boolean
      role: 'PLAYER' | 'MODERATOR' | 'PLAYER_MODERATOR'
    }> = []

    // Si el admin es PLAYER_MODERATOR, agregarlo primero
    if (playerRole === 'PLAYER_MODERATOR' && admin) {
      playersData.push({
        gameId: game.id,
        name: admin.name,
        color: playerColors[0],
        isHost: true,
        score: 0,
        hasReadExplanations: false,
        role: 'PLAYER_MODERATOR'
      })
    }

    // Agregar usuarios seleccionados
    if (selectedUsers.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: selectedUsers }
        }
      })

      const startIndex = playerRole === 'PLAYER_MODERATOR' ? 1 : 0
      
      users.forEach((user, index) => {
        playersData.push({
          gameId: game.id,
          name: user.name,
          color: playerColors[(startIndex + index) % playerColors.length],
          isHost: playerRole !== 'PLAYER_MODERATOR' && index === 0,
          score: 0,
          hasReadExplanations: false,
          role: 'PLAYER'
        })
      })
    }

    // Si el admin es MODERATOR (solo observa), agregarlo sin contar en el juego
    if (playerRole === 'MODERATOR' && admin) {
      playersData.push({
        gameId: game.id,
        name: admin.name,
        color: 'gray',
        isHost: false,
        score: 0,
        hasReadExplanations: false,
        role: 'MODERATOR'
      })
    }

    if (playersData.length > 0) {
      await prisma.player.createMany({
        data: playersData
      })
    }

    // Obtener la partida con los jugadores
    const gameWithPlayers = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            score: true,
            isHost: true
          }
        }
      }
    })

    res.status(201).json({
      id: gameWithPlayers!.id,
      roomCode: gameWithPlayers!.roomCode,
      status: gameWithPlayers!.status,
      targetScore: gameWithPlayers!.targetScore,
      dailyRoomName: gameWithPlayers!.dailyRoomName,
      dailyRoomUrl: gameWithPlayers!.dailyRoomUrl,
      createdAt: gameWithPlayers!.createdAt,
      players: gameWithPlayers!.players
    })
  } catch (error) {
    console.error('Error creating game:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// GET /api/admin/games/:id - Obtener detalles de una partida
export const getGameDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            score: true,
            color: true,
            isHost: true,
            hasReadExplanations: true,
            createdAt: true
          }
        }
      }
    })

    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada' })
      return
    }

    res.json({
      id: game.id,
      roomCode: game.roomCode,
      status: game.status,
      currentTurn: game.currentTurn,
      phase: game.phase,
      targetScore: game.targetScore,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      players: game.players
    })
  } catch (error) {
    console.error('Error fetching game details:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// PUT /api/admin/games/:id/status - Actualizar estado de partida
export const updateGameStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['WAITING', 'IN_PROGRESS', 'FINISHED'].includes(status)) {
      res.status(400).json({ error: 'Estado de partida inválido' })
      return
    }

    const game = await prisma.game.update({
      where: { id },
      data: { status }
    })

    res.json({
      id: game.id,
      status: game.status,
      updatedAt: game.updatedAt
    })
  } catch (error) {
    console.error('Error updating game status:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// GET /api/admin/stats - Obtener estadísticas globales
export const getGlobalStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalGames,
      activeGames,
      finishedGames
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.game.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.game.count({ where: { phase: 'FINISHED' } })
    ])

    // Obtener top jugadores solo de partidas terminadas
    // Verificar qué partidas están terminadas
    const finishedGamesDebug = await prisma.game.findMany({
      where: {
        OR: [
          { status: 'FINISHED' },
          { phase: 'FINISHED' },
          { phase: 'COMPLETED' }
        ]
      },
      include: {
        players: true
      }
    })
    console.log('🔍 DEBUG - Partidas terminadas:', finishedGamesDebug.length)
    console.log('🔍 DEBUG - Última partida (Z4P3VC):', finishedGamesDebug.find(g => g.roomCode === 'Z4P3VC'))
    
    // Ver TODOS los players de TODAS las partidas terminadas
    const allPlayers = finishedGamesDebug.flatMap(g => g.players)
    console.log('🔍 DEBUG - Total players en partidas terminadas:', allPlayers.length)
    console.log('🔍 DEBUG - Players con score > 0:', allPlayers.filter(p => p.score > 0))
    console.log('🔍 DEBUG - Ambar Prado en todas las partidas:', allPlayers.filter(p => p.name === 'Ambar Prado'))

    const topPlayers = await prisma.player.groupBy({
      by: ['name'],
      where: {
        game: {
          OR: [
            { status: 'FINISHED' },
            { phase: 'FINISHED' },
            { phase: 'COMPLETED' }
          ]
        }
      },
      _sum: {
        score: true
      },
      _count: {
        gameId: true
      },
      orderBy: {
        _sum: {
          score: 'desc'
        }
      },
      take: 5
    })
    
    console.log('🔍 DEBUG - Top players result:', topPlayers)

    res.json({
      overview: {
        totalUsers,
        totalGames,
        activeGames,
        finishedGames
      },
      topPlayers: topPlayers.map((player) => ({
        name: player.name,
        totalScore: player._sum.score || 0,
        gamesPlayed: player._count.gameId
      }))
    })
  } catch (error) {
    console.error('Error fetching global stats:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
