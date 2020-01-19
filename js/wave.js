var SURVIVAL_TIME = 30;
const POLY_MIN = 30, POLY_MAX = 80;
var SPAWN_RATE = 150;
var SPAWN_AMOUNT = 32;
var MAX_SPEED = 8;
var MIN_SPEED = 2;
var DEATH_ZONES;
var DEATHZONE_WINDUP;
var DEATHZONE_RATES;

function getDeathZone(index) {
    return index < DEATH_ZONES.length ? DEATH_ZONES[index] : null;
}

function getRandomSpeed() {
    return MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
}

function shuffleArray(arr) {
    let n = arr.length;
    for (let i = 1; i < arr.length; i++) {
        let replaceIndex = Math.floor(Math.random() * n);
        let temp = arr[i];
        arr[i] = arr[replaceIndex];
        arr[replaceIndex] = temp;
    }
    return arr;
}

function spawnEnemiesAtEdge(edge, amount, tick, options={}, speed=null) {
    let canvasRect = canvas.getBoundingClientRect();
    let baselineX = edge < 2;
    let baseline = 0, offset = 0, staticPos = 0;
    let POLY_VARIANCE = (POLY_MAX - POLY_MIN);
    let enemies = [];
    let speedOffset = 0;
    if (baselineX) {
        baseline = canvasRect.width;
        offset = canvasRect.left
        staticPos = edge < 1 ? canvasRect.top - 10 : canvasRect.height - canvasRect.top - POLY_VARIANCE;
        speedOffset = edge > 0 ? -1 : 1;
    }
    else {
        baseline = canvasRect.height;
        offset = canvasRect.top
        staticPos = edge < 3 ? canvasRect.left - 10 : canvasRect.width - canvasRect.top - POLY_VARIANCE;
        speedOffset = edge > 2 ? -1 : 1;
    }
    for (let i = 0; i < amount; i++) {
        let pos = offset + (tick % 50) + ((i % amount) * (baseline / amount));
        let x = baselineX ? pos : staticPos;
        let y = baselineX ? staticPos : pos;
        let speedPos = speed;
        let speedStatic = speed;
        if (speed == null) {
            speedStatic = getRandomSpeed();
            speedStatic = Math.random() > 0.5 ? speedStatic : -speedStatic;
            speedPos = getRandomSpeed();
        }
        
        let speedX = baselineX ? speedStatic : speedPos * speedOffset;
        let speedY = baselineX ? speedPos * speedOffset : speedStatic;
        let enemy = createEnemy(x, y, speedX, speedY);
        Object.keys(options).forEach(function(key, index) {
            enemy[key] = options[key];
        });
        enemies.push(enemy);
    }
    return enemies;
}

function createDeathzone(x, y, w, h, color, windupTime, growthRate=0, reversed=false, growSides=["x", "y", "w", "h"]) {
    return {
        x: x,
        y: y,
        w: w,
        h: h,
        color: color,
        growthRate: growthRate,
        reversed: reversed,
        timeTillActive: Math.round(windupTime),
        timeSinceCreation: 0,
        static: this.growthRate == 0,
        grow: function() {
            let delta = this.reversed ? Math.sign(this.growthRate) : -Math.sign(this.growthRate);
            for (let i = 0; i < growSides.length; i++) {
                let prop = growSides[i];
                if (prop == "x" || prop == "y") {
                    this[prop] += delta;
                }
                else {
                    let modifier = 1;
                    if (prop == "w" && growSides.find(function(v, i, a) {
                        return v == "x";
                    }) || prop == "h" && growSides.find(function(v, i, a) {
                        return v == "y";
                    })) {
                        modifier = 2;
                    }
                    this[prop] -= delta * modifier;
                }
            }
        }
    }
}

