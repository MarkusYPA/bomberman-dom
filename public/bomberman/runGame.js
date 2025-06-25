import { clientGameState } from "../shared/state.js";
import { finishLevel, walkingSound } from "./sounds.js";
import { makeTextBar, resizeGameContainer } from "./initializeClient.js";
import { drawSolidWalls, drawWeakWalls, collapseWeakWall } from "./renderWalls.js";
import { drawPowerUps, pickUpItem, burnItem } from "./renderItems.js";
import { drawBombs, clearBombs } from "./renderBombs.js";
import { drawFlames } from "./renderFlames.js"
import { addPlayers, updatePlayers } from "./renderPlayers.js";
import { listenPlayerInputs } from "./inputListeners.js";
import { Timer } from "./timerClient.js";
import { levelMusic, gameLost1, gameLost2 } from "./sounds.js";
import { congrats, crowdClapCheer } from "./sounds.js";

export let playerName = "Player1";
export let thisPlayer;
let levelinfo;
let livesinfo;
let oldlives;
let finished = false;
export const clientEvents = new Map();
let timedCount = 0;
//let currentMusic;
let isMoving = false;
let wasMoving = false;

// update local player info (for lives mostly)
export function setThisPlayer(player) {
    thisPlayer = player;
}

// Walking sounds controlled from inputlisteners
export function setMoving(moving) {
    wasMoving = isMoving;
    isMoving = moving;

    if (isMoving && !wasMoving) {
        walkingSound.play();
    } else if (!isMoving && wasMoving) {
        walkingSound.pause();
        walkingSound.currentTime = 0;
    }
}

export function nextLevel() {

    if (clientGameState.level >= 5) {
        toggleEndScreen();
        congrats.play();
        congrats.onended = () => {
            crowdClapCheer.play();
        };
        return;
    }

    document.getElementById("game").replaceChildren();
    startSequenceClient();
    updateLevelInfo(clientGameState.level);
    updateLivesInfo(thisPlayer.lives);
    toggleFinished();
};


export function restartGame() {
    location.reload();
};

export function toggleFinished() {
    finished = !finished;
    //scoreTime = window.performance.now() - timeToSubtract;
}

export function updateLivesInfo(lives) {
    oldlives = lives;
    let livesText = '';
    for (let i = 0; i < lives; i++) {
        livesText += `❤️`;
    };
    livesinfo.textContent = 'Lives: ' + livesText;
}

function updateLevelInfo(level) {
    levelinfo.textContent = `Level: ${level}`
}

function toggleEndScreen() {
    const victoryScreen = document.getElementById("victory");
    let msg = document.getElementById("victory-message");
    msg.textContent = `You finished with ${thisPlayer.lives} lives remaining, you absolute legend!`;
    victoryScreen.style.display == "flex" ? victoryScreen.style.display = "none" : victoryScreen.style.display = "flex";
}

export function startSequenceClient() {
    thisPlayer = clientGameState.players[0];
    playerName = thisPlayer.name;

    //const gameContainer = document.getElementById("game");

    let tasks = [
        () => { resizeGameContainer() },
        () => {
            [levelinfo, livesinfo] = makeTextBar();
            updateLivesInfo(thisPlayer.lives);
        },
        () => { document.body.classList.add("grey"); listenPlayerInputs(); },
        /* () => {
            gameContainer.style.visibility = "visible"; // probably not necessary
        }, */

        // Render dom elements
        () => { drawSolidWalls(clientGameState.solidWalls); drawSolidWalls(clientGameState.surroundingWalls), drawWeakWalls(clientGameState.weakWalls) },
        () => { drawPowerUps(clientGameState.powerups); addPlayers(clientGameState.players) },
        () => { runGame(); },
    ];

    function processNextTask() {
        if (tasks.length > 0) {
            let task = tasks.shift();
            task();
            requestAnimationFrame(processNextTask);
        }
    }

    requestAnimationFrame(processNextTask);
}

function runGame() {
    requestAnimationFrame(gameLoop);

    function gameLoop(timestamp) {
        if (clientGameState.finishing) finishLevel.play();

        if (clientGameState.finished === true) {
            clientGameState.finished = false;     // client should not write to state: handle with ws
            nextLevel();
            return
        };

        updatePlayers(clientGameState.players);
        if (oldlives !== thisPlayer.lives) {
            updateLivesInfo(thisPlayer.lives);
            if (thisPlayer.lives === 0) {
                loserScreen();
            }
        }

        if (clientGameState.collapsingWalls.length > 0) {
            clientGameState.collapsingWalls.forEach(id => collapseWeakWall(id))
            clientGameState.collapsingWalls.length = 0;     // client should not write to state: handle with ws
        }

        if (clientGameState.pickedItems.length > 0) {
            clientGameState.pickedItems.forEach(name => pickUpItem(name))
            clientGameState.pickedItems.length = 0;     // client should not write to state: handle with ws
        }

        if (clientGameState.burningItems.length > 0) {
            clientGameState.burningItems.forEach(name => burnItem(name))
            clientGameState.burningItems.length = 0;     // client should not write to state: handle with ws
        }

        if (clientGameState.newFlames.size > 0) {
            drawFlames(clientGameState.newFlames);
            clientGameState.newFlames.clear();     // client should not write to state: handle with ws
        }

        if (clientGameState.newBombs.size > 0) {
            drawBombs(clientGameState.newBombs);
            clientGameState.newBombs.clear();     // client should not write to state: handle with ws
        }

        if (clientGameState.removedBombs.size > 0) {
            clearBombs(clientGameState.removedBombs);
            clientGameState.removedBombs.clear();     // client should not write to state: handle with ws
        }

        // requestAnimationFrame() always runs callback with 'timestamp' argument (milliseconds since the page loaded)
        requestAnimationFrame(gameLoop);
    }
};

function loserScreen() {
    const countNow = timedCount;
    const timedResurrection = new Timer(() => {

        const gameOverMenu = document.getElementById("game-over-menu");
        const gifs = ["assets/images/loser1.gif", "assets/images/loser2.gif"];
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        gameOverMenu.style.background = `rgba(0, 0, 0, 0.8) url("${randomGif}") no-repeat center center`;
        gameOverMenu.style.backgroundSize = "cover";
        gameOverMenu.style.display = "block";

        levelMusic.forEach(track => {
            track.pause();
            track.currentTime = 0;
        });

        if (randomGif === "assets/images/loser1.gif") {
            gameLost1.play(); // sad-trombone for loser1.gif
        } else {
            gameLost2.play(); // sinister-laugh for loser2.gif
        }

        clientEvents.delete(`resurrection${countNow}`)
    }, 2000)
    clientEvents.set(`resurrection${countNow}`, timedResurrection)
    timedCount++;
}
