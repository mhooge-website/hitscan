const SPAWN_RATE = 2000//150;

function wave1FlavorText() {
    return "Humble Beginnings";
}

function wave1StartBox(canvas) {
    let size = 50;
    let boundRect = canvas.getBoundingClientRect();
    return {
        x: (canvas.width/2 + size/2) - boundRect.left,
        y: (canvas.height/2 + size/2) - boundRect.top,
        w: size,
        h: size
    }
}

function createEnemy(x, y, deltaX, deltaY) {
    return {
        shape: "poly",
        color: "cyan",
        dx: deltaX,
        dy: deltaY,
        points: [
            {
                x: x-20,
                y: y-20
            },
            {
                x: x-10,
                y: y-25
            },
            {
                x: x+5,
                y: y-15
            },
            {
                x: x+15,
                y: y-5
            },
            {
                x: x+5,
                y: y+10
            },
            {
                x: x-5,
                y: y+15
            }
        ],
        getBoundingRect: function() {
            let lowX = 100000;
            let lowY = 100000;
            let hiX = -100000;
            let hiY = -100000;
            for (let i = 0; i < this.points.length; i++) {
                let x = this.points[i].x;
                let y = this.points[i].y;
                if (x < lowX) lowX = x;
                else if (x > hiX) hiX = x;
                if (y < lowY) lowY = y;
                else if (y > hiY) hiY = y;
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

function wave1Loop(canvas, enemies, tick) {
    const SPAWN_AMOUNT = 10;
    if (tick % SPAWN_RATE == 0) {
        let canvasRect = canvas.getBoundingClientRect();
        for (let i = 0; i < SPAWN_AMOUNT; i++) {
            let x = canvasRect.left + (tick % 50) + (i * (canvas.width / SPAWN_AMOUNT));
            let y = canvasRect.top;
            let speed = 1 + Math.random() * 4;
            enemies.push(createEnemy(x, y, 0, speed));
        }
    }
    return {
        newEnemies: enemies,
        finished: false
    }
}