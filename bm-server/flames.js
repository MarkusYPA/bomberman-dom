export class Flame {
    constructor(x, y, width, height, dir, name) {
        this.x = x;
        this.y = y;
        this.active = false;
        this.direction = dir;   // H/V or L/R/U/D - for horizontal, vertical or left, right, up, down
        this.name = name;
        this.width = width;
        this.height = height;
    }
}
