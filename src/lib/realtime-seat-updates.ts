// TODO [Phase 2]: Implement WebSocket seat updates for real-time availability
// Purpose: Enable live seat availability updates and collaborative selection prevention

import { 
  SeatUpdateMessage, 
  SeatUpdatePayload, 
  ConnectionStatus, 
  ErrorPayload,
  SeatHoldConfig 
} from '../types/seat-map-shared';

/**
 * Real-time seat update WebSocket client
 */
export class SeatUpdateWebSocket extends EventTarget {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  constructor(
    private showId: string,
    private userId?: string,
    private config: Partial<SeatHoldConfig> = {}
  ) {
    super();
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    try {
      const wsUrl = this.buildWebSocketUrl();
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this.handleError(new Error('Connection timeout'));
        }
      }, 10000);

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'production' 
      ? window.location.host 
      : 'localhost:3001';
    
    const params = new URLSearchParams({
      showId: this.showId,
      ...(this.userId && { userId: this.userId })
    });

    return `${protocol}//${host}/ws/seat-updates?${params}`;
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    console.log('🔗 WebSocket connected for show:', this.showId);
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.reconnectAttempts = 0;
    this.startHeartbeat();
    
    // Send initial subscription message
    this.send({
      type: 'subscribe',
      data: { showId: this.showId, userId: this.userId },
      messageId: this.generateMessageId(),
      timestamp: new Date()
    });

    this.dispatchEvent(new CustomEvent('connected', { 
      detail: { showId: this.showId } 
    }));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: SeatUpdateMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'seat_update':
          this.handleSeatUpdate(message.data as SeatUpdatePayload);
          break;
        case 'bulk_update':
          this.handleBulkUpdate(message.data as SeatUpdatePayload[]);
          break;
        case 'connection_status':
          this.handleConnectionStatus(message.data as ConnectionStatus);
          break;
        case 'error':
          this.handleServerError(message.data as ErrorPayload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle individual seat update
   */
  private handleSeatUpdate(payload: SeatUpdatePayload): void {
    this.dispatchEvent(new CustomEvent('seatUpdate', { 
      detail: { ...payload, timestamp: new Date(payload.timestamp) }
    }));

    // Log for debugging
    console.log(`🎫 Seat ${payload.seatId}: ${payload.eventType} → ${payload.status}`);
  }

  /**
   * Handle bulk seat updates (for initial sync or major changes)
   */
  private handleBulkUpdate(payloads: SeatUpdatePayload[]): void {
    this.dispatchEvent(new CustomEvent('bulkUpdate', { 
      detail: payloads.map(p => ({ ...p, timestamp: new Date(p.timestamp) }))
    }));

    console.log(`🎫 Bulk update: ${payloads.length} seats updated`);
  }

  /**
   * Handle connection status updates
   */
  private handleConnectionStatus(status: ConnectionStatus): void {
    this.dispatchEvent(new CustomEvent('connectionStatus', { 
      detail: { 
        ...status, 
        lastHeartbeat: new Date(status.lastHeartbeat) 
      }
    }));
  }

  /**
   * Handle server error messages
   */
  private handleServerError(error: ErrorPayload): void {
    console.error('WebSocket server error:', error);
    
    this.dispatchEvent(new CustomEvent('serverError', { detail: error }));

    if (!error.recoverable) {
      this.close();
    } else if (error.retryAfter) {
      setTimeout(() => this.reconnect(), error.retryAfter);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
    
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.dispatchEvent(new CustomEvent('disconnected', { 
      detail: { code: event.code, reason: event.reason }
    }));

    // Attempt reconnection if not intentionally closed
    if (!this.isIntentionallyClosed && this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Event | Error): void {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket error';
    console.error('🚨 WebSocket error:', errorMessage);
    
    this.dispatchEvent(new CustomEvent('error', { 
      detail: { message: errorMessage, error }
    }));
  }

  /**
   * Determine if reconnection should be attempted
   */
  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect for certain close codes
    const noReconnectCodes = [1000, 1001, 1008, 1011];
    return !noReconnectCodes.includes(closeCode) && 
           this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Manual reconnection
   */
  public reconnect(): void {
    if (this.ws) {
      this.isIntentionallyClosed = true;
      this.ws.close();
    }
    
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          data: { timestamp: new Date() },
          messageId: this.generateMessageId(),
          timestamp: new Date()
        });
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify server of seat selection
   */
  public selectSeat(seatId: string): void {
    this.send({
      type: 'seat_action',
      data: {
        seatId,
        showId: this.showId,
        action: 'select',
        userId: this.userId,
        timestamp: new Date()
      },
      messageId: this.generateMessageId(),
      timestamp: new Date()
    });
  }

  /**
   * Notify server of seat deselection
   */
  public deselectSeat(seatId: string): void {
    this.send({
      type: 'seat_action',
      data: {
        seatId,
        showId: this.showId,
        action: 'deselect',
        userId: this.userId,
        timestamp: new Date()
      },
      messageId: this.generateMessageId(),
      timestamp: new Date()
    });
  }

  /**
   * Request seat hold extension
   */
  public extendSeatHold(seatId: string): void {
    this.send({
      type: 'extend_hold',
      data: {
        seatId,
        showId: this.showId,
        userId: this.userId,
        timestamp: new Date()
      },
      messageId: this.generateMessageId(),
      timestamp: new Date()
    });
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): {
    connected: boolean;
    reconnectAttempts: number;
    maxAttempts: number;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * Close WebSocket connection
   */
  public close(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client closed');
      this.ws = null;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.close();
    this.removeAllEventListeners();
  }

  /**
   * Remove all event listeners
   */
  private removeAllEventListeners(): void {
    const events = ['connected', 'disconnected', 'seatUpdate', 'bulkUpdate', 'connectionStatus', 'serverError', 'error'];
    events.forEach(event => {
      this.removeEventListener(event, () => {});
    });
  }
}

/**
 * Hook for React components to use WebSocket seat updates
 */
export function useSeatUpdateWebSocket(showId: string, userId?: string) {
  const [wsClient, setWsClient] = React.useState<SeatUpdateWebSocket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const client = new SeatUpdateWebSocket(showId, userId);
    
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
    };
    
    const handleError = (event: any) => {
      setConnectionError(event.detail.message);
    };

    client.addEventListener('connected', handleConnected);
    client.addEventListener('disconnected', handleDisconnected);
    client.addEventListener('error', handleError);
    
    setWsClient(client);

    return () => {
      client.destroy();
      setWsClient(null);
    };
  }, [showId, userId]);

  return {
    wsClient,
    isConnected,
    connectionError,
    reconnect: () => wsClient?.reconnect()
  };
}

// React import (will need to be added to package.json if not present)
import React from 'react'; 