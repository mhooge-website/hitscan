const TICK_RATE = 60;
const TEXT_FADE_DURATION = 3500;
const MOVE_RATE = 2;
const DEATHZONE_GROW_RATE = 10;
const DEBUG = 0;

async function mainLoop() {
    let currWave = 1;
    while (true) {
        let mousePos = {x: 0, y: 0};
        if (DEBUG == 0) {
            // Draw round intro text.
            await drawRoundIntro(currWave);
            // Draw mouse start box.
            await drawStartBox(currWave).then(function(pos) {
                mousePos = pos;
            });
            // Draw good luck message.
            await drawGoodLuck();
        }
        await startWave(currWave);
        // Start round obstacles.
        roundLoop(currWave, mousePos).then(function() {
            showWinnerText();
        }, function() {
            showDeathText();
        });
        currWave++;
        break;
    }
}

function enemyDespawn(canvas, box) {
    canvasBound = canvas.getBoundingClientRect();
    return box.x > canvasBound.left + canvasBound.width || box.x + box.w < 0
        || box.y > canvasBound.top + canvasBound.height || box.y + box.h < canvasBound.top;
}

function removeEnemies(indices, enemies) {
    let newEnemies = [];
    let removed = 0;
    for (let i = 0; i < enemies.length; i++) {
        if (i != indices[removed]) {
            newEnemies.push(enemies[i]);
        }
        else {
            removed += 1;
        }
    }
    return newEnemies;
}

function addFadeOverlay() {
    let canvas = getCanvas();
    let boundRect = getCanvas().getBoundingClientRect();
    let box = {x: 0, y: 0, w: boundRect.width, h: boundRect.height};
    let ctx = canvas.getContext("2d");
    const duration = 1500;
    const delay = 30;
    const FINAL_OPACITY = 0.2;
    let opacity = 0;
    let intervalId = setInterval(function() {
        opacity += 1 / (duration / delay);
        if (opacity >= FINAL_OPACITY) opacity = FINAL_OPACITY;
        fillRect(ctx, box, "rgba(0, 0, 0, " + opacity + ")");
        if (opacity == FINAL_OPACITY) clearInterval(intervalId);
    }, delay);
}

function showDeathText() {
    addFadeOverlay();
    setTimeout(function() {
        let gameDiv = document.getElementById("game-div");
        let tooltip = createTooltip("<span class='tooltip-main'>You got hit</span><br>"+
            "<span class='tooltip-sub'>Better luck next time!</span>"
        )
        tooltip.style.color = "red";
        gameDiv.appendChild(tooltip);
        setTimeout(function() {
            gameDiv.removeChild(tooltip);
            swapViews("game-div", "menu-div");
        }, TEXT_FADE_DURATION);
    }, 500);
}

function showWinnerText() {
    return new Promise(function(resolve, reject) {
        addFadeOverlay();
        setTimeout(function() {
            let gameDiv = document.getElementById("game-div");
            let tooltip = createTooltip("<span class='tooltip-main'>You Survived!</span><br>"+
                "<span class='tooltip-sub'>Get ready for the next wave</span>"
            )
            gameDiv.appendChild(tooltip);
            setTimeout(function() {
                gameDiv.removeChild(tooltip);
                resolve();
            }, TEXT_FADE_DURATION);
        }, 500);
    });
}

function updateTimeLeft(time) {
    document.getElementById("countdown-num").textContent = padNumber(time);
}

function getBoxMidpoint(box) {
    return {
        x: box.x + (box.w / 2),
        y: box.y + (box.h / 2)
    }
}

