/**
 * Socket Event Validators
 *
 * Este módulo exporta todos los schemas de validación Zod y helpers
 * para validar datos de eventos Socket.io
 */

export {
  // Schemas de validación
  JoinRoomSchema,
  GetRoomStateSchema,
  ReconnectPlayerSchema,
  StartGameSchema,
  StartExplanationSchema,
  DrawCardSchema,
  EndGameModeratorSchema,
  CardReadSchema,
  PlayerAnsweredSchema,
  SkipTurnSchema,
  ApproveAnswerSchema,
  ResolveDebateSchema,

  // Tipos TypeScript inferidos
  JoinRoomData,
  GetRoomStateData,
  ReconnectPlayerData,
  StartGameData,
  StartExplanationData,
  DrawCardData,
  EndGameModeratorData,
  CardReadData,
  PlayerAnsweredData,
  SkipTurnData,
  ApproveAnswerData,
  ResolveDebateData,

  // Helpers de validación
  validateSocketData,
  safeValidateSocketData,

  // Errores personalizados
  ValidationError,
  isValidationError
} from './socketSchemas';
