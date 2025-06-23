import { speed } from "./config.mjs";


export default class Game {
    constructor() {
        this.players = {}; // id -> { nickname, x, y }
        // Game boundary constants
        this.minX = 0;
        this.minY = 0;
        this.maxX = (500 - 40) / 20;
        this.maxY = (400 - 40) / 20;
        this.corners = [
            { x: this.minX, y: this.minY }, // Top-left
            { x: this.maxX, y: this.minY }, // Top-right
            { x: this.minX, y: this.maxY }, // Bottom-left
            { x: this.maxX, y: this.maxY }  // Bottom-right
        ];
    }

    addPlayer(id, nickname) {
        if (Object.keys(this.players).length >= 4) return false;
        // Place each player in a different corner based on join order
        const { x, y } = this.corners[id];
        this.players[id] = { nickname, x, y };
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
        p.x = Math.max(this.minX, Math.min(this.maxX, p.x));
        p.y = Math.max(this.minY, Math.min(this.maxY, p.y));
    }
    getState() {
        return this.players;
    }
}
