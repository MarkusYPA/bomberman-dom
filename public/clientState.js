import { gameLoop } from "./client.js";

export const clientState = {};

export function updateGameState(currentState, newState) {
    // start requesting animation frames
    if (Object.keys(currentState).length === 0) {
        gameLoop();
    }

    for (const id in newState) {
        if (!currentState[id]) {
            // Add new player
            currentState[id] = newState[id];
        } else {
            // Update existing player properties
            const player = newState[id];
            for (const key in player) {
                currentState[id][key] = player[key];
            }
        }
    }
}
