import { makeWalls, makeLevelMap, createPlayer } from "./initialize.js";
import { clearTempsState, getNarrowState, state } from "../bm-server-shared/state.js";
import { interval, speed } from "../bm-server-shared/config.js";
import { broadcast, heldInputs } from "../ws-server.mjs";

export let bounds;
export let levelMap;                    // for placing elements, wall collapses
export let powerUpMap;                  // powerups on different map

export const bombs = new Map();         // for player collisions
export const bombTime = 2500;
export const flames = new Map();        // for player collisions
export const timedEvents = new Map();
export const playerNames = [];

//export let finish;
let gameLost;
let gameIntervalId;

export function nextLevel() {
    //state.level++;
    state.solidWalls = [];
    state.weakWalls.clear();
    bombs.clear();
    flames.clear();
    timedEvents.clear();
    state.powerups.clear();
    stopGame();
};

export function startSequence(clients) {    // (playerName = "", id = 1) 
    state.players.length = 0;

    clients.values().forEach((c) => {
        state.players.push(createPlayer(c.nickname, c.id));     // bomb ownership breaks (no collision until player is away from it)
        playerNames.push(c.nickname);
    })

    bounds = { left: 0, right: 650, top: 0, bottom: 550, width: 650, height: 550 };
    levelMap = makeLevelMap();
    powerUpMap = makeLevelMap();
    makeWalls(state.level);

    // broadcast state to start off game
    broadcast({ type: "startgame", payload: state });
    runGame();
}

export function setGameLost() {
    gameLost = true;
}

function runGame() {
    gameIntervalId = setInterval(gameLoop, interval);

    function gameLoop(timestamp) {
        if (!gameLost) {
            state.players.forEach(p => {
                const input = heldInputs.get(p.id);
                p.movePlayer(speed, input);
                input.bomb = false;
            })

            // broadcast only updates to state (no solidWalls, no surroundingWalls, no weakWalls, no powerups)
            broadcast({ type: "gamestate", payload: getNarrowState(state) });
            clearTempsState();
        }
    };
};

function stopGame() {
    if (gameIntervalId) {
        clearInterval(gameIntervalId);
        gameIntervalId = null;
    }
}