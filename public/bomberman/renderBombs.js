import { playSound } from './sounds.js'


export function drawBombs(bombs) {
    const gameContainer = document.getElementById('game')
    if (!gameContainer) return
    bombs.forEach(bomb => {
        const domBomb = document.createElement('div')

        domBomb.id = bomb.name
        domBomb.classList.add('bomb')
        if (bomb.glowing) {
            domBomb.classList.add('glowing')
            playSound('explosion')
        }
        domBomb.style.width = `${bomb.size}px`
        domBomb.style.height = `${bomb.size}px`
        domBomb.style.left = `${bomb.x}px`
        domBomb.style.top = `${bomb.y}px`

        domBomb.style.display = 'block'
        gameContainer.appendChild(domBomb)
        playSound('placeBomb')
        //playSound('tickingBomb')  // don't play this annoying sound
    })
}

export function clearBombs(bombs) {
    bombs.forEach(bomb => {
        //stopSound('tickingBomb')  // isn't being played

        document.getElementById(bomb.name).remove()    // black version
        if (document.getElementById(bomb.name)) {
            document.getElementById(bomb.name).remove()    // orange version, doesn't always get created at early explosion
        }
    })
}