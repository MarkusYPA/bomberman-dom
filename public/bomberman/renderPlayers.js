import { playerName, setThisPlayer } from "./runGame.js";
import { playerBombDeath, playerDeath, playerDeath2 } from "./sounds.js";

const gameContainer = document.getElementById("game");
const domPlayers = new Map();

// first draw, adding dom elements
export function addPlayers(players) {
    players.forEach(player => {
        const domPlayer = document.createElement("div");

        domPlayer.id = player.name;
        domPlayer.classList.add("player", `id${player.id}`);
        domPlayer.style.width = `${player.size}px`;
        domPlayer.style.height = `${player.size}px`;
        domPlayer.style.position = 'absolute';
        domPlayer.style.transform = `translate(${player.x}px, ${player.y}px)`;

        gameContainer.appendChild(domPlayer);
        domPlayers.set(player.name, domPlayer);
    });
}

export function updatePlayers(players) {

    players.forEach(player => {
        if (player.name === playerName) {
            setThisPlayer(player);
        }

        const p = domPlayers.get(player.name);

        p.style.transform = `translate(${player.x}px, ${player.y}px)`;
        if (!player.vulnerable) {
            p.classList.add("invulnerable");
        } else {
            p.classList.remove("invulnerable")
        }

        if (player.left) {
            p.classList.add("left");
        } else {
            p.classList.remove("left")
        }

        if (player.dead) {
            if (!p.classList.contains("dead")) {
                if (player.killer === "bomb") playerBombDeath.play();
                if (player.killer === "enemy1") playerDeath.play();
                if (player.killer === "enemy2") playerDeath2.play();
            }
            p.classList.add("dead");
        } else {
            p.classList.remove("dead")
        }
    })
}

export function removePlayers(players) {
    players.forEach(player => {
        domPlayers.delete(player.name);
    })
}