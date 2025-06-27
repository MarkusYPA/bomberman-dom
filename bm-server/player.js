import { Bomb } from './bomb.js'
import { bombTime, bombs, bounds, flames, timedEvents, levelMap, setGameLost } from './game.js'
import { Timer } from './timer.js'
import { state } from '../bm-server-shared/state.js'
import { gridStep, mult } from '../bm-server-shared/config.js'

let timedCount = 0

export class Player {
    constructor(size, speed, x, y, name = 'player', id = 1) {
        this.size = size
        this.speed = speed
        this.startX = x
        this.startY = y
        this.x = x
        this.y = y
        this.name = name
        this.id = id
        this.left = false
        this.dead = false

        this.lives = 3
        this.alive = true
        this.bombAmount = 1
        this.bombPower = 2
        this.isMoving = false
        this.score = 0
        this.killer = ''

        this.invulnerability()
    };

    invulnerability() {
        let countNow = timedCount
        this.vulnerable = false

        const timedInvulnerability = new Timer(() => {
            this.vulnerable = true
            timedEvents.delete(`invulnerability${countNow}`)
        }, 2000)

        timedEvents.set(`invulnerability${countNow}`, timedInvulnerability)
        timedCount++
    }

    dropBomb() {
        const row = Math.floor((this.y + this.size / 2) / gridStep)
        const col = Math.floor((this.x + this.size / 2) / gridStep)

        if (this.alive && this.bombAmount > 0 && (!levelMap[row][col] || levelMap[row][col] === this.name)) {    // || levelMap[row][col] === "player")

            const bomb = new Bomb()
            bomb.drop(row, col, this.bombPower)
            this.bombAmount--
            let countNow = timedCount
            const timedBombsBack = new Timer(() => {
                this.bombAmount++
                timedEvents.delete(`bombsback${countNow}`)
            }, bombTime)
            timedEvents.set(`bombsback${countNow}`, timedBombsBack)
            timedCount++
        };
    };

    // Handle sprite direction change based on movement
    updateSpriteDirection(direction) {
        if (this.alive) {
            this.left = (direction === 'left')
        }
    }

    die() {
        this.dead = true
        this.alive = false
        this.lives--

        //levelMap[0][0] = 'player';  // make sure enemies don't walk over player

        const countNow = timedCount
        const timedResurrection = new Timer(() => {
            this.killer = ''
            if (this.lives > 0) {
                this.x = this.startX
                this.y = this.startY
                this.dead = false
                this.alive = true
                this.invulnerability()
            } else {
                setGameLost() // Stop game loop updates
            };
            timedEvents.delete(`resurrection${countNow}`)
        }, 2000)
        timedEvents.set(`resurrection${countNow}`, timedResurrection)

        // Block enemies for 2 seconds after resurrection
        /* const timedEnemyBlock = new Timer(() => {
            if (this.lives > 0) {
                levelMap[0][0] = '';
            }
            timedEvents.delete(`enemyBlock${countNow}`)
        }, 4000); */
        //timedEvents.set(`enemyBlock${countNow}`, timedEnemyBlock)
        
        timedCount++
    };

    movePlayer(deltaTime, inputs) {

        if (this.alive) {

            if (inputs.bomb) {
                this.dropBomb()
            }

            if (inputs.left) this.updateSpriteDirection('left')
            if (inputs.right) this.updateSpriteDirection('right')

            // diagonal movement slowdown factor
            let slowDown = 1
            if ((inputs.left || inputs.right) && (inputs.up || inputs.down)) {
                slowDown = 0.707
            };

            // normalize speed for diagonal movement and different framerates
            let moveDistance = this.speed * slowDown * deltaTime

            // calculate next position
            let newX = this.x
            let newY = this.y
            if (inputs.left) newX -= moveDistance
            if (inputs.right) newX += moveDistance
            if (inputs.up) newY -= moveDistance
            if (inputs.down) newY += moveDistance

            // solid wall collisions
            const collidingWalls = []
            for (const wall of state.solidWalls) {
                if (wall.checkCollision(newX, newY, this.size, slowDown).toString() != [newX, newY].toString()) {
                    collidingWalls.push(wall)
                    if (collidingWalls.length == 1) break // Can't collide with more than one solid wall
                };
            };

            // weak wall collisions
            for (const wall of state.weakWalls.values()) {
                if (wall.checkCollision(newX, newY, this.size, slowDown).toString() != [newX, newY].toString()) {
                    collidingWalls.push(wall)
                    if (collidingWalls.length === 3) break // Can't collide with more than three walls
                };
            };

            // adjust next coordinates based on collisions to walls
            for (const wall of collidingWalls) {
                [newX, newY] = wall.checkCollision(newX, newY, this.size, slowDown, collidingWalls.length)
            };

            // bomb collisions
            const collidingBombs = []
            for (const bomb of bombs.values()) {
                if (bomb.checkCollision(newX, newY, this.size).toString() != [newX, newY].toString()) { // is collision check outcome equal to inputs?
                    collidingBombs.push(bomb)
                } else {
                    // erase owner when player no longer on top of bomb
                    //bomb.owner = '';
                    delete bomb.owners[this.name]
                };
            };

            // adjust next coordinates based on collisions to bombs
            for (const bomb of collidingBombs) {
                // No collision if bomb has this owner
                //if (!bomb.owner) {
                if (!bomb.owners[this.name]) {
                    [newX, newY] = bomb.checkCollision(newX, newY, this.size)
                };
            };

            // set coordinates based on possible collisions to area boundaries
            this.x = Math.max(0, Math.min(newX, bounds.width - this.size))
            this.y = Math.max(0, Math.min(newY, bounds.height - this.size))

            // Fatal, power-up and finish collisions after movement 
            let playerBounds = { left: this.x, right: this.x + this.size, top: this.y, bottom: this.y + this.size }
            if (this.vulnerable) {
                // flames hit
                for (const flame of flames.values()) {
                    if (checkHit(playerBounds, flame)) {
                        this.killer = 'bomb'
                        this.die()
                        break
                    };
                };
            }

            // power-ups hit
            for (const pow of state.powerups.values()) {
                if (checkHit(playerBounds, pow)) {
                    if (pow.powerType === 'bomb') {
                        this.bombAmount++
                    }
                    if (pow.powerType === 'flame') {
                        this.bombPower++
                    }
                    pow.pickUp()
                    state.pickedItems.push(pow.name)
                    break
                };
            };
        };
    };
};

function checkHit(playerBounds, other) {
    let otherBounds = {}    
    if (other.size) {
        otherBounds = { left: other.x, right: other.x + other.size, top: other.y, bottom: other.y + other.size }
    } else {    // flames have width and height, not size
        otherBounds = { left: other.x, right: other.x + other.width, top: other.y, bottom: other.y + other.height }
    }

    // No hit (false) if player is safely outside on at least one side
    return !(playerBounds.right - mult * 10 < otherBounds.left ||
        playerBounds.left + mult * 10 > otherBounds.right ||
        playerBounds.bottom - mult * 10 < otherBounds.top ||
        playerBounds.top + mult * 10 > otherBounds.bottom)
};
