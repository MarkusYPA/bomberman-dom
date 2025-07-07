const audioContext = new (window.AudioContext || window.webkitAudioContext)()

const soundFiles = {
    menuMusic: { url: 'assets/sfx/menuMusic.mp3', loop: true, volume: 1 },
    walkingSound: { url: 'assets/sfx/playerWalking.mp3', loop: true, volume: 0.6 },
    playerDeath: { url: 'assets/sfx/playerDeath.mp3', volume: 0.3 },
    playerDeath2: { url: 'assets/sfx/playerDeath2.mp3', volume: 0.3 },
    playerBombDeath: { url: 'assets/sfx/playerBombDeath.mp3', volume: 0.5 },
    placeBomb: { url: 'assets/sfx/placeBomb.mp3' },
    tickingBomb: { url: 'assets/sfx/tickingBomb.mp3', loop: true },
    wallBreak: { url: 'assets/sfx/wallBreak.mp3', volume: 0.6 },
    finishLevel: { url: 'assets/sfx/finishLevel.mp3' },
    gameLost1: { url: 'assets/sfx/sad-trombone.mp3' },
    gameLost2: { url: 'assets/sfx/sinister-laugh.mp3' },
    congrats: { url: 'assets/sfx/congratulations.mp3' },
    crowdClapCheer: { url: 'assets/sfx/cheering-and-clapping-crowd.mp3' },
    level1music: { url: 'assets/sfx/level1music.mp3', loop: true },
    level2music: { url: 'assets/sfx/level2music.mp3', loop: true },
    level3music: { url: 'assets/sfx/level3music.mp3', loop: true },
    level4music: { url: 'assets/sfx/level4music.mp3', loop: true },
    level5music: { url: 'assets/sfx/level5music.mp3', loop: true },

    explosion: { url: 'assets/sfx/explosion.mp3'},
    bombUp: { url: 'assets/sfx/bombUp.mp3'},
    flameUp: { url: 'assets/sfx/flameUp.mp3'},
}

const soundBuffers = {}
export const currentlyPlaying = {}

async function loadSound(name, { url }) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    soundBuffers[name] = await audioContext.decodeAudioData(arrayBuffer)
}

export async function loadAllSounds() {
    await Promise.all(Object.entries(soundFiles).map(([name, opts]) => loadSound(name, opts)))
}

// Play a sound by name. Returns the source node for further control (e.g., stop).
export function playSound(name, { loop, volume } = {}) {
    const buffer = soundBuffers[name]
    if (!buffer) return

    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = loop !== undefined ? loop : !!soundFiles[name].loop

    const gainNode = audioContext.createGain()
    gainNode.gain.value = volume !== undefined ? volume : (soundFiles[name].volume ?? 1)

    source.connect(gainNode).connect(audioContext.destination)
    source.start(0)

    // Track looping sounds so they can be stopped
    if (source.loop) {
        stopSound(name)
        currentlyPlaying[name] = source
        source.onended = () => { if (currentlyPlaying[name] === source) delete currentlyPlaying[name] }
    }

    return source
}

// Stop a looping sound by name
export function stopSound(name) {
    if (currentlyPlaying[name]) {
        currentlyPlaying[name].stop()
        delete currentlyPlaying[name]
    }
}

// Example: playSound('menuMusic'), stopSound('menuMusic')
// For level music: playSound('level1music'), etc.

export const levelMusicNames = [
    'level1music',
    'level2music',
    'level3music',
    'level4music',
    'level5music'
]