function roundLoop(wave, mousePos) {
    return new Promise(function(resolve, reject) {
        const delay = 1000/TICK_RATE;
        let canvas = getCanvas();
        let ctx = canvas.getContext("2d");
        let activeEnemies = [];
        let deathZones = [];
        let currTick = 0;
        let timeSurvived = -1;
        let dead = false;
        document.getElementById("countdown-div").style.display = "block";
        canvas.addEventListener("mousemove", function(e) {
            mousePos = getCanvasPos(e.clientX, e.clientY);
        });
        let intervalId = setInterval(function() {
            // Erase and calculate whether the player is touching a death zone.
            for (let i = 0; i < deathZones.length; i++) {
                let zone = deathZones[i];
                eraseRect(ctx, zone);
                zone.timeSinceCreation += 1;
                if (zone.timeSinceCreation >= zone.timeTillActive) {
                    if (!dead && ((!zone.reversed && contains(mousePos.x, mousePos.y, zone)) ||
                    (zone.reversed && !contains(mousePos.x, mousePos.y, zone)))) {
                        clearInterval(intervalId);
                        dead = true;
                        reject();
                    }
                    else if (zone.growthRate > 0 && currTick % DEATHZONE_GROW_RATE == 0) {
                        zone.grow();
                    }
                }
            }

            let enemiesToRemove = [];
            for (let i = 0; i < activeEnemies.length; i++) {
                let enemy = activeEnemies[i];
                let hitBox = enemy.getBoundingRect();
                eraseRect(ctx, hitBox);
                if (enemyDespawn(canvas, hitBox)) {
                    enemiesToRemove.push(i);
                    enemy.active = false;
                }
                else if (!dead && contains(mousePos.x, mousePos.y, hitBox)) {
                    clearInterval(intervalId);
                    dead = true;
                    reject();
                }
                else if (currTick % MOVE_RATE == 0) {
                    let randSpeedModX = (Math.random() - 0.5) * 5;
                    let randSpeedModY = (Math.random() - 0.5) * 5;
                    for (let j = 0; j < enemy.points.length; j++) {
                        enemy.points[j].x += enemy.dx + randSpeedModX;
                        enemy.points[j].y += enemy.dy + randSpeedModY;
                    }
                }
            }
            let funcName = "wave"+wave+"Loop";
            let waveStatus = window[funcName](canvas, activeEnemies, deathZones, currTick);
            let timeSec = Math.round(currTick / TICK_RATE);
            if (timeSec != timeSurvived) {
                timeSurvived = timeSec;
                updateTimeLeft(waveStatus.timeToSurvive - timeSurvived);
            }
    
            activeEnemies = waveStatus.newEnemies;
            deathZones = waveStatus.newDeathzones;
            
            // Draw active enemies.
            for (let i = 0; i < activeEnemies.length; i++) {
                if (activeEnemies[i].active) {
                    drawEnemy(ctx, activeEnemies[i]);
                }
            }

            // Draw active death zones.
            for (let i = 0; i < deathZones.length; i++) {
                drawDeathzone(ctx, deathZones[i]);
            }
    
            if (timeSurvived >= waveStatus.timeToSurvive) {
                clearInterval(intervalId);
                resolve();
            }
    
            if (enemiesToRemove != []) {
                activeEnemies = removeEnemies(enemiesToRemove, activeEnemies);
            }
            currTick++;
            if (currTick < 0) currTick = 0;
        }, delay);
    });
}

function drawEnemy(ctx, enemy) {
    ctx.fillStyle = enemy.color;
    if (enemy.shape == "rand_poly" || enemy.shape == "poly") {
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

function drawDeathzone(ctx, zone) {
    let colors = zone.color;
    let activeSince = zone.timeSinceCreation - zone.timeTillActive;
    if (activeSince < 0) {
        let ratio = zone.timeSinceCreation / zone.timeTillActive;
        colors = [colors[0] * ratio, colors[1] * ratio, colors[2] * ratio];
    }
    let color = "rgb(" + colors.join(", ") + ")";
    if (zone.reversed) {
        let oldWidth = ctx.lineWidth;
        if (zone.growthRate > 0) {
            ctx.lineWidth = activeSince * zone.growthRate;
        }
        drawRect(ctx, zone, color);
        ctx.lineWidth = oldWidth;
    }
    else {
        fillRect(ctx, zone, color);
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
        }, TEXT_FADE_DURATION);
    
        gameDiv.appendChild(tooltip);
    });
}

function drawGoodLuck() {
    return new Promise(function(resolve, reject) {
        let tooltip = createTooltip(
            "<span class='tooltip-main'>Survive for "+SURVIVAL_TIME+" seconds</span><br>"+
            "<span class='tooltip-sub'>Good Luck!</span>"
        );
        tooltip.style.transform = "translateY(-56px)";
        let gameDiv = document.getElementById("game-div");
        gameDiv.appendChild(tooltip);
    
        tooltip.classList.add("tooltip-main");
        setTimeout(function() {
            resolve();
        }, 1000);
        setTimeout(function() {
            gameDiv.removeChild(tooltip);
        }, TEXT_FADE_DURATION);
    });
}

function startWave(wave) {
    let funcName = "wave"+wave+"Init";
    window[funcName](getCanvas(), TICK_RATE);
}

function getCanvasPos(x, y) {
    let canvas = getCanvas();
    return {
        x: x - canvas.getBoundingClientRect().x,
        y: y - canvas.getBoundingClientRect().y
    }
}

function contains(x1, y1, box) {
    return x1 > box.x && x1 < box.x + box.w && y1 > box.y && y1 < box.y + box.h;
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
            if (!triggered && contains(pos.x, pos.y, box)) {
                gameDiv.removeChild(tooltip);
                fadeBox(box);
                resolve(pos);
                triggered = true;
            }
        });
    });
}

function fillRect(ctx, box, color) {
    let oldFill = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = oldFill;
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
    const duration = TEXT_FADE_DURATION-500;
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