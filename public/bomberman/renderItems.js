import { Timer } from './timerClient.js'
import { clientEvents } from './runGame.js'

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
            domItem.dataset.sound = 'assets/sfx/bombUp.mp3' // Store sound path in dataset
        }

        if (item.powerType === 'flame') {
            domItem.classList.add('flameup')
            domItem.dataset.sound = 'assets/sfx/flameUp.mp3'
        }

        if (item.powerType === 'speed') {
            domItem.classList.add('speedup')
            domItem.dataset.sound = 'assets/sfx/bombUp.mp3' // Using bombUp sound as placeholder
        }

        if (item.powerType === 'life') {
            domItem.classList.add('lifeup')
            domItem.dataset.sound = 'assets/sfx/flameUp.mp3' // Using flame sound
        }

        if (item.powerType === 'bombclip') {
            domItem.classList.add('bombclip')
            domItem.dataset.sound = 'assets/sfx/bombUp.mp3' // Using bombUp sound
        }

        document.getElementById('game').appendChild(domItem)
    })
}

let timedCount = 0

export function pickUpItem(id) {
    const targetItem = document.getElementById(id)

    // Play sound if present
    if (targetItem && targetItem.dataset.sound) {
        const audio = new Audio(targetItem.dataset.sound)
        audio.play()
    }
    targetItem.remove()
}

export function burnItem(id) {
    const targetItem = document.getElementById(id)

    targetItem.style.backgroundImage = 'url("assets/images/burn.svg")'
    const countNow = timedCount
    const timedCollapse = new Timer(() => {
        targetItem.remove()
        clientEvents.delete(`burnPowerUpElement${countNow}`)
    }, 500)
    clientEvents.set(`burnPowerUpElement${countNow}`, timedCollapse)
    timedCount++
}

/* export function drawNewItems(items) {

} */