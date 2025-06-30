import { makeWalls, makeLevelMap, createPlayer } from './initialize.js'
import { clearTempsState, getNarrowState, state } from '../bm-server-shared/state.js'
import { interval, speed } from '../bm-server-shared/config.js'
import { broadcast, clients, heldInputs, updateCountdown } from '../ws-server.mjs'
import { startMiniGame } from '../server.mjs'

export let bounds
export let levelMap                    // for placing elements, wall collapses
export let powerUpMap                  // powerups on different map

export const bombs = new Map()         // for player collisions
export const bombTime = 2500
export const flames = new Map()        // for player collisions
export const timedEvents = new Map()
export const playerNames = []

let gameIntervalId
let ending = false
let ended = false
export let mainGameRunning = false

export function nextLevel() {
    //state.level++;
    state.solidWalls = []
    state.weakWalls.clear()
    bombs.clear()
    flames.clear()
    timedEvents.clear()
    state.powerups.clear()
    stopGame()
};

// start main game
export function startSequence(clients) {
    mainGameRunning = true
    state.players.length = 0

    clients.values().forEach((c) => {
        state.players.push(createPlayer(c.nickname, c.id))     // bomb ownership breaks (no collision until player is away from it)
        playerNames.push(c.nickname)
    })

    bounds = { left: 0, right: 650, top: 0, bottom: 550, width: 650, height: 550 }
    levelMap = makeLevelMap()
    powerUpMap = makeLevelMap()
    makeWalls(state.level)

    // broadcast state to start off game
    broadcast({ type: 'startgame', payload: state })
    runGame()
}

export function countPoints () {
    const points = {}
    clients.forEach(c => {
        points[c.id] = c.points
    })
    return points
}

// end main game
function endSequence() {
    setTimeout(() => {
        // Broadcast winner and points or undefined
        const winner = state.players.find(p => p.lives !== 0)
        clients.forEach(c => {
            if (c.id === winner.id) {
                c.points++
            }
        })
        const points = countPoints()
        broadcast({ type: 'endgame', winner, points })

        // Show result, then return to lobby
        setTimeout(() => {
            state.players.length = 0
            state.solidWalls.length = 0
            state.surroundingWalls.length = 0
            state.weakWalls.clear()
            state.powerups.clear()
            levelMap = []
            powerUpMap = []

            ended = true    // exits game loop
            broadcast({ type: 'back to lobby' })
            mainGameRunning = false
            updateCountdown()
        }, 5000)
    }, 3500) // bombtime + flame time + 500
}

function runGame() {
    gameIntervalId = setInterval(gameLoop, interval)

    function gameLoop() {
        state.players.forEach(p => {
            const input = heldInputs.get(p.id)
            if (ending) input.bomb = false     // don't allow bomb drops when end sequence has started
            p.movePlayer(speed, input)
            input.bomb = false
        })

        // broadcast only updates to state (no solidWalls, no surroundingWalls, no weakWalls, no powerups)
        broadcast({ type: 'gamestate', payload: getNarrowState(state) })
        clearTempsState()

        if (!ending && state.players.filter(p => p.lives !== 0).length < 2) {
            ending = true
            endSequence()
        }

        if (ended) {
            ending = false
            ended = false
            startMiniGame()
            stopGame()  // exit main game loop
        }
    }
};

function stopGame() {
    if (gameIntervalId) {
        clearInterval(gameIntervalId)
        gameIntervalId = null
    }
}