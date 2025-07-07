export const bbstate = {
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
}

// Destructure to omit unwanted properties
export function getNarrowState() {
    const {
        solidWalls: _solidWalls,
        surroundingWalls: _surroundingWalls,
        weakWalls: _weakWalls,
        powerups: _powerups,
        ...narrowState
    } = bbstate
    return narrowState
}

export function clearTempsState() {
    bbstate.collapsingWalls = []
    bbstate.newBombs.clear()
    bbstate.removedBombs.clear()
    bbstate.newFlames.clear()
    bbstate.newItems.clear()
    bbstate.pickedItems = []
    bbstate.burningItems = []
}

// remove player from main game state  
export function removePlayer(id) {
    let index = 0
    let found = false
    bbstate.players.forEach((p, i) => {
        if (p.id === id) {
            index = i
            found = true
        }
    })
    if (found) bbstate.players.splice(index, 1)
}