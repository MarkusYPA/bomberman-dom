//import { Finish } from "../finish.js";
import { setUpGame, makeWalls, makeLevelMap } from "./initialize.js";
//import { inputs } from "../shared/inputs.js";
import { state } from "../bm-server-shared/state.js";
import { gridStep, interval, mult, speed } from "../bm-server-shared/config.js";
import { broadcast, heldInputs } from "../ws-server.mjs";

export let bounds;
export let levelMap;                    // for placing elements, wall collapses
export let powerUpMap;                  // powerups on different map

export const bombs = new Map();         // for player collisions
export const bombTime = 2500;
export const flames = new Map();        // for player collisions
export const timedEvents = new Map();

//export let finish;
let gameLost;
let gameIntervalId;

export function nextLevel() {
    state.level++;
    state.solidWalls = [];
    state.weakWalls.clear();
    bombs.clear();
    flames.clear();
    timedEvents.clear();
    state.powerups.clear();
    stopGame();
};

export function startSequence(playerName = "", id = 1) {
    state.players.length = 0;
    state.players.push(setUpGame(playerName, id));  // This will be a loop, adding several players

    bounds = { left: 0, right: 650, top: 0, bottom: 550, width: 650, height: 550 };
    levelMap = makeLevelMap();
    powerUpMap = makeLevelMap();
    makeWalls(state.level);

    // broadcast state to start off game
    //console.log("wws:", state.weakWalls)
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
                //p.movePlayer(speed, inputs);
                try {
                    p.movePlayer(speed, heldInputs.get(p.id));
                } catch (error) {
                    console.log(heldInputs, p.id, heldInputs.get(p.id))
                    console.log(error)
                    return;
                }
            })
        }
    };
};

function stopGame() {
    if (gameIntervalId) {
        clearInterval(gameIntervalId);
        gameIntervalId = null;
    }
}