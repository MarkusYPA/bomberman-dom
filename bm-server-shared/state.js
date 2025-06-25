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
    finishing: false,
    finished: false,
};