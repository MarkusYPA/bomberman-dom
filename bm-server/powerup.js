import { powerUpMap, timedEvents } from './game.js'
import { Timer } from './timer.js'
import { state } from '../bm-server-shared/state.js'
import { halfStep } from '../bm-server-shared/config.js'

let timedCount = 0

class PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        this.x = x + halfStep - (size / 2)
        this.y = y + halfStep - (size / 2)
        this.size = size
        this.row = row
        this.col = col

        this.name = nameOf
    };

    checkCollision(playerX, playerY, playerSize) {
        return (!
        (
            playerX + playerSize < this.x ||
            playerX > this.x + this.size ||
            playerY + playerSize < this.y ||
            playerY > this.y + this.size
        )
        )
    };

    pickUp() {
        powerUpMap[this.row][this.col] = ''
        state.powerups.delete(this.name)
    }

    burn() {
        state.burningItems.push(this.name)
        const countNow = timedCount
        const timedCollapse = new Timer(() => {
            this.pickUp()
            timedEvents.delete(`burnPowerUp${countNow}`)
        }, 500)
        timedEvents.set(`burnPowerUp${countNow}`, timedCollapse)
        timedCount++
    }
};

export class BombUp extends PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        super(x, y, size, nameOf, row, col)
        this.powerType = 'bomb'
    };
    pickUp() {
        super.pickUp()
    };
};

export class FlameUp extends PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        super(x, y, size, nameOf, row, col)
        this.powerType = 'flame'
    };
    pickUp() {
        super.pickUp()
    };
};

export class SpeedUp extends PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        super(x, y, size, nameOf, row, col)
        this.powerType = 'speed'
    };
    pickUp() {
        super.pickUp()
    };
};

export class LifeUp extends PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        super(x, y, size, nameOf, row, col)
        this.powerType = 'life'
    };
    pickUp() {
        super.pickUp()
    };
};

export class BombClip extends PowerUp {
    constructor(x, y, size, nameOf, row, col) {
        super(x, y, size, nameOf, row, col)
        this.powerType = 'bombclip'
    };
    pickUp() {
        super.pickUp()
    };
};