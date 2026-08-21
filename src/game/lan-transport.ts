import type { ClientMessage, ServerMessage } from './lan-protocol';

export interface GameTransport {
  connect(endpoint: string): Promise<void>;
  send(message: ClientMessage): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  disconnect(): void;
}

export class LocalLanTransport implements GameTransport {
  private socket: WebSocket | null = null;
  private listeners = new Set<(message: ServerMessage) => void>();

  connect(endpoint: string) {
    this.disconnect();
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(endpoint);
      this.socket = socket;
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error('ไม่สามารถเชื่อมต่อเครื่องโฮสต์ในเครือข่ายนี้ได้')), { once: true });
      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;
          this.listeners.forEach((listener) => listener(message));
        } catch { /* ignore invalid peer messages */ }
      });
    });
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('การเชื่อมต่อยังไม่พร้อม');
    this.socket.send(JSON.stringify(message));
  }

  onMessage(listener: (message: ServerMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect() { this.socket?.close(); this.socket = null; }
}
