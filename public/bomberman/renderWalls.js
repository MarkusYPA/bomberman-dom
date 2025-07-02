import { Timer } from './timerClient.js'
import { clientEvents } from './runGame.js'
import { currentlyPlaying, playSound } from './sounds.js'

function generalWallAttributes(domWall, wall) {
    domWall.classList.add('wall')
    domWall.style.position = 'absolute'
    domWall.style.width = `${wall.size}px`
    domWall.style.height = `${wall.size}px`
    domWall.style.left = `${wall.x}px`
    domWall.style.top = `${wall.y}px`
}

export function drawSolidWalls(walls) {
    walls.forEach(wall => {
        const domWall = document.createElement('div')
        domWall.classList.add(`level-${wall.level}`, 'solid')
        generalWallAttributes(domWall, wall)

        document.getElementById('game').appendChild(domWall)
    })
}

export function drawWeakWalls(walls) {
    walls.forEach(wall => {
        const domWall = document.createElement('div')
        domWall.classList.add(`level-${wall.level}`, 'weak')
        domWall.id = wall.id
        generalWallAttributes(domWall, wall)
        document.getElementById('game').appendChild(domWall)
    })
}

let timedCount = 0

export function collapseWeakWall(id, timedout = false) {
    const targetWall = document.getElementById(id)
    if (!targetWall) return

    if (timedout) {
        // Remove immediately, no animation or sound
        targetWall.remove()
        return
    }

    const countNow = timedCount
    const timedCollapse = new Timer(() => {
        targetWall.remove()
        clientEvents.delete(`collapse${countNow}`)
    }, 500)
    clientEvents.set(`collapse${countNow}`, timedCollapse)
    timedCount++
    targetWall.classList.add('burning')
    if (!currentlyPlaying['wallBreak']) {
        playSound('wallBreak')
    }
}