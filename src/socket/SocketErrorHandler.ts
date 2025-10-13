import { Socket } from 'socket.io';
import { AppError } from '../errors/AppError';
import logger from '../utils/logger';

// Manejador centralizado de errores de socket
export const handleSocketError = (socket: Socket, error: Error | AppError) => {
  if (error instanceof AppError) {
    // Error operacional esperado
    logger.warn('Socket operational error', {
      socketId: socket.id,
      message: error.message,
      statusCode: error.statusCode
    });

    socket.emit('game-error', {
      message: error.message,
      code: error.statusCode
    });
  } else {
    // Error inesperado
    logger.error('Socket unexpected error', {
      socketId: socket.id,
      message: error.message,
      stack: error.stack
    });

    socket.emit('game-error', {
      message: 'Ha ocurrido un error inesperado'
    });
  }
};

// Wrapper para handlers de socket con manejo de errores
export const withErrorHandling = (handler: Function) => {
  return async (socket: Socket, data: any) => {
    try {
      await handler(socket, data);
    } catch (error) {
      handleSocketError(socket, error as Error);
    }
  };
};
