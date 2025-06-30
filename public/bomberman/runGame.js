import { clearClientGameState, clientGameState } from '../shared/state.js'
import { walkingSound } from './sounds.js'
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
export let newLives = 0
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
let playPromise = null

// Walking sounds controlled from inputlisteners
export function setMoving(moving) {
    wasMoving = isMoving
    isMoving = moving

    if (thisPlayer && !thisPlayer.alive) {
        if (!walkingSound.paused) {
            walkingSound.pause()
            walkingSound.currentTime = 0
        }
        return
    }

    if (isMoving && !wasMoving) {
        playPromise = walkingSound.play().catch((err) => {
            if (err.name !== 'AbortError') {
                console.error('walk sound play error:', err)
            }
        })
    } else if (!isMoving && wasMoving) {
        // If play was initiated and hasn't resolved yet, wait for it to finish before pausing
        if (playPromise) {
            playPromise.finally(() => {
                walkingSound.pause()
                walkingSound.currentTime = 0
            })
        } else {
            walkingSound.pause()
            walkingSound.currentTime = 0
        }
    }
}


export function restartGame() {
    location.reload()
};

export function updateLivesInfo(players) {
    oldlives = 0
    players.forEach((p, i) => {
        oldlives += p.lives
        let livesText = ''
        for (let i = 0; i < p.lives; i++) {
            livesText += '❤️'
        };
        livesinfos[i].textContent = `${p.name}: `+ livesText
    })
}

export function startSequenceClient() {
    //console.log('starting game')
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

    function processNextTask() {
        if (tasks.length > 0) {
            let task = tasks.shift()
            task()
            requestAnimationFrame(processNextTask)
        }
    }

    requestAnimationFrame(processNextTask)
}

export function stopSequenceClient() {
    //console.log('ending game')
    gameRunning = false     // exit game loop    
    clearClientGameState()  // clear state
    state.screen = 'lobby'
    // minigame will run and update with websockets messages
}

function runGame() {
    gameRunning = true
    requestAnimationFrame(gameLoop)

    function gameLoop(_timestamp) {
        if (!gameRunning) {
            //console.log('exiting client game loop')
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

        if (clientGameState.pickedItems.length > 0) {
            clientGameState.pickedItems.forEach(name => pickUpItem(name))
            clientGameState.pickedItems.length = 0
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

        // requestAnimationFrame() always runs callback with 'timestamp' argument (milliseconds since the page loaded)
        requestAnimationFrame(gameLoop)
    }
};
