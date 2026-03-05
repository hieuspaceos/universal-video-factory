// WebSocket hook — connect to /ws, auto-reconnect, emit typed events

import { useEffect, useRef, useState, useCallback } from "react";
import type { WsEvent } from "./types.js";

const WS_URL = `ws://${window.location.host}/ws`;
const RECONNECT_DELAY_MS = 2000;

export interface UseWebSocketResult {
  lastEvent: WsEvent | null;
  isConnected: boolean;
}

export function useWebSocket(
  onEvent?: (event: WsEvent) => void
): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep callback ref up-to-date without re-running the effect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data as string) as WsEvent;
        setLastEvent(event);
        onEventRef.current?.(event);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Schedule reconnect
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { lastEvent, isConnected };
}
