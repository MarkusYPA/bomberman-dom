import { speed } from "./config.mjs";


export default class Game {
    constructor() {
        this.players = {}; // id -> { nickname, x, y }
    }

    addPlayer(id, nickname) {
        if (Object.keys(this.players).length >= 4) return false;
        this.players[id] = { nickname, x: 0, y: 0 };
        return true;
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, held) {
        const p = this.players[id];
        if (!p) return;
        let dx = 0, dy = 0;
        if (held.has("up")) dy -= 1;
        if (held.has("down")) dy += 1;
        if (held.has("left")) dx -= 1;
        if (held.has("right")) dx += 1;
        // Normalize diagonal speed
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }
        p.x += dx * speed;
        p.y += dy * speed;

        // Simple clamping to the bounds of the box
        const minX = 0;
        const minY = 0;
        const maxX = (500 - 40) / 20;
        const maxY = (400 - 40) / 20;

        p.x = Math.max(minX, Math.min(maxX, p.x));
        p.y = Math.max(minY, Math.min(maxY, p.y));
    }
    getState() {
        return this.players;
    }
}
