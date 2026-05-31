import type * as Party from 'partykit/server'

interface RoomInfo {
  id: string
  phase: string
  connectedCount: number
  playerNames: string[]
  wordLength: number
  timerSeconds: number
  updatedAt: number
}

type LobbyMessage =
  | { type: 'update'; room: RoomInfo }
  | { type: 'remove'; room: { id: string } }

const STORAGE_KEY = 'rooms'
const STALE_MS = 10 * 60 * 1000 // 10 minutes

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export default class LobbyServer implements Party.Server {
  private rooms = new Map<string, RoomInfo>()

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<Record<string, RoomInfo>>(STORAGE_KEY)
    if (!stored) return
    const now = Date.now()
    for (const [id, info] of Object.entries(stored)) {
      if (now - info.updatedAt < STALE_MS) this.rooms.set(id, info)
    }
  }

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

    if (req.method === 'POST') {
      const msg = await req.json() as LobbyMessage
      if (msg.type === 'remove') {
        this.rooms.delete(msg.room.id)
      } else {
        this.rooms.set(msg.room.id, { ...msg.room, updatedAt: Date.now() })
      }
      await this.persist()
      this.room.broadcast(JSON.stringify({ type: 'rooms', rooms: this.active() }))
      return new Response('ok', { headers: CORS })
    }

    return new Response(
      JSON.stringify({ rooms: this.active() }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: 'rooms', rooms: this.active() }))
  }

  private active(): RoomInfo[] {
    const now = Date.now()
    const result: RoomInfo[] = []
    for (const [id, info] of this.rooms) {
      if (now - info.updatedAt >= STALE_MS || info.connectedCount === 0) {
        this.rooms.delete(id)
        continue
      }
      result.push(info)
    }
    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  private async persist() {
    await this.room.storage.put(STORAGE_KEY, Object.fromEntries(this.rooms))
  }
}
