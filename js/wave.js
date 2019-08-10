const SURVIVAL_TIME = 30;
const POLY_MIN = 30, POLY_MAX = 80;

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

function createDeathzone(x, y, w, h, color, windupTime, growthRate=0, reversed=false) {
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
        grow: function() {
            let delta = this.reversed ? this.growthRate : -this.growthRate;
            this.x += delta;
            this.y += delta;
            this.w -= (delta * 2);
            this.h -= (delta * 2);
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

function createEnemy(x, y, deltaX, deltaY, shape, color, numPoints) {
    return {
        shape: shape,
        color: color,
        dx: deltaX,
        dy: deltaY,
        active: true,
        points: createShape(x, y, numPoints, shape),
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