import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

interface WebSocketMessage {
  type: string;
  data?: Record<string, any>;
  timestamp?: number;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = false, // Disabled by default due to connection issues
  } = options;

  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Generate JWT token for WebSocket authentication
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check cached token with expiration
      const cached = localStorage.getItem("ws_token_cache");
      if (cached) {
        try {
          const { token, expiresAt } = JSON.parse(cached);
          // Token valid if not expired (with 5min buffer)
          if (expiresAt && new Date(expiresAt).getTime() - 5 * 60 * 1000 > Date.now()) {
            return token;
          }
        } catch {
          // Invalid cache, ignore
        }
      }

      // Fetch new token with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/auth/ws-token", {
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const { token: newToken } = await response.json();
      const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000); // 23 hours
      localStorage.setItem("ws_token_cache", JSON.stringify({ token: newToken, expiresAt }));
      return newToken;
    } catch (error) {
      console.error("[WebSocket] Error getting auth token:", error);
      return null;
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (!user?.id) {
      console.warn("[WebSocket] User not authenticated");
      return;
    }

    setIsConnecting(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use /ws route instead of /api/ws for isolation
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("[WebSocket] Message received:", message.type);
          onMessage?.(message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error("[WebSocket] Max reconnection attempts reached");
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      setIsConnecting(false);
      onError?.(new Event("connection_error"));
    }
  }, [user?.id, getAuthToken, onConnect, onDisconnect, onError, onMessage]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  /**
   * Send message to server
   */
  const send = useCallback((message: WebSocketMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Not connected, cannot send message");
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("[WebSocket] Error sending message:", error);
      return false;
    }
  }, []);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect && user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user?.id, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    send,
  };
}
