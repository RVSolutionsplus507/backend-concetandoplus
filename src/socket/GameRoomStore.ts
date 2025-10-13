import { GameRoom } from './types';

// Store en memoria para las salas de juego
class GameRoomStore {
  private gameRooms = new Map<string, GameRoom>();
  private playerSockets = new Map<string, string>(); // playerId -> socketId

  // Salas
  getRoom(roomCode: string): GameRoom | undefined {
    return this.gameRooms.get(roomCode);
  }

  setRoom(roomCode: string, room: GameRoom): void {
    this.gameRooms.set(roomCode, room);
  }

  deleteRoom(roomCode: string): void {
    this.gameRooms.delete(roomCode);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  findRoomByGameId(gameId: string): { roomCode: string; room: GameRoom } | undefined {
    for (const [code, room] of this.gameRooms.entries()) {
      if (room.id === gameId) {
        return { roomCode: code, room };
      }
    }
    return undefined;
  }

  findRoomByPlayerId(playerId: string): GameRoom | undefined {
    return Array.from(this.gameRooms.values()).find(r => r.players.has(playerId));
  }

  // Player Sockets
  setPlayerSocket(playerId: string, socketId: string): void {
    this.playerSockets.set(playerId, socketId);
  }

  getPlayerSocket(playerId: string): string | undefined {
    return this.playerSockets.get(playerId);
  }

  deletePlayerSocket(playerId: string): void {
    this.playerSockets.delete(playerId);
  }

  findPlayerBySocketId(socketId: string): string | undefined {
    for (const [playerId, sockId] of this.playerSockets.entries()) {
      if (sockId === socketId) {
        return playerId;
      }
    }
    return undefined;
  }

  // Cleanup
  cleanupEmptyRooms(): void {
    for (const [roomCode, room] of this.gameRooms.entries()) {
      const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
      if (connectedPlayers.length === 0) {
        this.gameRooms.delete(roomCode);
        console.log(`🧹 Sala vacía eliminada: ${roomCode}`);
      }
    }
  }
}

export const gameRoomStore = new GameRoomStore();
