export const clientGameState = {
    solidWalls: [],             // for player collisions
    surroundingWalls: [],       // no collisions
    weakWalls: new Map(),       // for player collisions
    powerups: new Map(),

    collapsingWalls: [],        // for rendering
    newBombs: new Map(),        // for rendering
    removedBombs: new Map(),    // for rendering
    newFlames: new Map(),       // for rendering    
    newItems: new Map(),
    pickedItems: [],            // for rendering
    burningItems: [],           // for rendering
    players: [],

    level: 1,

    points: {}, // id: points tally
}

/**
 * Updates the clientGameState with incoming update object.
 * @param {Object} update - The incoming update object.
 */
export function updateClientGameState(update) {
    // Overwrite if incoming array is not empty
    if (Array.isArray(update.solidWalls) && update.solidWalls.length > 0) {
        clientGameState.solidWalls = [...update.solidWalls]
    }
    if (Array.isArray(update.surroundingWalls) && update.surroundingWalls.length > 0) {
        clientGameState.surroundingWalls = [...update.surroundingWalls]
    }

    // Convert incoming object to Map for weakWalls
    if (update.weakWalls && typeof update.weakWalls === 'object' && Object.keys(update.weakWalls).length > 0) {
        clientGameState.weakWalls = new Map(Object.entries(update.weakWalls))
    }

    // Convert incoming object to Map for powerups
    if (update.powerups && typeof update.powerups === 'object' && Object.keys(update.powerups).length > 0) {
        clientGameState.powerups = new Map(Object.entries(update.powerups))
    }
    if (update.newItems && typeof update.newItems === 'object' && Object.keys(update.newItems).length > 0) {
        clientGameState.newItems = new Map(Object.entries(update.newItems))
    }

    // Always overwrite players
    if (Array.isArray(update.players)) {
        clientGameState.players = [...update.players]
    }

    // Add non-duplicate elements to unique string arrays
    ['collapsingWalls', 'pickedItems', 'burningItems'].forEach(key => {
        if (Array.isArray(update[key])) {
            update[key].forEach(item => {
                if (!clientGameState[key].includes(item)) {
                    clientGameState[key].push(item)
                }
            })
        }
    });

    // Add non-duplicate entries to Maps with unique string keys
    ['newBombs', 'removedBombs', 'newFlames'].forEach(key => {
        if (update[key] && typeof update[key] === 'object') {
            for (const [k, v] of Object.entries(update[key])) {
                if (!clientGameState[key].has(k)) {
                    clientGameState[key].set(k, v)
                }
            }
        }
    })
}

// resets values in clientGameState
export function clearClientGameState() {
    clientGameState.solidWalls = []
    clientGameState.surroundingWalls = []
    clientGameState.weakWalls = new Map()
    clientGameState.collapsingWalls = []
    clientGameState.newBombs = new Map()
    clientGameState.removedBombs = new Map()
    clientGameState.newFlames = new Map()
    clientGameState.powerups = new Map()
    clientGameState.newItems = new Map()
    clientGameState.pickedItems = []
    clientGameState.burningItems = []
    clientGameState.players = []
    clientGameState.level = 1
}

export function setPoints(points) {
    clientGameState.points = points
}