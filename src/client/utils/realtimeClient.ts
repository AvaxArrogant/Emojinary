import type { GameEvent, GameEventHandler } from '../../shared/types/events.js';
import { getConnectionManager } from './connectionManager.js';

// ============================================================================
// REAL-TIME CLIENT MANAGER
// ============================================================================

export class RealtimeClient {
  private gameId: string;
  private username: string;
  private eventHandlers: Map<string, GameEventHandler[]> = new Map();
  private isConnected: boolean = false;
  private lastEventId: string = '';
  private pollTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(gameId: string, username: string) {
    this.gameId = gameId;
    this.username = username;
    
    // Listen to connection manager for network changes
    getConnectionManager().addListener((state) => {
      if (state.isOnline && !this.isConnected) {
        // Network came back online, attempt reconnection
        this.connect();
      } else if (!state.isOnline && this.isConnected) {
        // Network went offline, disconnect gracefully
        this.disconnect();
      }
    });
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connects to the real-time event stream
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log(`Connecting to real-time events for game ${this.gameId}`);
      
      // Get event history for reconnection
      await this.loadEventHistory();
      
      // Start polling for events
      this.startEventPolling();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Update connection manager
      getConnectionManager().updateConnectionState(true);
      
      console.log(`Connected to real-time events for game ${this.gameId}`);
    } catch (error) {
      console.error('Failed to connect to real-time events:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnects from the real-time event stream
   */
  disconnect(): void {
    console.log(`Disconnecting from real-time events for game ${this.gameId}`);
    
    this.isConnected = false;
    
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.reconnectAttempts = 0;
    
    // Update connection manager
    getConnectionManager().updateConnectionState(false);
  }

  /**
   * Schedules a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    const connectionManager = getConnectionManager();
    
    if (!connectionManager.shouldAttemptReconnect()) {
      console.error('Max reconnection attempts reached or network offline');
      return;
    }

    const delay = connectionManager.getReconnectDelay();
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    setTimeout(() => {
      this.reconnectAttempts++;
      connectionManager.incrementReconnectAttempts();
      this.connect();
    }, delay);
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Subscribes to a specific event type
   */
  on<T extends GameEvent>(eventType: T['type'], handler: GameEventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)!.push(handler as GameEventHandler);
  }

  /**
   * Unsubscribes from a specific event type
   */
  off<T extends GameEvent>(eventType: T['type'], handler: GameEventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler as GameEventHandler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handles incoming events
   */
  private handleEvent(event: GameEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // EVENT POLLING
  // ============================================================================

  /**
   * Starts polling for events using long-polling
   */
  private startEventPolling(): void {
    if (!this.isConnected) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/events/${this.gameId}?username=${encodeURIComponent(this.username)}&lastEventId=${this.lastEventId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(30000), // 30 second timeout
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data.events) {
          // Process events
          data.data.events.forEach((event: GameEvent) => {
            this.handleEvent(event);
          });
          
          // Update last event ID
          if (data.data.lastEventId) {
            this.lastEventId = data.data.lastEventId;
          }
        }

        // Schedule next poll if still connected
        if (this.isConnected) {
          this.pollTimeout = window.setTimeout(poll, 100); // Short delay before next poll
        }

      } catch (error) {
        console.error('Error polling for events:', error);
        
        if (this.isConnected) {
          // Schedule reconnection
          this.isConnected = false;
          this.scheduleReconnect();
        }
      }
    };

    // Start polling
    poll();
  }

  /**
   * Loads event history for reconnection
   */
  private async loadEventHistory(): Promise<void> {
    try {
      const response = await fetch(
        `/api/events/${this.gameId}/history?username=${encodeURIComponent(this.username)}&limit=20`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.events) {
        // Process historical events
        data.data.events.forEach((event: GameEvent) => {
          this.handleEvent(event);
        });
        
        // Update last event ID
        if (data.data.lastEventId) {
          this.lastEventId = data.data.lastEventId;
        }
      }

    } catch (error) {
      console.error('Error loading event history:', error);
      // Don't fail connection for history loading errors
    }
  }

  // ============================================================================
  // HEARTBEAT
  // ============================================================================

  /**
   * Starts sending heartbeat messages to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(async () => {
      if (!this.isConnected) {
        return;
      }

      try {
        const response = await fetch(`/api/heartbeat/${this.gameId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.username,
          }),
        });

        if (!response.ok) {
          throw new Error(`Heartbeat failed: ${response.status}`);
        }

      } catch (error) {
        console.error('Heartbeat error:', error);
        // Don't disconnect on heartbeat errors, let polling handle reconnection
      }
    }, 15000); // Send heartbeat every 15 seconds
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Gets the connection status
   */
  isConnectedToEvents(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the current game ID
   */
  getGameId(): string {
    return this.gameId;
  }

  /**
   * Gets the current username
   */
  getUsername(): string {
    return this.username;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let realtimeClientInstance: RealtimeClient | null = null;

/**
 * Creates or gets the singleton realtime client instance
 */
export function getRealtimeClient(gameId?: string, username?: string): RealtimeClient | null {
  if (!realtimeClientInstance && gameId && username) {
    realtimeClientInstance = new RealtimeClient(gameId, username);
  }
  
  return realtimeClientInstance;
}

/**
 * Destroys the singleton realtime client instance
 */
export function destroyRealtimeClient(): void {
  if (realtimeClientInstance) {
    realtimeClientInstance.disconnect();
    realtimeClientInstance = null;
  }
}
