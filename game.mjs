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

    handleInput(id, dir) {
        const p = this.players[id];
        if (!p) return;
        if (dir === "up") p.y -= 1;
        if (dir === "down") p.y += 1;
        if (dir === "left") p.x -= 1;
        if (dir === "right") p.x += 1;
    }

    getState() {
        return this.players;
    }
}
