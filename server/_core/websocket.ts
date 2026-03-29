import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";

interface WebSocketMessage {
  type: "loadAssigned" | "loadUpdated" | "loadCancelled" | "ping" | "pong";
  data?: Record<string, any>;
  timestamp?: number;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private userConnections: Map<number, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/api/ws" });

    this.wss.on("connection", (ws: AuthenticatedWebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    console.log("[WebSocket] Server initialized on /api/ws");
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, req: any) {
    const url = parse(req.url || "", true);
    const token = url.query.token as string;

    if (!token) {
      ws.close(1008, "No authentication token provided");
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
      ws.userId = decoded.id || decoded.userId;
      if (!ws.userId) {
        ws.close(1008, "Invalid token payload");
        return;
      }
      ws.isAlive = true;

      // Register user connection
      if (!this.userConnections.has(ws.userId)) {
        this.userConnections.set(ws.userId, new Set());
      }
      this.userConnections.get(ws.userId)!.add(ws);

      console.log(`[WebSocket] User ${ws.userId} connected`);

      // Handle incoming messages
      ws.on("message", (data) => this.handleMessage(ws, data));

      // Handle pong response
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle disconnection
      ws.on("close", () => {
        this.handleDisconnection(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error(`[WebSocket] Error for user ${ws.userId}:`, error);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: "connected",
        userId: ws.userId,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error("[WebSocket] Token verification failed:", error);
      ws.close(1008, "Invalid authentication token");
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: AuthenticatedWebSocket, data: any) {
    try {
      const message: WebSocketMessage = JSON.parse(
        typeof data === "string" ? data : data.toString()
      );

      switch (message.type) {
        case "ping":
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          break;
        default:
          console.log(`[WebSocket] Received message type: ${message.type}`);
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(ws: AuthenticatedWebSocket) {
    if (!ws.userId) return;

    const connections = this.userConnections.get(ws.userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(ws.userId);
      }
    }

    console.log(`[WebSocket] User ${ws.userId} disconnected`);
  }

  /**
   * Send notification to specific user
   */
  notifyUser(userId: number, message: WebSocketMessage) {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      console.log(`[WebSocket] User ${userId} not connected`);
      return false;
    }

    const payload = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    });

    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });

    return true;
  }

  /**
   * Send notification to multiple users
   */
  notifyUsers(userIds: number[], message: WebSocketMessage) {
    userIds.forEach((userId) => this.notifyUser(userId, message));
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(message: WebSocketMessage) {
    if (!this.wss) return;

    const payload = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    });

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get user connection count
   */
  getUserConnectionCount(userId: number): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
    this.userConnections.clear();
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
