import PartySocket from 'partysocket'
import type { MultiplayerClient } from './client'
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

  connect(roomId: string, playerId: string, playerName: string) {
    this.socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      id: playerId,
    })

    this.socket.addEventListener('open', () => {
      this.send({ type: 'join', name: playerName })
    })

    this.socket.addEventListener('message', (evt: MessageEvent<string>) => {
      try {
        const event = JSON.parse(evt.data) as ServerEvent
        this.handlers.forEach((h) => h(event))
      } catch {
        // ignore malformed frames
      }
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
    return () => {
      this.handlers.delete(handler)
    }
  }
}
