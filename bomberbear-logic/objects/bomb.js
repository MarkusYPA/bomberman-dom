import { Flame } from './flames.js'
import { bombs, bombTime, levelMap, flames, timedEvents, powerUpMap, playerNames } from '../bomberbear-logic.js'
import { Timer } from './timer.js'
import { bbstate } from '../bomberbear-state.js'
import { gridStep, halfStep, mult } from '../config.js'

let flameCounter = 0
let timedCount = 0

function isEdge(row, col) {
    return (row < 0 || row > 10 || col < 0 || col > 12)
};

function isWall(row, col) {
    return (
        row >= 0 && row <= 10 &&
        col >= 0 && col <= 12 &&
        levelMap[row][col] &&
        typeof levelMap[row][col] == 'string' &&
        (
            levelMap[row][col].startsWith('weakWall') ||
            levelMap[row][col] == 'solidWall'
        )
    )
};

function isBomb(row, col) {
    return (
        row >= 0 && row <= 10 &&
        col >= 0 && col <= 12 &&
        levelMap[row][col] &&
        Array.isArray(levelMap[row][col]) &&
        levelMap[row][col][0] == 'bomb'
    )
}

function isPowerUp(row, col) {
    return (
        row >= 0 && row <= 10 &&
        col >= 0 && col <= 12 &&
        powerUpMap[row][col] &&
        Array.isArray(powerUpMap[row][col]) &&
        (powerUpMap[row][col][0].startsWith('bombUp') ||
            powerUpMap[row][col][0].startsWith('flameUp') ||
            powerUpMap[row][col][0].startsWith('speedUp') ||
            powerUpMap[row][col][0].startsWith('lifeUp') ||
            //powerUpMap[row][col][0].startsWith('bombClip') ||
            powerUpMap[row][col][0].startsWith('wallClip'))
    )
}

function makeFlame(x, y, dir) {
    const fullOffset = mult * 30 - halfStep        // from corner of bomb to edge square: + half bomb size, - half square size 
    const smallOffset = mult * 30 - halfStep / 2

    flameCounter++
    const name = `flame${dir}${flameCounter}`
    let newFlame
    if (dir === 'H' || dir === 'L' || dir === 'R') {
        newFlame = new Flame(x + fullOffset, y + smallOffset, gridStep, halfStep, dir, name)
    }
    if (dir === 'V' || dir === 'U' || dir === 'D') {
        newFlame = new Flame(x + smallOffset, y + fullOffset, halfStep, gridStep, dir, name)
    }

    flames.set(name, newFlame)     // complete map for collisions
    bbstate.newFlames.set(name, newFlame)  // only track changes for rendering
    timeFlame(newFlame)
    return newFlame
}

// delete flame from map with delay
function timeFlame(flame) {
    const timedFlame = new Timer(() => {
        flame.active = false
        flames.delete(flame.name)
        timedEvents.delete(flame.name)
    }, 500)
    timedEvents.set(flame.name, timedFlame)
    timedCount++
}


export class Bomb {
    setValues(size, row, col, power) {
        // Align dropped bomb to grid
        this.mapCol = col
        this.mapRow = row
        this.x = this.mapCol * gridStep + halfStep - size / 2
        this.y = this.mapRow * gridStep + halfStep - size / 2
        this.size = size
        this.owners = {}
        playerNames.forEach(n => { // add all players as owners, each is removed when they don't collide 
            this.owners[n] = true
        })
        this.power = power
        this.bounds = { left: this.x, right: this.x + this.size, top: this.y, bottom: this.y + this.size }
        this.name = `bomb${this.mapCol}${this.mapRow}`
    }

    constructor(size = mult * 60, row = 0, col = 0, power = 1) {
        this.setValues(size, row, col, power)
        this.active = false
        this.glowing = false
    };

    drop(row, col, power) {
        this.setValues(this.size, row, col, power)
        this.active = true
        bombs.set(this.name, this)      // add bomb to map for collision checks
        bbstate.newBombs.set(this.name, this)
        levelMap[this.mapRow][this.mapCol] = ['bomb', this]  // store reference to level map

        this.countNow = timedCount
        const timedBomb = new Timer(() => {
            this.explode()
            timedEvents.delete(`bomb${this.countNow}`)
        }, bombTime)
        timedEvents.set(`bomb${this.countNow}`, timedBomb)
        timedCount++
    }

    // explodeEarly removes the original timer and triggers the explosion
    explodeEarly() {
        if (timedEvents.has(`bomb${this.countNow}`)) {
            timedEvents.get(`bomb${this.countNow}`).cancel()
            timedEvents.delete(`bomb${this.countNow}`)
        }

        // small delay
        const timedEarlyExplotion = new Timer(() => {
            this.explode()
            timedEvents.delete(`earlyexplosion${this.countNow}`)
        }, 80)
        timedEvents.set(`earlyexplosion${this.countNow}`, timedEarlyExplotion)
        timedCount++
    }

