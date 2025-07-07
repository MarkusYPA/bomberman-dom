import { Timer } from './timerClient.js'
import { clientEvents } from './bomberbear-render.js'
import { playSound } from './sounds.js'

function generalItemAttributes(domItem, item) {
    domItem.classList.add('powerup')
    domItem.style.position = 'absolute'
    domItem.style.width = `${item.size}px`
    domItem.style.height = `${item.size}px`
    domItem.style.left = `${item.x}px`
    domItem.style.top = `${item.y}px`
    domItem.id = item.name
}

export function drawPowerUps(items) {
    items.forEach(item => {
        const domItem = document.createElement('div')
        generalItemAttributes(domItem, item)

        if (item.powerType === 'bomb') {
            domItem.classList.add('bombup')
        }

        if (item.powerType === 'flame') {
            domItem.classList.add('flameup')
        }

        if (item.powerType === 'speed') {
            domItem.classList.add('speedup')
        }

        if (item.powerType === 'life') {
            domItem.classList.add('lifeup')
        }

        /* if (item.powerType === 'bombclip') {
            domItem.classList.add('bombclip')
        } */

        if (item.powerType === 'wallclip') {
            domItem.classList.add('wallclip')
        }

        document.getElementById('game').appendChild(domItem)
    })
}

let timedCount = 0

export function pickUpItem(id) {
    const timedout = String(id).endsWith('timedout')
    if (timedout) id = id.slice(0, -8)
        
    const targetItem = document.getElementById(id)

    if (targetItem && !timedout) {
        if (id.startsWith('bombUp') || id.startsWith('speedUp') || id.startsWith('wallClip')) {
            playSound('bombUp')
        } else if (id.startsWith('flameUp') || id.startsWith('lifeUp')) {
            playSound('flameUp')
        } else {
            playSound('flameUp')
        }
    }
    
    if (targetItem) targetItem.remove()
    else console.log('item', id, 'not found')
}

export function burnItem(id) {
    const timedout = String(id).endsWith('timedout')
    if (timedout) id = id.slice(0, -8)
        
    const targetItem = document.getElementById(id)

    if (!targetItem) return

    if (timedout) {
        // Remove immediately, no animation or sound
        targetItem.remove()
        return
    }

    targetItem.classList.add('burn')
    const countNow = timedCount
    const timedCollapse = new Timer(() => {
        targetItem.remove()
        clientEvents.delete(`burnPowerUpElement${countNow}`)
    }, 500)
    clientEvents.set(`burnPowerUpElement${countNow}`, timedCollapse)
    timedCount++
}
