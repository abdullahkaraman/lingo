import type * as Party from 'partykit/server'
import {
  applyGuess,
  createRoomState,
  getPublicState,
  joinPlayer,
  leavePlayer,
  setWordLength,
  startGame,
  startNextRound,
  voteRematch,
} from '../src/game-engine'
import type { RoomState } from '../src/game-engine/types'
import type { ClientEvent } from '../src/multiplayer/types'

const STATE_KEY = 'room'

async function load(room: Party.Room): Promise<RoomState | null> {
  return (await room.storage.get<RoomState>(STATE_KEY)) ?? null
}

async function save(room: Party.Room, state: RoomState): Promise<void> {
  await room.storage.put(STATE_KEY, state)
}

/** Send each connection its own personalised view of the room. */
function broadcast(room: Party.Room, state: RoomState): void {
  for (const conn of room.getConnections()) {
    conn.send(JSON.stringify({ type: 'state', state: getPublicState(state, conn.id) }))
  }
}

function sendError(conn: Party.Connection, code: string, message: string): void {
  conn.send(JSON.stringify({ type: 'error', code, message }))
}

export default class LingoServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    let state = await load(this.room)

    if (!state) {
      // First connection creates the room and becomes host.
      state = createRoomState(this.room.id, conn.id)
      await save(this.room, state)
    } else if (state.players[conn.id]) {
      // Known player reconnecting — restore connected flag.
      state = joinPlayer(state, conn.id, state.players[conn.id].name)
      await save(this.room, state)
    }

    conn.send(JSON.stringify({ type: 'state', state: getPublicState(state, conn.id) }))
  }

  async onMessage(
    message: string | ArrayBuffer | ArrayBufferView,
    sender: Party.Connection,
  ) {
    if (typeof message !== 'string') return

    const state = await load(this.room)
    if (!state) return

    let event: ClientEvent
    try {
      event = JSON.parse(message) as ClientEvent
    } catch {
      return
    }

    let next = state

    switch (event.type) {
      case 'join': {
        const isFull =
          !state.players[sender.id] && Object.keys(state.players).length >= 2
        if (isFull) {
          sendError(sender, 'ROOM_FULL', 'Oda dolu')
          return
        }
        next = joinPlayer(state, sender.id, event.name)
        break
      }

      case 'start_game': {
        if (sender.id !== state.hostId) {
          sendError(sender, 'FORBIDDEN', 'Oyunu sadece host başlatabilir')
          return
        }
        if (Object.keys(state.players).length < 2) {
          sendError(sender, 'NOT_ENOUGH_PLAYERS', 'Başlamak için 2 oyuncu gerekiyor')
          return
        }
        next = startGame(state)
        break
      }

      case 'guess': {
        const result = applyGuess(state, sender.id, event.word)
        if (!result.ok) {
          sendError(sender, 'INVALID_GUESS', result.error)
          return
        }
        next = result.state
        break
      }

      case 'next_round': {
        if (state.phase !== 'round_over') {
          sendError(sender, 'INVALID_OP', 'İlerlenecek tur yok')
          return
        }
        next = startNextRound(state)
        break
      }

      case 'set_word_length': {
        if (state.phase !== 'waiting') {
          sendError(sender, 'INVALID_OP', 'Oyun devam ederken kelime uzunluğu değiştirilemez')
          return
        }
        next = setWordLength(state, event.wordLength)
        break
      }

      case 'rematch_vote': {
        if (state.phase !== 'game_over') {
          sendError(sender, 'INVALID_OP', 'Rövanş sadece oyun bittikten sonra istenebilir')
          return
        }
        next = voteRematch(state, sender.id)
        break
      }
    }

    await save(this.room, next)
    broadcast(this.room, next)
  }

  async onClose(conn: Party.Connection) {
    const state = await load(this.room)
    if (!state) return
    const next = leavePlayer(state, conn.id)
    await save(this.room, next)
    broadcast(this.room, next)
  }
}