    explode() {
        this.glowing = true
        bbstate.newBombs.set(this.name, this)

        // Draw flames of explosion in the middle
        makeFlame(this.x, this.y, 'H')
        makeFlame(this.x, this.y, 'V')

        // More flames in four directions
        const fourDirs = [
            { name: 'right', going: true, coords: undefined },
            { name: 'left', going: true, coords: undefined },
            { name: 'down', going: true, coords: undefined },
            { name: 'up', going: true, coords: undefined },
        ]
        let [lastLeft, lastRight, lastUp, lastDown] = [undefined, undefined, undefined, undefined]

        for (let i = 1; i <= this.power; i++) {

            // In four directions: Stop flames at walls and edges, destroy weak walls, explode other bombs
            for (let j = 0; j < 4; j++) {
                switch (fourDirs[j].name) {
                case 'right':
                    fourDirs[j].coords = [this.mapRow, this.mapCol + i]
                    break
                case 'left':
                    fourDirs[j].coords = [this.mapRow, this.mapCol - i]
                    break
                case 'down':
                    fourDirs[j].coords = [this.mapRow + i, this.mapCol]
                    break
                case 'up':
                    fourDirs[j].coords = [this.mapRow - i, this.mapCol]
                    break
                }

                if (fourDirs[j].going) {
                    let foundWall = false
                    const dirRow = fourDirs[j].coords[0]
                    const dirCol = fourDirs[j].coords[1]

                    if (isWall(dirRow, dirCol)) {
                        if (levelMap[dirRow][dirCol].startsWith('weakWall')) {
                            this.destroyWall(dirRow, dirCol)
                        }
                        fourDirs[j].going = false
                        foundWall = true
                    };
                    if (isEdge(dirRow, dirCol)) {
                        fourDirs[j].going = false
                    };
                    if (isBomb(dirRow, dirCol)) {
                        const bomb = levelMap[dirRow][dirCol][1]
                        levelMap[dirRow][dirCol] = ''
                        bomb.explodeEarly()
                    };
                    if (!foundWall && isPowerUp(dirRow, dirCol)) {
                        const powerUp = powerUpMap[dirRow][dirCol][1]
                        powerUp.burn()
                        fourDirs[j].going = false
                    };
                };
            };

            // if still going, draw flames and save the most recent
            if (fourDirs[0].going) lastRight = makeFlame(this.x + gridStep * i, this.y, 'H')
            if (fourDirs[1].going) lastLeft = makeFlame(this.x - gridStep * i, this.y, 'H')
            if (fourDirs[2].going) lastDown = makeFlame(this.x, this.y + gridStep * i, 'V')
            if (fourDirs[3].going) lastUp = makeFlame(this.x, this.y - gridStep * i, 'V')

            // Mark flames as ends
            if (fourDirs[0].going && lastRight && i == this.power) {
                lastRight.direction = 'R'  // Does it update the one on the map too? Same reference?
            }
            if (fourDirs[1].going && lastLeft && i == this.power) {
                lastLeft.direction = 'L'
            }
            if (fourDirs[2].going && lastDown && i == this.power) {
                lastDown.direction = 'D'
            }
            if (fourDirs[3].going && lastUp && i == this.power) {
                lastUp.direction = 'U'
            }
        };

        // delay deleting bomb for a bit
        const timedExplotion = new Timer(() => {
            this.glowing = false
            this.active = false

            bbstate.removedBombs.set(this.name, this)
            bombs.delete(this.name)
            timedEvents.delete(`explosion${this.countNow}`)
            levelMap[this.mapRow][this.mapCol] = ''
        }, 500)
        timedEvents.set(`explosion${this.countNow}`, timedExplotion)
        timedCount++
    };

    destroyWall(row, col) {
        let name = levelMap[row][col]
        bbstate.collapsingWalls.push(name)

        const timedDeleteWall = new Timer(() => {
            bbstate.weakWalls.delete(name)
            levelMap[row][col] = ''
            timedEvents.delete(`deleteWall${this.countNow}`)
        }, 500)

        timedEvents.set(`deleteWall${this.countNow}`, timedDeleteWall)
        timedCount++
    };

    checkCollision(playerX, playerY, playerSize) {
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
            let [lowestItems] = Object.entries(diffs).sort(([, v1], [, v2]) => Math.abs(v1) - Math.abs(v2))

            // modify inputs to place player just outside wall
            if (lowestItems[0].startsWith('x')) {
                return [playerX + lowestItems[1], playerY]
            } else {
                return [playerX, playerY + lowestItems[1]]
            };
        };
    };
};