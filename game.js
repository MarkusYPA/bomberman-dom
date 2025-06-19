class Game {
    constructor() {
        this.players = {};
    }

    addPlayer(id) {
        this.players[id] = { x: 50, y: 50 };
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, input) {
        const player = this.players[id];
        if (!player) return;
        const speed = 5;
        switch (input) {
            case "up": player.y -= speed; break;
            case "down": player.y += speed; break;
            case "left": player.x -= speed; break;
            case "right": player.x += speed; break;
        }
    }

    getState() {
        return this.players;
    }
}

module.exports = Game;
