import { useEffect, useRef, useCallback } from "react";

interface WebSocketMessage {
  type: "start" | "chunk" | "complete" | "error";
  content?: string;
  message?: string;
  sources?: string[];
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const { onMessage, onConnect, onDisconnect, onError } = options;

  const connect = useCallback(() => {
    if (
      !url ||
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected to:", url);
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(
          "WebSocket disconnected. Code:",
          event.code,
          "Reason:",
          event.reason
        );
        wsRef.current = null;
        onDisconnect?.();
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket encountered an error:", error);
        onError?.(error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return {
    sendMessage,
    connect,
    disconnect,
    isConnected,
  };
};
