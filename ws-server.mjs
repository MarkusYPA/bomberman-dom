import { createHash } from 'crypto'
import { Buffer } from 'buffer'
import Game from './game.mjs'
import { stopMiniGame } from './server.mjs'
import { countPoints, mainGameRunning, startSequence, removePlayerFromGame } from './bm-server/game.js'
import { removePlayer } from './bm-server-shared/state.js'

const game = new Game()
export const clients = new Map() // socket -> { id, nickname }
export const heldInputs = new Map() // id -> Set of held directions

let countdownTimer = null
let countdown = 2 // 10
let lobbyTimer = null
let lobbyTimeLeft = null

const LOBBY_DURATION = 3 //20

function encodeMessage(str) {
    const json = Buffer.from(str)
    const len = json.length
    const header = len < 126
        ? Buffer.from([129, len])
        : Buffer.from([129, 126, (len >> 8) & 255, len & 255])
    return Buffer.concat([header, json])
}

// JSON.stringify doesn't serialize Maps and Sets by default, this helps
function replacer(key, value) {
    if (value instanceof Map) {
        return Object.fromEntries(value)
    }
    if (value instanceof Set) {
        return Array.from(value)
    }
    return value
}

function reduceState(serverState) {
    // state info to send to clients
    const msgState = { type: 'gamestate', payload: { players: [] } }

    // Send non-empty arrays and maps, send only relevant player info
    for (const [key, val] of Object.entries(serverState.payload)) {
        if (Array.isArray(val)) {
            if (key === 'players') {
                val.forEach(p => {
                    msgState.payload.players.push({
                        id: p.id,
                        size: p.size,
                        lives: p.lives,
                        name: p.name,
                        x: p.x,
                        y: p.y,
                        vulnerable: p.vulnerable,
                        left: p.left,
                        lives: p.lives,
                        alive: p.alive,
                        killer: p.killer,
                    })
                })
            } else if (val.length !== 0) {
                msgState.payload[key] = val
            }
        } else if (val instanceof Map) {
            if (key === 'newFlames') { 
                // new flames into an array of objects
                msgState.payload.newFlames = []
                for (const flame of val.values()) {
                    msgState.payload.newFlames.push({
                        direction: flame.direction,
                        x: flame.x,
                        y: flame.y
                    })
                }
            } else if (val.size !== 0) msgState.payload[key] = val
        } else if (val) {
            msgState.payload[key] = val
        }
    }
    return msgState
}

//let stateCount = 0

export function broadcast(obj) {
    let msg
    if (obj.type === 'gamestate') {
        msg = encodeMessage(JSON.stringify(reduceState(obj), replacer))
    } else {
        msg = encodeMessage(JSON.stringify(obj, replacer))
    }

/*     if (obj.type === 'gamestate') {
        stateCount++
    }
    if (obj.type === 'gamestate' && obj.payload.newFlames && obj.payload.newFlames.size > 1) {
        console.log(reduceState(obj).payload.newFlames)
        const sizeInKB = Buffer.byteLength(msg) / 1024
        console.log(`Message size: ${sizeInKB.toFixed(2)} KB`)
    } */

    for (const socket of clients.keys()) {
        try {
            socket.write(msg)
        } catch (err) {
            console.error('Failed to broadcast message:', err)
        }
    }
}

function resetCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
    }
    broadcast({ type: 'countdown', time: null })
}

function startCountdown() {
    resetCountdown()
    let timeLeft = countdown

    countdownTimer = setInterval(() => {
        if (timeLeft > 0) {
            broadcast({ type: 'countdown', time: timeLeft })
            timeLeft--
        } else {
            clearInterval(countdownTimer)
            countdownTimer = null
            broadcast({ type: 'countdownFinished' }) // Notify clients that countdown is finished

            // stop minigame and start bomberman
            if (!mainGameRunning) {
                stopMiniGame()
                //console.log('clients when starting game:', clients.values())
                startSequence(clients)
            }
        }
    }, 1000)
}
function resetLobbyTimer() {
    if (lobbyTimer) {
        clearInterval(lobbyTimer)
        lobbyTimer = null
    }
    lobbyTimeLeft = null
    broadcast({ type: 'lobby', time: null })
}

