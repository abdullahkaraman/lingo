import type { ClientEvent, ServerEvent } from './types'

/**
 * Transport-agnostic interface for multiplayer communication.
 * Swap out implementations (PartyKit → Socket.io → raw WebSocket)
 * without touching any React component or game-engine code.
 */
export interface MultiplayerClient {
  connect(roomId: string, playerId: string, playerName: string): void
  disconnect(): void
  send(event: ClientEvent): void
  /** Registers a handler for all server events. Returns an unsubscribe function. */
  subscribe(handler: (event: ServerEvent) => void): () => void
}
