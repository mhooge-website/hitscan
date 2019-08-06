const TICK_RATE = 60;
const DEBUG = 1;

function mainLoop() {
    let currWave = 1;
    while (true) {
        if (DEBUG == 0) {
            // Draw round intro text.
            drawRoundIntro(currWave).then(function() {
                // Draw mouse start box.
                drawStartBox(currWave).then(function() {
                    // Draw good luck message.
                    drawGoodLuck();
                    setTimeout(function() {
                        // Start round obstacles.
                        roundLoop(currWave);
                    }, 1000);
                });
            });
        }
        else {
            // Start round obstacles.
            roundLoop(currWave);
        }
        break;
    }
}

function enemyDespawn(canvas, box) {
    canvasBound = canvas.getBoundingClientRect();
    return box.x > canvasBound.left + canvas.width || box.x + box.w < canvasBound.left
        || box.y > canvasBound.top + canvas.height || box.y + box.h < canvasBound.top;
}

function removeEnemy(index, enemies) {
    let newEnemies = [];
    for (let i = 0; i < enemies.length; i++) {
        if (i != index) newEnemies.push(enemies[i]);
    }
    return newEnemies;
}

function roundLoop(wave) {
    const delay = 1000/TICK_RATE;
    let canvas = getCanvas();
    let ctx = canvas.getContext("2d");
    let activeEnemies = [];
    let currTick = 0;
    let intervalId = setInterval(function() {
        for (let i = 0; i < activeEnemies.length; i++) {
            let enemy = activeEnemies[i];
            let box = enemy.getBoundingRect();
            eraseRect(ctx, box);
            if (enemyDespawn(canvas, box)) {
                activeEnemies = removeEnemy(i, activeEnemies);
            }
            else if (currTick % 2 == 0) {
                for (let j = 0; j < enemy.points.length; j++) {
                    enemy.points[j].x += enemy.dx;
                    enemy.points[j].y += enemy.dy;
                }
            }
        }
        let funcName = "wave"+wave+"Loop";
        let waveStatus = window[funcName](canvas, activeEnemies, currTick);

        activeEnemies = waveStatus.newEnemies;
        
        for (let i = 0; i < activeEnemies.length; i++) {
            drawEnemy(ctx, activeEnemies[i]);
        }

        if (waveStatus.finished) {
            clearInterval(intervalId);
        }
        currTick++;
        if (currTick < 0) currTick = 0;
    }, delay);
}

function drawEnemy(ctx, enemy) {
    ctx.fillStyle = enemy.color;
    if (enemy.shape == "poly") {
        let firstPoint = enemy.points[0];
        let oldStroke = ctx.strokeStyle;
        ctx.strokeStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < enemy.points.length; i++) {
            point = enemy.points[i];
            ctx.lineTo(point.x, point.y);
        }
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.fill();
        ctx.strokeStyle = oldStroke;
    }
}

function padNumber(number) {
    if (number < 10) return "0"+number;
    return ""+number;
}

function getCanvas() {
    return document.getElementsByTagName("canvas").item(0);
}

function createTooltip(text) {
    let tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerHTML = text;
    return tooltip;
}

function drawRoundIntro(wave) {
    return new Promise(function(resolve, reject) {
        let funcName = "wave"+wave+"FlavorText";
        let flavorText = window[funcName]();
        let tooltip = createTooltip("<span class='tooltip-main'>Wave " + 
            padNumber(wave) + 
            "</span><br><span class='tooltip-sub'>"+flavorText+"</span>"
        )
        let gameDiv = document.getElementById("game-div");
        setTimeout(function() {
            gameDiv.removeChild(tooltip);
            resolve();
        }, 4500);
    
        gameDiv.appendChild(tooltip);
    });
}

function drawGoodLuck() {
    let tooltip = createTooltip("Good Luck!");
    let gameDiv = document.getElementById("game-div");
    gameDiv.appendChild(tooltip);

    tooltip.classList.add("tooltip-main");
    setTimeout(function() {
        gameDiv.removeChild(tooltip);
    }, 4500);
}

function getCanvasPos(x, y) {
    let canvas = getCanvas();
    return {
        x: x - canvas.getBoundingClientRect().x,
        y: y - canvas.getBoundingClientRect().y
    }
}

function contains(x1, y1, x2, y2, w, h) {
    return x1 > x2 && x1 < x2 + w && y1 > y2 && y1 < y2 + h;
}

function drawStartBox(wave) {
    return new Promise(function(resolve, reject) {
        let funcName = "wave"+wave+"StartBox";
        let canvas = getCanvas();
        let ctx = canvas.getContext("2d");
        let box = window[funcName](canvas);
        
        ctx.lineWidth = 1;
        drawRect(ctx, box, "rgb(255, 0, 0)");
    
        let tooltip = createTooltip("Place your cursor here!")
        let gameDiv = document.getElementById("game-div");
        gameDiv.appendChild(tooltip);
    
        let triggered = false;
        canvas.addEventListener("mousemove", function(e) {
            let pos = getCanvasPos(e.clientX, e.clientY);
            if (!triggered && contains(pos.x, pos.y, box.x, box.y, box.w, box.h)) {
                gameDiv.removeChild(tooltip);
                fadeBox(box);
                resolve();
                triggered = true;
            }
        });
    });
}

function drawRect(ctx, box, color) {
    let oldStroke = ctx.strokeStyle;
    ctx.strokeStyle = color;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = oldStroke;
}

function eraseRect(ctx, box) {
    let oldFill = ctx.fillStyle;
    let bgColor = window.getComputedStyle(document.body, null).backgroundColor;
    ctx.fillStyle = bgColor;
    let lineWidth = ctx.lineWidth+2;
    ctx.fillRect(box.x-lineWidth, box.y-lineWidth, box.w+lineWidth*2, box.h+lineWidth*2);
    ctx.fillStyle = oldFill;
}

function fadeBox(box) {
    let ctx = getCanvas().getContext("2d");
    const duration = 4000;
    const delay = 50;
    let opacity = 1;
    let intervalId = setInterval(function() {
        opacity -= 1 / (duration / 50);
        if (opacity <= 0) opacity = 0;
        eraseRect(ctx, box);
        drawRect(ctx, box, "rgba(255, 0, 0, " + opacity + ")");
        if (opacity == 0) clearInterval(intervalId);
    }, delay);
}

function initialize() {
    swapViews("menu-div", "game-div");
    let gameDiv = document.getElementById("game-div");
    let canvas = getCanvas();
    canvas.width = gameDiv.offsetWidth;
    canvas.height = gameDiv.offsetHeight;
    mainLoop();
}

function swapViews(oldId, newId) {
    document.getElementById(oldId).style.display = "none";
    document.getElementById(newId).style.display = "block";
}