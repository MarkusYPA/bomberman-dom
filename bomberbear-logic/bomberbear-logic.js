import { makeWalls, makeLevelMap, createPlayer } from './initialize.js'
import { clearTempsState, getNarrowState, bbstate } from './bomberbear-state.js'
import { interval } from './config.js'
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
    bbstate.solidWalls = []
    bbstate.weakWalls.clear()
    bombs.clear()
    flames.clear()
    timedEvents.clear()
    bbstate.powerups.clear()
    stopGame()
};

// start main game
export function startSequence(clients) {
    // Stop any existing game loop first
    stopGame()
    
    // Reset all game state
    mainGameRunning = true
    bbstate.players.length = 0
    playerNames.length = 0
    ending = false
    ended = false

    for (const c of clients.values()){
        bbstate.players.push(createPlayer(c.nickname, c.id))     // bomb ownership breaks (no collision until player is away from it)
        playerNames.push(c.nickname)
    }

    bounds = { left: 0, right: 650, top: 0, bottom: 550, width: 650, height: 550 }
    levelMap = makeLevelMap()
    powerUpMap = makeLevelMap()
    makeWalls(bbstate.level)

    // broadcast state to start off game
    broadcast({ type: 'startgame', payload: bbstate })
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
        const winner = bbstate.players.find(p => p.lives !== 0)
        if (winner) {
            clients.forEach(c => {
                if (c.id === winner.id) {
                    c.points++
                }
            })
        }
        const points = countPoints()
        broadcast({ type: 'endgame', winner, points })

        // Show result, then return to lobby
        setTimeout(() => {
            bbstate.players.length = 0
            bbstate.solidWalls.length = 0
            bbstate.surroundingWalls.length = 0
            bbstate.weakWalls.clear()
            bbstate.powerups.clear()
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
    // Make sure we don't have multiple game loops running
    if (gameIntervalId) {
        clearInterval(gameIntervalId)
        gameIntervalId = null
    }
    
    gameIntervalId = setInterval(gameLoop, interval)

    function gameLoop() {
        bbstate.players.forEach(p => {
            const input = heldInputs.get(p.id)
            if (!input) return // Skip if player disconnected
            if (ending) input.bomb = false     // don't allow bomb drops when end sequence has started
            p.movePlayer(input)
            input.bomb = false
        })

        // broadcast only updates to state (no solidWalls, no surroundingWalls, no weakWalls, no powerups)
        broadcast({ type: 'gamestate', payload: getNarrowState(bbstate) })
        clearTempsState()

        if (!ending && bbstate.players.filter(p => p.lives !== 0).length < 2) {
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

// Add function to remove disconnected players from game state
export function removePlayerFromGame(id) {
    const playerIndex = bbstate.players.findIndex(p => p.id === id)
    if (playerIndex !== -1) {
        bbstate.players.splice(playerIndex, 1)
    }
    
    // Also remove from playerNames
    const nameIndex = playerNames.findIndex((name, index) => {
        return bbstate.players[index] && bbstate.players[index].id === id
    })
    if (nameIndex !== -1) {
        playerNames.splice(nameIndex, 1)
    }
}