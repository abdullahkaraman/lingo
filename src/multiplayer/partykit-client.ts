import PartySocket from 'partysocket'
import type { ConnectionStatus, MultiplayerClient } from './client'
import type { ClientEvent, ServerEvent } from './types'

// Set VITE_PARTYKIT_HOST in .env.local for production.
// Defaults to the local PartyKit dev server.
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999'

/**
 * MultiplayerClient backed by PartyKit / partysocket.
 * This is the only file in the codebase that imports partysocket.
 * To migrate to a different transport, implement MultiplayerClient
 * in a new file and swap it in wherever PartyKitClient is instantiated.
 */
export class PartyKitClient implements MultiplayerClient {
  private socket: PartySocket | null = null
  private handlers = new Set<(event: ServerEvent) => void>()
  private statusHandlers = new Set<(status: ConnectionStatus) => void>()

  private notifyStatus(status: ConnectionStatus) {
    this.statusHandlers.forEach((h) => h(status))
  }

  connect(roomId: string, playerId: string, _playerName = '') {

    this.socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      id: playerId,
    })

    this.notifyStatus('connecting')

    this.socket.addEventListener('open', () => {
      this.notifyStatus('connected')
    })

    this.socket.addEventListener('message', (evt: MessageEvent<string>) => {
      try {
        const event = JSON.parse(evt.data) as ServerEvent
        this.handlers.forEach((h) => h(event))
      } catch {
        // ignore malformed frames
      }
    })

    // partysocket fires 'close' between reconnect attempts.
    this.socket.addEventListener('close', () => {
      this.notifyStatus('disconnected')
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  send(event: ClientEvent) {
    this.socket?.send(JSON.stringify(event))
  }

  subscribe(handler: (event: ServerEvent) => void): () => void {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler)
    return () => { this.statusHandlers.delete(handler) }
  }
}
