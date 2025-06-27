import { gridStep, mult } from '../bm-server-shared/config.js'

class Wall {
    constructor(x, y, size) {
        this.x = x
        this.y = y
        this.size = size
    };

    checkCollision(playerX, playerY, playerSize, slowDown = 1, collisions = 2) {
        if (playerX + playerSize < this.x || playerX > this.x + this.size || playerY + playerSize < this.y || playerY > this.y + this.size) {
            // No collision: player is safely outside on at least one side, return input values
            return [playerX, playerY]
        } else {
            // find shortest direction out of collision
            const diffs = {
                x1: this.x - (playerX + playerSize),  // this left to player right
                x2: (this.x + this.size) - playerX,   // this right to player left
                y1: this.y - (playerY + playerSize),  // this top to player bottom
                y2: (this.y + this.size) - playerY    // this bottom to player top
            }

            // get key and value of item with lowest abs value
            let fromSmallest = Object.entries(diffs).sort(([, v1], [, v2]) => Math.abs(v1) - Math.abs(v2))

            // slip around corner
            if (
                slowDown == 1 &&    // one button down
                collisions == 1 &&  // one wall hit
                fromSmallest[1] &&
                Math.abs(fromSmallest[1][1]) < gridStep * 0.3 &&   // second smallest value is small = close to corner
                fromSmallest[0][0].startsWith('x') != fromSmallest[1][0].startsWith('x')
            ) {
                // don't move the player the full distance out of the wall, for smoothness
                if (fromSmallest[0][0].startsWith('x')) {
                    return [playerX + Math.sign(fromSmallest[0][1]) * mult * 2, playerY + Math.sign(fromSmallest[1][1]) * mult * 2]
                } else {
                    return [playerX + Math.sign(fromSmallest[1][1]) * mult * 2, playerY + Math.sign(fromSmallest[0][1]) * mult * 2]
                }
            }

            let lowestItems = fromSmallest[0]

            // modify inputs to place player just outside wall
            if (lowestItems[0].startsWith('x')) {
                return [playerX + lowestItems[1], playerY]
            } else {
                return [playerX, playerY + lowestItems[1]]
            };
        };
    };
};

export class SolidWall extends Wall {
    constructor(x, y, size, level) {
        super(x, y, size)
        this.wallType = 'solid'
        this.level = level
    };
};

export class WeakWall extends Wall {
    constructor(x, y, size, level, name) {
        super(x, y, size)
        this.wallType = 'weak'
        this.level = level
        this.id = name         // id is passed to dom element and used in destruction
    };
};
