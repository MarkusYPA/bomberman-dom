import { clientGameState } from '../shared/state.js'
import { playerId, setNewLives, setThisPlayer } from './runGame.js'
import { playSound } from './sounds.js'

const domPlayers = new Map()

// first draw, adding dom elements
export function addPlayers(players) {
    const gameContainer = document.getElementById('game')
    if (!gameContainer) return
    players.forEach(player => {
        const domPlayer = document.createElement('div')

        domPlayer.id = player.name
        domPlayer.classList.add('player', `id${player.id}`)
        domPlayer.style.width = `${player.size}px`
        domPlayer.style.height = `${player.size}px`
        domPlayer.style.position = 'absolute'
        domPlayer.style.transform = `translate(${player.x}px, ${player.y}px)`

        gameContainer.appendChild(domPlayer)
        domPlayers.set(player.name, domPlayer)
    })
}

export function updatePlayers(players) {
    const lives = []

    players.forEach(player => {
        if (player.id === playerId) {
            setThisPlayer(player)
        }

        lives.push(player.lives)
        const p = domPlayers.get(player.name)

        p.style.transform = `translate(${player.x}px, ${player.y}px)`
        if (!player.vulnerable) {
            p.classList.add('invulnerable')
        } else {
            p.classList.remove('invulnerable')
        }

        if (player.left) {
            p.classList.add('left')
        } else {
            p.classList.remove('left')
        }

        // Add ghost effect if player is out of lives
        if (player.lives <= 0) {
            p.classList.add('ghost')
            if (clientGameState.longDeadPlayers.get(player.id)) {
                p.classList.add('timeout')
            }
        } else {
            p.classList.remove('ghost')
        }

        if (!player.alive) {
            if (!p.classList.contains('dead')) {
                if (player.killer === 'bomb') playSound('playerBombDeath')
                if (player.killer === 'enemy1') playSound('playerDeath')
                if (player.killer === 'enemy2') playSound('playerDeath2')
            }
            p.classList.add('dead')
        } else {
            p.classList.remove('dead')
        }
    })

    // Remove DOM players that are no longer in the players array
    const playerNames = new Set(players.map(p => p.name))
    for (const [name, domPlayer] of domPlayers.entries()) {
        if (!playerNames.has(name)) {
            domPlayer.remove()
            domPlayers.delete(name)
        }
    }

    setNewLives(lives)
}

export function removePlayers(players) {
    players.forEach(player => {
        domPlayers.delete(player.name)
    })
}