function createRandomPolygon(x, y, amount) {
    let randX = [];
    let randY = [];
    for (let i = 0; i < amount; i++) {
        randX.push(POLY_MIN + Math.random() * (POLY_MAX - POLY_MIN));
        randY.push(POLY_MIN + Math.random() * (POLY_MAX - POLY_MIN));
    }

    let compareFunc = function(a, b) {
        return a > b ? 1 : b > a ? -1 : 0;
    }
    randX = randX.sort(compareFunc);
    randY = randY.sort(compareFunc);

    let minX = randX[0];
    let maxX = randX[amount-1];
    let minY = randY[0];
    let maxY = randY[amount-1];

    let xVec = [];
    let yVec = [];

    let lastTop = minX, lastBot = minX;
    for (let i = 1; i < amount-1; i++) {
        let xv = randX[i];
        if (Math.random() > 0.5) {
            xVec.push(xv - lastTop);
            lastTop = xv;
        }
        else {
            xVec.push(lastBot - xv);
            lastBot = xv;
        }
    }

    xVec.push(maxX - lastTop);
    xVec.push(lastBot - maxX);

    let lastLeft = minY, lastRight = minY;
    for (let i = 1; i < amount-1; i++) {
        let yv = randY[i];
        if (Math.random() > 0.5) {
            yVec.push(yv - lastLeft);
            lastLeft = yv;
        }
        else {
            yVec.push(lastRight - yv);
            lastRight = yv;
        }
    }

    yVec.push(maxY - lastLeft);
    yVec.push(lastRight - maxY);
    
    yVec = shuffleArray(yVec);

    let vector = [];
    for (let i = 0; i < amount; i++) {
        vector.push({x: xVec[i], y: yVec[i]});
    }

    vector = vector.sort(function(a, b) {
        let angleA = Math.atan2(a.y, a.x);
        let angleB = Math.atan2(b.y, b.x);
        return angleA > angleB ? 1 : angleB > angleA ? -1 : 0;
    });

    let px = 0, py = 0;
    let minPolyX = 0, minPolyY = 0;
    let points = [];
    for (let i = 0; i < amount; i++) {
        points.push({x: px, y: py})

        px += vector[i].x;
        py += vector[i].y;

        minPolyX = Math.min(minPolyX, px);
        minPolyY = Math.min(minPolyY, py);
    }

    let shiftX = (minX - minPolyX) + x;
    let shiftY = (minY - minPolyY) + y;

    return points.map(function(v, i, a) {
        return {x: v.x + shiftX, y: v.y + shiftY}
    });
}

function createShape(x, y, n, shape) {
    switch (shape) {
        case "rand_poly":
            return createRandomPolygon(x, y, n);
        case "poly":
            return [];
        case "rect":
            return [
                { x: x - variation/2, y: y - variation/2 },
                { x: x + variation/2, y: y - variation/2 },
                { x: x + variation/2, y: y + variation/2 },
                { x: x - variation/2, y: y + variation/2 }
            ]
    }
}

function createEnemy(x, y, deltaX, deltaY, shape="rand_poly", color="gray", numPoints=8, homing=false) {
    return {
        shape: shape,
        color: color,
        dx: deltaX,
        dy: deltaY,
        randSpeedMod: 5,
        active: true,
        homing: homing,
        points: createShape(x, y, numPoints, shape),
        move: function(mousePos) {
            let dx = this.dx;
            let dy = this.dy;
            if (this.homing) {
                let rect = this.getBoundingRect();
                let midX = rect.x + (rect.w/2);
                let midY = rect.y + (rect.h/2);
                let slope = (mousePos.y - midY) / (mousePos.x - midX);
                let intersect = -(slope * midX - midY);
                newY = slope * (midX+dx) + intersect;
                newY = Math.min(newY - midY, MAX_SPEED);
            }
            else if (this.randSpeedMod != 0) {
                dx += (Math.random() - 0.5) * this.randSpeedMod;
                dx += (Math.random() - 0.5) * this.randSpeedMod;
            }
            for (let j = 0; j < this.points.length; j++) {
                this.points[j].x += dx
                this.points[j].y += dy;
            }
        },
        getBoundingRect: function() {
            if (this.shape == "rect") {
                let lowX = this.points[0].x;
                let lowY = this.points[0].y;
                return {
                    x: lowX,
                    y: lowY,
                    w: this.points[2].x - lowX,
                    h: this.points[2].y - lowY
                }
            }
            let lowX = 100000;
            let lowY = 100000;
            let hiX = -100000;
            let hiY = -100000;
            for (let i = 0; i < this.points.length; i++) {
                let x = this.points[i].x;
                let y = this.points[i].y;
                if (x < lowX) lowX = x;
                if (x > hiX) hiX = x;
                if (y < lowY) lowY = y;
                if (y > hiY) hiY = y;
            }
            return {
                x: lowX,
                y: lowY,
                w: hiX - lowX,
                h: hiY - lowY
            }
        }
    }
}

function createWaveObj(enemies, deathZones) {
    return {
        newEnemies: enemies,
        newDeathzones: deathZones,
        timeToSurvive: SURVIVAL_TIME
    }
}