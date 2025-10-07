import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel';

const router = express.Router();

// Endpoint para registrar usuario normal (jugador)
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ 
        error: 'Email, nombre y contraseña son requeridos' 
      });
    }

    // Verificar si ya existe un usuario con ese email
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con ese email' 
      });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario como USER (jugador)
    const user = await UserModel.createUser({
      email,
      name,
      password: hashedPassword,
      role: 'USER'
    });

    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'conectandoplus-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint para registrar usuario admin (solo para setup inicial)
router.post('/register-admin', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ 
        error: 'Email, nombre y contraseña son requeridos' 
      });
    }

    // Verificar si ya existe un usuario con ese email
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con ese email' 
      });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario admin
    const user = await UserModel.createUser({
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN'
    });

    return res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      user
    });

  } catch (error) {
    console.error('Error al registrar admin:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// Login general
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario en la base de datos
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'conectandoplus-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// Login específico para admin (ruta alternativa)
router.post('/admin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario admin en la base de datos
    const user = await UserModel.findByEmail(email);
    if (!user || user.role !== 'ADMIN') {
      return res.status(401).json({ 
        error: 'Credenciales de administrador inválidas' 
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales de administrador inválidas' 
      });
    }

    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'conectandoplus-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Error en login admin:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// Verificar token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'conectandoplus-secret-key') as any;
    
    return res.json({
      success: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});

export default router;
