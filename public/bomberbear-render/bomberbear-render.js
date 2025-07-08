import { clearClientGameState, clientGameState } from './clientstate.js'
import { currentlyPlaying, playSound, stopSound } from './sounds.js'
import { makeTextBar, resizeGameContainer } from './initializeClient.js'
import { drawSolidWalls, drawWeakWalls, collapseWeakWall } from './renderWalls.js'
import { drawPowerUps, pickUpItem, burnItem } from './renderItems.js'
import { drawBombs, clearBombs } from './renderBombs.js'
import { drawFlames } from './renderFlames.js'
import { addPlayers, updatePlayers } from './renderPlayers.js'
import { state } from '../framework/state.js'

export let playerId = ''
export let thisPlayer
let livesinfos = []
let oldlives = 0                        
export let newLives = 0                 // update in-game 'livesinfos' when lives change
export const clientEvents = new Map()
let isMoving = false
let wasMoving = false
export let gameRunning = false

export function setPlayerId(id) {
    playerId = id
}

// update local player info (for lives mostly)
export function setThisPlayer(player) {
    thisPlayer = player
}

export function setNewLives(nl) {
    newLives = 0
    nl.forEach(l => newLives += l)
}

// Walking sounds controlled from inputlisteners
export function setMoving(moving) {
    wasMoving = isMoving
    isMoving = moving

    if (thisPlayer && !thisPlayer.alive) {
        if (currentlyPlaying['walkingSound']) {
            stopSound('walkingSound')
        }
        return
    }

    if (isMoving && !wasMoving) {
        playSound('walkingSound')
    } else if (!isMoving && wasMoving) {
        stopSound('walkingSound')
    }
}


export function restartGame() {
    location.reload()
};

// HUD info of player names and lives
export function updateLivesInfo(players) {
    oldlives = 0
    players.forEach((p, i) => {
        oldlives += p.lives
        let livesText = ''
        for (let i = 0; i < p.lives; i++) {
            livesText += '❤️'
        };
        livesinfos[i].textContent = `${p.name} `+ livesText
    })

    while (livesinfos.length > players.length) {
        const removedPlayerInfo = livesinfos.pop()
        removedPlayerInfo.style.visibility = 'hidden'
    }
}

// runs when mini game stops and full game loads
export function startSequenceClient() {
    thisPlayer = clientGameState.players[playerId - 1]

    let tasks = [
        () => { resizeGameContainer() },
        () => {
            livesinfos = makeTextBar(clientGameState.players)
            updateLivesInfo(clientGameState.players)
        },

        // Render dom elements
        () => { drawSolidWalls(clientGameState.solidWalls); drawSolidWalls(clientGameState.surroundingWalls), drawWeakWalls(clientGameState.weakWalls) },
        () => { drawPowerUps(clientGameState.powerups); addPlayers(clientGameState.players) },
        () => { runGame() },
    ]

    // don't perform all start-up tasks at once to avoid frame drops
    function processNextTask() {
        if (tasks.length > 0) {
            let task = tasks.shift()
            task()
            setTimeout(processNextTask, 16)
        }
    }
    setTimeout(processNextTask, 0)
}

// stop running full game
export function stopSequenceClient(screenState = 'lobby') {
    gameRunning = false     // triggers exiting game loop    
    clearClientGameState()  // clear state
    state.screen = screenState
}

function runGame() {
    gameRunning = true
    requestAnimationFrame(gameLoop)

    function gameLoop(_timestamp) {
        if (!gameRunning) {
            return
        }

        updatePlayers(clientGameState.players)
        if (oldlives !== newLives) {
            updateLivesInfo(clientGameState.players)
        }

        if (clientGameState.collapsingWalls.length > 0) {
            clientGameState.collapsingWalls.forEach(id => collapseWeakWall(id))
            clientGameState.collapsingWalls.length = 0
        }

        if (clientGameState.burningItems.length > 0) {
            clientGameState.burningItems.forEach(name => burnItem(name))
            clientGameState.burningItems.length = 0
        }

        if (clientGameState.newFlames.size > 0) {
            drawFlames(clientGameState.newFlames)
            clientGameState.newFlames.clear()
        }

        if (clientGameState.newBombs.size > 0) {
            drawBombs(clientGameState.newBombs)
            clientGameState.newBombs.clear()
        }

        if (clientGameState.removedBombs.size > 0) {
            clearBombs(clientGameState.removedBombs)
            clientGameState.removedBombs.clear()
        }

        if (clientGameState.newItems.size > 0) {
            drawPowerUps(clientGameState.newItems)
            clientGameState.newItems.clear()
        }

        if (clientGameState.pickedItems.length > 0) {
            clientGameState.pickedItems.forEach(name => pickUpItem(name))
            clientGameState.pickedItems.length = 0
        }

        requestAnimationFrame(gameLoop)
    }
};
