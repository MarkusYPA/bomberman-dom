import { Timer } from "./timerClient.js";
import { clientEvents } from "./runGame.js";
import { gridStep, halfStep } from "../shared/config.js";

let timedCount = 0;

export function drawFlames(flames) {
const gameContainer = document.getElementById("game");
if (!gameContainer) return;
    flames.forEach((flame) => {
        switch (flame.direction) {
            case 'H':
                drawHorizontalFlame(flame, gameContainer);
                break;
            case 'V':
                drawVerticalFlame(flame, gameContainer);
                break;
            case 'L':
                drawLeftFlameEnd(flame, gameContainer);
                break;
            case 'R':
                drawRightFlameEnd(flame, gameContainer);
                break;
            case 'U':
                drawUpFlameEnd(flame, gameContainer);
                break;
            case 'D':
                drawDownFlameEnd(flame, gameContainer);
                break;
            default:
                console.log("Bad flame direction:", flame)
                break;
        }
    });
}

function generalFlameAttributes(domFlame, flame) {
    domFlame.classList.add("flame");
    domFlame.style.display = "block";                   // is this necessary?
    domFlame.style.left = `${flame.x}px`;
    domFlame.style.top = `${flame.y}px`;
}

function removeDomFlame(domFlame, flame) {
    const countNow = timedCount;
    const timedBurn = new Timer(() => {
        domFlame.remove();
        clientEvents.delete(`flame${flame.direction}${countNow}`)
    }, 500);
    clientEvents.set(`flame${flame.direction}${countNow}`, timedBurn)
    timedCount++;
}

function drawHorizontalFlame(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("horizontal");               // update css
    domFlame.style.width = `${gridStep}px`;
    domFlame.style.height = `${halfStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
};

function drawVerticalFlame(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("vertical");
    domFlame.style.width = `${halfStep}px`;
    domFlame.style.height = `${gridStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
}


function drawLeftFlameEnd(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("left");
    domFlame.style.width = `${gridStep}px`;
    domFlame.style.height = `${halfStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
}

function drawRightFlameEnd(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("right");
    domFlame.style.width = `${gridStep}px`;
    domFlame.style.height = `${halfStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
}


function drawUpFlameEnd(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("up");
    domFlame.style.width = `${halfStep}px`;
    domFlame.style.height = `${gridStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
}

function drawDownFlameEnd(flame, gameContainer) {
    const domFlame = document.createElement('div');
    generalFlameAttributes(domFlame, flame);
    domFlame.classList.add("down");
    domFlame.style.width = `${halfStep}px`;
    domFlame.style.height = `${gridStep}px`;
    gameContainer.appendChild(domFlame);

    removeDomFlame(domFlame, flame);
}

