import { placeBomb, tickingBomb } from './sounds.js'


export function drawBombs(bombs) {
    const gameContainer = document.getElementById('game')
    if (!gameContainer) return
    bombs.forEach(bomb => {
        const domBomb = document.createElement('div')

        domBomb.id = bomb.name
        domBomb.classList.add('bomb')
        if (bomb.glowing) {
            domBomb.classList.add('glowing')

            const explosion = new Audio('assets/sfx/explosion.mp3')
            explosion.volume = 0.6
            explosion.play()
        }
        domBomb.style.width = `${bomb.size}px`
        domBomb.style.height = `${bomb.size}px`
        domBomb.style.left = `${bomb.x}px`
        domBomb.style.top = `${bomb.y}px`

        domBomb.style.display = 'block'
        gameContainer.appendChild(domBomb)

        // Sound for bomb
        placeBomb.play()
        tickingBomb.play()
    })
}

export function clearBombs(bombs) {
    bombs.forEach(bomb => {
        tickingBomb.pause()
        tickingBomb.currentTime = 0

        document.getElementById(bomb.name).remove()    // black version
        if (document.getElementById(bomb.name)) {
            document.getElementById(bomb.name).remove()    // orange version, doesn't always get created at early explosion
        }
    })
}