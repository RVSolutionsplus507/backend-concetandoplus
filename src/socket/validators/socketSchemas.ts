import { z } from 'zod';
import { ZodError } from 'zod';

/**
 * Validador personalizado para CUID (usado por Prisma)
 * CUID format: c + timestamp + counter + fingerprint + random
 * Ejemplo: cmegkrqik0001ittytj4kxcmo
 */
const cuidRegex = /^c[a-z0-9]{24}$/;
const cuidValidator = z.string().regex(cuidRegex, 'ID debe ser un CUID válido');

/**
 * Enums para validación
 */
const CardTypeEnum = z.enum(['RC', 'AC', 'E', 'CE']);
const PlayerRoleEnum = z.enum(['PLAYER', 'MODERATOR', 'PLAYER_MODERATOR']);

/**
 * Schemas de validación para eventos de Socket.io
 */

// Room Events
export const JoinRoomSchema = z.object({
  playerId: cuidValidator,
  playerName: z.string()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase()
});

export const GetRoomStateSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase()
});

export const ReconnectPlayerSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  playerId: cuidValidator
});

// Game Events
export const StartGameSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  playerId: cuidValidator
});

export const StartExplanationSchema = z.object({
  gameId: cuidValidator
});

export const DrawCardSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  playerId: cuidValidator,
  cardType: CardTypeEnum
});

export const EndGameModeratorSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  moderatorId: cuidValidator
});

// Turn Events
export const CardReadSchema = z.object({
  playerId: cuidValidator,
  cardId: cuidValidator
});

export const PlayerAnsweredSchema = z.object({
  playerId: cuidValidator,
  cardId: cuidValidator
});

export const SkipTurnSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  playerId: cuidValidator
});

// Voting Events
export const ApproveAnswerSchema = z.object({
  playerId: cuidValidator,
  approved: z.boolean(),
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase()
    .optional()
});

// Debate Events
export const ResolveDebateSchema = z.object({
  roomCode: z.string()
    .length(6, 'El código de sala debe tener exactamente 6 caracteres')
    .toUpperCase(),
  moderatorId: cuidValidator,
  grantPoints: z.boolean()
});

/**
 * Types inferidos de los schemas para TypeScript
 */
export type JoinRoomData = z.infer<typeof JoinRoomSchema>;
export type GetRoomStateData = z.infer<typeof GetRoomStateSchema>;
export type ReconnectPlayerData = z.infer<typeof ReconnectPlayerSchema>;
export type StartGameData = z.infer<typeof StartGameSchema>;
export type StartExplanationData = z.infer<typeof StartExplanationSchema>;
export type DrawCardData = z.infer<typeof DrawCardSchema>;
export type EndGameModeratorData = z.infer<typeof EndGameModeratorSchema>;
export type CardReadData = z.infer<typeof CardReadSchema>;
export type PlayerAnsweredData = z.infer<typeof PlayerAnsweredSchema>;
export type SkipTurnData = z.infer<typeof SkipTurnSchema>;
export type ApproveAnswerData = z.infer<typeof ApproveAnswerSchema>;
export type ResolveDebateData = z.infer<typeof ResolveDebateSchema>;

/**
 * Helper para validar datos de Socket.io
 * @param schema - Schema Zod para validar
 * @param data - Datos recibidos del socket
 * @returns Datos validados y parseados
 * @throws ZodError si la validación falla
 */
export function validateSocketData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Formatear errores de validación
      const formattedErrors = error.issues.map((err: z.ZodIssue) => ({
        path: err.path.join('.'),
        message: err.message
      }));

      throw new ValidationError(
        'Error de validación en datos del socket',
        formattedErrors
      );
    }
    throw error;
  }
}

/**
 * Helper para validar datos de Socket.io de forma segura
 * Retorna un objeto con el resultado en lugar de lanzar excepciones
 */
export function safeValidateSocketData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: any[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const formattedErrors = result.error.issues.map((err: z.ZodIssue) => ({
      path: err.path.join('.'),
      message: err.message
    }));

    return {
      success: false,
      error: 'Error de validación en datos del socket',
      details: formattedErrors
    };
  }
}

/**
 * Custom error class para errores de validación
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Type guard para verificar si un error es ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
