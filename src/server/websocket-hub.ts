// WebSocket hub — track connected clients, broadcast job events

import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

/** Register a new WebSocket client */
export function addClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
}

/** Broadcast a JSON event to all connected clients */
export function broadcast(event: { type: string; [key: string]: unknown }): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

/** Get current connected client count */
export function getClientCount(): number {
  return clients.size;
}