function startLobbyTimer() {
    resetLobbyTimer()
    lobbyTimeLeft = LOBBY_DURATION
    broadcast({ type: 'lobby', time: lobbyTimeLeft })

    lobbyTimer = setInterval(() => {
        if (clients.size === 4) {
            clearInterval(lobbyTimer)
            lobbyTimer = null
            lobbyTimeLeft = null
            broadcast({ type: 'lobbyFinished' })
            startCountdown()
            return
        }
        lobbyTimeLeft--
        if (lobbyTimeLeft > 0) {
            broadcast({ type: 'lobby', time: lobbyTimeLeft })
        } else {
            clearInterval(lobbyTimer)
            lobbyTimer = null
            lobbyTimeLeft = null
            broadcast({ type: 'lobbyFinished' })
            startCountdown()
        }
    }, 1000)
}

export function handleUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key']
    const hash = createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64')

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${hash}\r\n\r\n`
    )

    let id = null
    let pingInterval = null
    let lastPongTime = Date.now()

    // Set up ping/pong heartbeat to detect disconnected clients
    const startHeartbeat = () => {
        pingInterval = setInterval(() => {
            //todo: check if 30 seconds pong timeout is appropriate
            if (Date.now() - lastPongTime > 30000) { // 30 seconds timeout
                console.log(`Client ${id} timeout - closing connection`)
                socket.destroy()
                return
            }

            // Send ping frame (opcode 9)
            try {
                const pingFrame = Buffer.from([0x89, 0x00]) // Ping with no payload
                socket.write(pingFrame)
            } catch (err) {
                console.log(`Failed to send ping to client ${id}: ${err.message}`)
                socket.destroy()
            }
        }, 10000) // Ping every 10 seconds
        //todo: check if 10 seconds ping timeout is appropriate
    }

    const cleanup = () => {
        if (pingInterval) {
            clearInterval(pingInterval)
            pingInterval = null
        }
        if (id) {
            game.removePlayer(id)   // remove player from mini game
            removePlayer(id)        // remove player from main game
            removePlayerFromGame(id) // Also remove from bomberman game state
            heldInputs.delete(id)
            const sender = clients.get(socket)?.nickname || '???'
            if (sender && sender !== '???') {
                broadcast({ type: 'chat', nickname: sender, playerId: id, message: sender + ' left the game!' })
            }
        }
        clients.delete(socket)
    }

    socket.on('data', (buffer) => {
        let offset = 0
        while (offset < buffer.length) {
            try {
                const opcode = buffer[offset] & 0x0f

                // Handle pong frames (opcode 10)
                if (opcode === 10) {
                    lastPongTime = Date.now()
                    offset += 2 // Skip pong frame
                    continue
                }

                if (opcode !== 1) break // Only handle text frames

                // Make sure at least 2 bytes are available for header
                if (offset + 2 > buffer.length) break

                let len = buffer[offset + 1] & 127
                let maskStart = offset + 2

                if (len === 126) {
                    // Need 4 bytes for header + extended length
                    if (offset + 4 > buffer.length) break
                    len = buffer.readUInt16BE(offset + 2)
                    maskStart = offset + 4
                } else if (len === 127) {
                    // Not supporting 64-bit lengths, skip frame
                    break
                }

                // Need 4 bytes for mask + payload
                if (maskStart + 4 > buffer.length) break
                const mask = buffer.slice(maskStart, maskStart + 4)
                const dataStart = maskStart + 4
                const dataEnd = dataStart + len

                // Make sure the whole payload is available
                if (dataEnd > buffer.length) break

                const data = buffer.slice(dataStart, dataEnd)
                const unmasked = Buffer.alloc(data.length)
                for (let i = 0; i < data.length; i++) {
                    unmasked[i] = data[i] ^ mask[i % 4]
                }
                const msg = unmasked.toString()
                const obj = JSON.parse(msg)

                if (obj.type === 'join') {
                    if (clients.size >= 4) {
                        const fullMsg = encodeMessage(JSON.stringify({
                            type: 'error',
                            message: 'Server is full (4/4 players). Please try again later.'
                        }))
                        socket.write(fullMsg)
                        setTimeout(() => socket.end(), 100)
                        return
                    }

                    // Check for duplicate nickname
                    const usedNicknames = new Set([...clients.values()].map(client => client.nickname.toLowerCase()))
                    if (usedNicknames.has(obj.nickname.toLowerCase())) {
                        // Send duplicate name error message but keep connection open
                        const duplicateMsg = encodeMessage(JSON.stringify({
                            type: 'duplicateNickname',
                            message: `Nickname "${obj.nickname}" is already taken. Please choose a different name.`
                        }))
                        socket.write(duplicateMsg)
                        return // Don't close connection, just return and wait for new join attempt
                    }

                    // Find first available ID between 1-4
                    const usedIds = new Set([...clients.values()].map(client => client.id))
                    for (let i = 1; i <= 4; i++) {
                        if (!usedIds.has(i)) {
                            id = i
                            break
                        }
                    }

                    clients.set(socket, { id, nickname: obj.nickname, points: 0 })
                    const added = game.addPlayer(id, obj.nickname)
                    if (!added) {
                        const errorMsg = encodeMessage(JSON.stringify({
                            type: 'error',
                            message: 'Failed to join game. Please try again.'
                        }))
                        socket.write(errorMsg)
                        setTimeout(() => socket.end(), 100)
                        return
                    }
                    heldInputs.set(id, new Set())

                    // Send the assigned player id to the client
                    const idMsg = encodeMessage(JSON.stringify({
                        type: 'playerId',
                        id
                    }))
                    socket.write(idMsg)

                    // Send current player count to the new client
                    const countMsg = encodeMessage(JSON.stringify({
                        type: 'playerCount',
                        count: clients.size
                    }))
                    socket.write(countMsg)

                    // Reset countdown whenever the number of players changes
                    updateCountdown()
                    broadcastPlayerCount()

                    // Start heartbeat after successful join
                    startHeartbeat()

                    const sender = clients.get(socket)?.nickname || '???'
                    broadcast({ type: 'chat', nickname: sender, playerId: id, message: sender + ' joined the game!' })
                }

                if (obj.type === 'input' && id) {
                    // obj.payload is an object of booleans
                    heldInputs.set(id, obj.payload)
                }

                if (obj.type === 'chat' && id) {
                    const sender = clients.get(socket)?.nickname || '???'
                    broadcast({ type: 'chat', nickname: sender, playerId: id, message: obj.message })
                }

                if (obj.type === 'requestPoints') {
                    const points = countPoints()
                    broadcast({ type: 'points', points })
                }

                if (obj.type === 'requestPointsAndPlayers') {
                    const points = countPoints()
                    broadcast({ type: 'points', points, players: game.getState() })
                }

                if (obj.type === 'leaveGame') {
                    removePlayer(id)        // remove player from main game
                    const sender = clients.get(socket)?.nickname || '???'
                    if (sender && sender !== '???') {
                        broadcast({ type: 'chat', nickname: sender, playerId: id, message: sender + ' exited to lobby!' })
                    }
                }

                offset = dataEnd
            } catch (e) {
                console.error('Invalid WS data', e)
                break
            }
        }
    })

    socket.on('close', () => {
        console.log(`Socket closed for client ${id}`)
        cleanup()
        const points = countPoints()
        broadcast({ type: 'points', points })

        // Reset countdown whenever the number of players changes
        updateCountdown()
    })

    socket.on('end', () => {
        console.log(`Socket ended for client ${id}`)
        cleanup()
        const points = countPoints()
        broadcast({ type: 'points', points })

        // Reset countdown whenever the number of players changes
        updateCountdown()
        broadcastPlayerCount()
    })

    // Handle socket errors (like ECONNRESET) to prevent crashes
    socket.on('error', (err) => {
        console.log(`Socket error for client ${id}: ${err.code} - ${err.message}`)
        cleanup()
        const points = countPoints()
        broadcast({ type: 'points', points })

        // Reset countdown whenever the number of players changes
        updateCountdown()
        broadcastPlayerCount()
    })
}

export function tickGame() {
    // Move players based on held inputs
    for (const [id, held] of heldInputs.entries()) {
        game.handleInput(id, held)
    }
    const state = { type: 'state', payload: game.getState() }
    broadcast(state)
}

export function updateCountdown() {
    if (!mainGameRunning) {
        if (clients.size >= 4) {
            // Stop lobby timer if running, start countdown immediately
            resetLobbyTimer()
            if (!countdownTimer) {
                startCountdown()
            }
        } else if (clients.size >= 2) {
            if (!lobbyTimer && !lobbyTimeLeft && !countdownTimer) {
                startLobbyTimer()
            }
        } else {
            resetLobbyTimer()
            resetCountdown()
        }
    }

}

function broadcastPlayerCount() {
    broadcast({ type: 'playerCount', count: clients.size })
}
