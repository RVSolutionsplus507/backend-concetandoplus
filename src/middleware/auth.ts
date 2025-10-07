import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '../../generated/prisma'

const prisma = new PrismaClient()

interface JwtPayload {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER'
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: 'ADMIN' | 'USER'
        name: string
      }
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization']
    console.log('🔍 Authorization header:', authHeader)
    const token = authHeader && authHeader.split(' ')[1]
    console.log('🎫 Token extraído:', token ? 'Existe' : 'No existe')

    if (!token) {
      console.log('❌ No hay token - enviando 401')
      res.status(401).json({ error: 'Token de acceso requerido' })
      return
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'conectandoplus-secret-key'
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload

    // Verificar que el usuario existe y obtener datos actualizados
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' })
      return
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }

    next()
  } catch (error) {
    console.error('Error en autenticación:', error)
    res.status(403).json({ error: 'Token inválido' })
    return
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔐 Verificando permisos de admin para usuario:', req.user)
  
  if (!req.user) {
    console.log('❌ Usuario no autenticado')
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  console.log(`👤 Usuario: ${req.user.name}, Rol: ${req.user.role}`)
  
  if (req.user.role !== 'ADMIN') {
    console.log('❌ Acceso denegado - no es admin')
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' })
    return
  }

  console.log('✅ Permisos de admin verificados')
  next()
}

export const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  next()
}
