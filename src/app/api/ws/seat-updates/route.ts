// Real-time seat updates WebSocket endpoint
// Handles seat selection, deselection, hold timers, and collaborative selection prevention

import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { getShowSeats, updateSeatStatus } from '../../../../lib/db/queries';

interface SeatUpdateMessage {
  type: 'seat_action' | 'subscribe' | 'ping';
  data: any;
  messageId: string;
  timestamp: Date;
}

interface ConnectedClient {
  ws: WebSocket;
  showId: string;
  userId?: string;
  lastPing: number;
}

interface SeatHold {
  seatId: string;
  userId: string;
  showId: string;
  expiresAt: number;
}

// In-memory storage for active connections and seat holds
const connectedClients = new Map<string, ConnectedClient>();
const activeSeatHolds = new Map<string, SeatHold>();
const SEAT_HOLD_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * WebSocket upgrade handler for Next.js API routes
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const showId = url.searchParams.get('showId');
  const userId = url.searchParams.get('userId');

  if (!showId) {
    return new Response('Missing showId parameter', { status: 400 });
  }

  try {
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create WebSocket server instance
    const wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade
    const response = new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': generateAcceptKey(
          request.headers.get('sec-websocket-key') || ''
        ),
      },
    });

    return response;

  } catch (error) {
    console.error('WebSocket setup error:', error);
    return new Response('WebSocket setup failed', { status: 500 });
  }
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  clientId: string, 
  message: SeatUpdateMessage, 
  client: ConnectedClient
) {
  try {
    switch (message.type) {
      case 'subscribe':
        await handleSubscription(clientId, client, message.data);
        break;
        
      case 'seat_action':
        await handleSeatAction(clientId, client, message.data);
        break;
        
      case 'ping':
        await handlePing(clientId, client);
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error(`Error handling message: ${error}`);
    sendErrorMessage(client.ws, {
      message: 'Failed to process message',
      recoverable: true,
      retryAfter: 1000
    });
  }
}

/**
 * Handle client subscription to show updates
 */
async function handleSubscription(
  clientId: string, 
  client: ConnectedClient, 
  data: { showId: string; userId?: string }
) {
  console.log(`🔗 Client ${clientId} subscribed to show ${data.showId}`);
  
  // Update client info
  client.showId = data.showId;
  client.userId = data.userId;
  
  // Send current seat status
  try {
    const seats = await getShowSeats(data.showId);
    sendMessage(client.ws, {
      type: 'bulk_update',
      data: seats.map(seat => ({
        seatId: seat.id,
        status: seat.status,
        showId: data.showId,
        eventType: 'status_sync',
        timestamp: new Date(),
        userId: null
      })),
      messageId: generateMessageId(),
      timestamp: new Date()
    });
    
    // Send connection confirmation
    sendMessage(client.ws, {
      type: 'connection_status',
      data: {
        connected: true,
        showId: data.showId,
        clientCount: getClientCountForShow(data.showId),
        lastHeartbeat: new Date()
      },
      messageId: generateMessageId(),
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Failed to fetch seats for subscription:', error);
    sendErrorMessage(client.ws, {
      message: 'Failed to load seat data',
      recoverable: true,
      retryAfter: 2000
    });
  }
}

/**
 * Handle seat selection/deselection actions
 */
async function handleSeatAction(
  clientId: string,
  client: ConnectedClient,
  data: { seatId: string; action: 'select' | 'deselect'; showId: string; userId?: string }
) {
  const { seatId, action, showId, userId } = data;
  
  console.log(`🎫 Seat action: ${action} seat ${seatId} by user ${userId || 'anonymous'}`);
  
  try {
    if (action === 'select') {
      // Check if seat is already held by another user
      const existingHold = activeSeatHolds.get(seatId);
      if (existingHold && existingHold.userId !== userId && existingHold.expiresAt > Date.now()) {
        sendErrorMessage(client.ws, {
          message: `Seat ${seatId} is currently held by another user`,
          recoverable: false,
          seatId
        });
        return;
      }
      
      // Create seat hold
      if (userId) {
        activeSeatHolds.set(seatId, {
          seatId,
          userId,
          showId,
          expiresAt: Date.now() + SEAT_HOLD_DURATION
        });
      }
      
      // Update seat status to 'selected' (temporary hold)
      await updateSeatStatus(seatId, 'selected');
      
    } else if (action === 'deselect') {
      // Remove seat hold
      activeSeatHolds.delete(seatId);
      
      // Update seat status back to 'available'
      await updateSeatStatus(seatId, 'available');
    }
    
    // Broadcast update to all clients watching this show
    const updatePayload = {
      seatId,
      status: action === 'select' ? 'selected' : 'available',
      showId,
      eventType: action,
      timestamp: new Date(),
      userId
    };
    
    broadcastToShow(showId, {
      type: 'seat_update',
      data: updatePayload,
      messageId: generateMessageId(),
      timestamp: new Date()
    }, clientId); // Exclude sender
    
  } catch (error) {
    console.error(`Failed to handle seat action: ${error}`);
    sendErrorMessage(client.ws, {
      message: 'Failed to update seat status',
      recoverable: true,
      retryAfter: 1000
    });
  }
}

/**
 * Handle ping messages for connection health
 */
async function handlePing(clientId: string, client: ConnectedClient) {
  client.lastPing = Date.now();
  
  sendMessage(client.ws, {
    type: 'pong',
    data: { timestamp: new Date() },
    messageId: generateMessageId(),
    timestamp: new Date()
  });
}

/**
 * Broadcast message to all clients watching a specific show
 */
function broadcastToShow(showId: string, message: any, excludeClientId?: string) {
  let sentCount = 0;
  
  connectedClients.forEach((client, clientId) => {
    if (client.showId === showId && clientId !== excludeClientId) {
      try {
        sendMessage(client.ws, message);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to client ${clientId}:`, error);
        // Remove dead connection
        connectedClients.delete(clientId);
      }
    }
  });
  
  console.log(`📢 Broadcasted to ${sentCount} clients watching show ${showId}`);
}

/**
 * Send message to specific WebSocket client
 */
function sendMessage(ws: WebSocket, message: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send error message to client
 */
function sendErrorMessage(ws: WebSocket, error: {
  message: string;
  recoverable: boolean;
  retryAfter?: number;
  seatId?: string;
}) {
  sendMessage(ws, {
    type: 'error',
    data: error,
    messageId: generateMessageId(),
    timestamp: new Date()
  });
}

/**
 * Get count of connected clients for a show
 */
function getClientCountForShow(showId: string): number {
  let count = 0;
  connectedClients.forEach(client => {
    if (client.showId === showId) count++;
  });
  return count;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate WebSocket accept key
 */
function generateAcceptKey(clientKey: string): string {
  const crypto = require('crypto');
  const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto
    .createHash('sha1')
    .update(clientKey + WEBSOCKET_MAGIC_STRING)
    .digest('base64');
}

/**
 * Cleanup expired seat holds
 */
function cleanupExpiredHolds() {
  const now = Date.now();
  const expiredHolds: string[] = [];
  
  activeSeatHolds.forEach((hold, seatId) => {
    if (hold.expiresAt <= now) {
      expiredHolds.push(seatId);
    }
  });
  
  expiredHolds.forEach(async (seatId) => {
    const hold = activeSeatHolds.get(seatId);
    if (hold) {
      activeSeatHolds.delete(seatId);
      
      try {
        // Release the seat back to available
        await updateSeatStatus(seatId, 'available');
        
        // Broadcast the release
        broadcastToShow(hold.showId, {
          type: 'seat_update',
          data: {
            seatId,
            status: 'available',
            showId: hold.showId,
            eventType: 'hold_expired',
            timestamp: new Date(),
            userId: hold.userId
          },
          messageId: generateMessageId(),
          timestamp: new Date()
        });
        
        console.log(`⏰ Released expired hold for seat ${seatId}`);
      } catch (error) {
        console.error(`Failed to release expired hold for seat ${seatId}:`, error);
      }
    }
  });
}

// Run cleanup every 30 seconds
setInterval(cleanupExpiredHolds, 30000);

// Variables available for internal use
// Note: Cannot export these as they're not valid Next.js route exports 