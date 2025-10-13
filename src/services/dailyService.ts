import axios from 'axios';

interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    max_participants?: number;
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    enable_knocking?: boolean;
    enable_prejoin_ui?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    exp?: number; // Expiration time in seconds since epoch
  };
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: {
    max_participants?: number;
    exp?: number;
  };
}

interface DailyMeetingToken {
  token: string;
}

class DailyService {
  private apiKey: string;
  private apiUrl = 'https://api.daily.co/v1';
  private domain: string;

  constructor() {
    this.apiKey = process.env.DAILY_API_KEY || '';
    this.domain = process.env.DAILY_DOMAIN || '';

    if (!this.apiKey) {
      console.warn('⚠️  DAILY_API_KEY not configured. Video calls will not work.');
    }
    if (!this.domain) {
      console.warn('⚠️  DAILY_DOMAIN not configured. Video calls will not work.');
    }
  }

  /**
   * Create a new Daily.co room for a game
   * @param roomCode - The game room code
   * @param maxParticipants - Maximum number of participants (2-8)
   * @returns Daily room object with URL
   */
  async createRoom(roomCode: string, maxParticipants: number = 8): Promise<DailyRoom | null> {
    if (!this.apiKey) {
      console.error('Daily.co API key not configured');
      return null;
    }

    try {
      // Room expires in 24 hours
      const expirationTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

      const config: DailyRoomConfig = {
        name: `conectandoplus-${roomCode.toLowerCase()}`,
        privacy: 'public', // Public rooms allow anyone with the URL to join
        properties: {
          max_participants: Math.min(Math.max(maxParticipants, 2), 8),
          enable_screenshare: false,
          enable_chat: false,
          enable_knocking: false,
          enable_prejoin_ui: false,
          start_video_off: false,
          start_audio_off: false,
          exp: expirationTime,
        },
      };

      const response = await axios.post<DailyRoom>(
        `${this.apiUrl}/rooms`,
        config,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      console.log(`✅ Daily.co room created: ${response.data.url}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating Daily.co room:', error.response?.data || error.message);
      } else {
        console.error('Error creating Daily.co room:', error);
      }
      return null;
    }
  }

  /**
   * Delete a Daily.co room
   * @param roomName - The room name (e.g., "conectandoplus-abc123")
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.apiKey) {
      console.error('Daily.co API key not configured');
      return false;
    }

    try {
      await axios.delete(`${this.apiUrl}/rooms/${roomName}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      console.log(`✅ Daily.co room deleted: ${roomName}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error deleting Daily.co room:', error.response?.data || error.message);
      } else {
        console.error('Error deleting Daily.co room:', error);
      }
      return false;
    }
  }

  /**
   * Create a meeting token for a specific user
   * This allows fine-grained permissions per user
   * @param roomName - The room name
   * @param userName - The user's display name
   * @param userId - The user's ID
   * @param isModerator - Whether the user is a moderator
   */
  async createMeetingToken(
    roomName: string,
    userName: string,
    userId: string,
    isModerator: boolean = false
  ): Promise<string | null> {
    if (!this.apiKey) {
      console.error('Daily.co API key not configured');
      return null;
    }

    try {
      const response = await axios.post<DailyMeetingToken>(
        `${this.apiUrl}/meeting-tokens`,
        {
          properties: {
            room_name: roomName,
            user_name: userName,
            user_id: userId,
            is_owner: isModerator,
            enable_screenshare: false,
            start_video_off: false,
            start_audio_off: false,
            // Token expires in 24 hours
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating meeting token:', error.response?.data || error.message);
      } else {
        console.error('Error creating meeting token:', error);
      }
      return null;
    }
  }

  /**
   * Get room information
   * @param roomName - The room name
   */
  async getRoom(roomName: string): Promise<DailyRoom | null> {
    if (!this.apiKey) {
      console.error('Daily.co API key not configured');
      return null;
    }

    try {
      const response = await axios.get<DailyRoom>(`${this.apiUrl}/rooms/${roomName}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log(`Room ${roomName} not found`);
          return null;
        }
        console.error('Error getting Daily.co room:', error.response?.data || error.message);
      } else {
        console.error('Error getting Daily.co room:', error);
      }
      return null;
    }
  }

  /**
   * Check if Daily.co is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.domain;
  }

  /**
   * Get the full room URL
   * @param roomName - The room name
   */
  getRoomUrl(roomName: string): string {
    return `https://${this.domain}/${roomName}`;
  }
}

// Export singleton instance
export const dailyService = new DailyService();