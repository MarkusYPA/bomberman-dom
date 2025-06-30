export const state = {
    solidWalls: [],             // for player collisions
    surroundingWalls: [],       // no collisions
    weakWalls: new Map(),       // for player collisions
    collapsingWalls: [],        // for rendering
    newBombs: new Map(),        // for rendering
    removedBombs: new Map(),    // for rendering
    newFlames: new Map(),       // for rendering
    powerups: new Map(),
    pickedItems: [],            // for rendering
    burningItems: [],           // for rendering
    players: [],

    level: 1,
}

// Destructure to omit unwanted properties
export function getNarrowState() {
    const {
        solidWalls: _solidWalls,
        surroundingWalls: _surroundingWalls,
        weakWalls: _weakWalls,
        powerups: _powerups,
        ...narrowState
    } = state
    return narrowState
}

export function clearTempsState() {
    state.collapsingWalls = []
    state.newBombs.clear()
    state.removedBombs.clear()
    state.newFlames.clear()
    state.pickedItems = []
    state.burningItems = []
}

// remove player from main game state  
export function removePlayer(id) {
    let index = 0
    state.players.forEach((p, i) => {
        if (p.id === id ) {
            index = i
        }
    })
    state.players.splice(index, 1)
}