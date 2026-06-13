import type { ConnectionStatus, MultiplayerClient } from './client'
import type { ClientEvent, ServerEvent } from './types'
import { WS_URL } from '../config/backend'

function roomSocketUrl(roomId: string, playerId: string, playerName: string, role: 'player' | 'spectator') {
  const url = new URL(WS_URL)
  url.searchParams.set('roomCode', roomId)
  url.searchParams.set('playerId', playerId)
  url.searchParams.set('role', role)
  if (playerName) {
    url.searchParams.set('name', playerName)
  }
  return url.toString()
}

function toBackendEvent(event: ClientEvent) {
  if (event.type === 'guess') {
    return { type: 'submit_guess', guess: event.word }
  }
  if (event.type === 'join' || event.type === 'skip_turn' || event.type === 'ping') {
    return event
  }
  return null
}

/**
 * MultiplayerClient backed by the local Go websocket endpoint.
 * To migrate to a different transport, implement MultiplayerClient
 * in a new file and swap it in wherever GoWebSocketClient is instantiated.
 */
export class GoWebSocketClient implements MultiplayerClient {
  private socket: WebSocket | null = null
  private handlers = new Set<(event: ServerEvent) => void>()
  private statusHandlers = new Set<(status: ConnectionStatus) => void>()
  private queuedEvents: ClientEvent[] = []
  private roomId = ''
  private playerId = ''
  private playerName = ''
  private role: 'player' | 'spectator' = 'spectator'

  private notifyStatus(status: ConnectionStatus) {
    this.statusHandlers.forEach((h) => h(status))
  }

  connect(roomId: string, playerId: string, playerName = '') {
    this.roomId = roomId
    this.playerId = playerId
    this.playerName = playerName
    this.role = playerName ? 'player' : 'spectator'
    this.openSocket()
  }

  private openSocket() {
    const socket = new WebSocket(roomSocketUrl(this.roomId, this.playerId, this.playerName, this.role))
    this.socket = socket
    this.notifyStatus('connecting')

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return
      console.debug('[multiplayer] socket connected')
      this.notifyStatus('connected')
      const queued = this.queuedEvents.splice(0)
      queued.forEach((event) => this.send(event))
    })

    socket.addEventListener('message', (evt: MessageEvent<string>) => {
      if (this.socket !== socket) return
      try {
        const event = JSON.parse(evt.data) as ServerEvent
        console.debug('[multiplayer] incoming', event.type)
        this.handlers.forEach((h) => h(event))
      } catch {
        // ignore malformed frames
      }
    })

    socket.addEventListener('close', () => {
      if (this.socket !== socket) return
      console.debug('[multiplayer] socket disconnected')
      this.notifyStatus('disconnected')
    })
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  send(event: ClientEvent) {
    console.debug('[multiplayer] outgoing', event.type)
    if (event.type === 'join' && this.role !== 'player') {
      this.playerName = event.name
      this.role = 'player'
      this.queuedEvents.push(event)
      this.socket?.close()
      this.openSocket()
      return
    }
    if (!this.socket || this.socket.readyState === WebSocket.CONNECTING) {
      this.queuedEvents.push(event)
      return
    }
    if (this.socket.readyState !== WebSocket.OPEN) return
    const backendEvent = toBackendEvent(event)
    if (!backendEvent) return
    this.socket.send(JSON.stringify(backendEvent))
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
