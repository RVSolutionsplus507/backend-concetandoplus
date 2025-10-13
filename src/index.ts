import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import gameRoutes from './routes/gameRoutes';
import playerRoutes from './routes/playerRoutes';
import cardRoutes from './routes/cardRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/admin';
import { initializeSocket } from './socket/SocketServer';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import logger from './utils/logger';

dotenv.config();

const app = express();
const server = createServer(app);

// Normalizar URLs (eliminar barra final si existe)
const normalizeUrl = (url: string) => url.replace(/\/$/, '');
const frontendUrl = normalizeUrl(process.env.FRONTEND_URL || "http://localhost:3000");
const socketCorsOrigin = normalizeUrl(process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000");

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes con rate limiting
app.use('/auth', authLimiter, authRoutes);
app.use('/api/games', apiLimiter, gameRoutes);
app.use('/api/players', apiLimiter, playerRoutes);
app.use('/api/cards', apiLimiter, cardRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io initialization
initializeSocket(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  const message = `🚀 Servidor corriendo en puerto ${PORT}`;
  console.log(message);
  logger.info(message, { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`🎮 Conectando+ Backend iniciado`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
