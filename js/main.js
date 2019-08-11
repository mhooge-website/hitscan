const TEXT_FADE_DURATION = 3500;
const MOVE_RATE = 2;
const DEBUG = 1;
var TOTAL_WAVES = 1;

async function mainLoop(wave=1, showIntro=true) {
    eraseRect(canvas.getContext("2d"), getCanvasBox());
    let mousePos = {x: 0, y: 0};
    if (showIntro && DEBUG == 0) {
        // Draw round intro text.
        await drawRoundIntro(wave);
    }
    // Draw mouse start box.
    await drawStartBox(wave).then(function(pos) {
        mousePos = pos;
    });
    // Draw good luck message.
    await drawGoodLuck();
    window["wave"+wave+"Initialize"]();
    // Start round obstacles.
    roundLoop(wave, mousePos).then(async function() {
        await showWinnerText();
        mainLoop(wave+1);
    }, async function(quit) {
        if (!quit) {
            showDeathText().then(function(retry) {
                if (retry) {
                    mainLoop(wave, false);
                }
                else {
                    swapViews("game-div", "menu-div");
                }
            });
        }
        else {
            swapViews("game-div", "menu-div");
        }
    });
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
    let box = getCanvasBox();
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
    return new Promise(function(resolve, reject) {
        addFadeOverlay();
        setTimeout(function() {
            let gameDiv = document.getElementById("game-div");
            let tooltip = createTooltip("<span class='tooltip-main'>You got hit</span><br>"+
                "<span class='tooltip-sub'>'Space' to retry.</span><br>"+
                "<span class='tooltip-sub'>'Q' to quit.</span>"
            , ["tooltip-fade-in", "tooltip-fade-in", "tooltip-fade-in"]);
            tooltip.style.color = "red";
            gameDiv.appendChild(tooltip);
            window.addEventListener("keypress", function(e) {
                if (e.key == " ") {
                    gameDiv.removeChild(tooltip);
                    resolve(true);
                }
                else if (e.key == "q") {
                    if (gameDiv.contains(tooltip)) gameDiv.removeChild(tooltip);
                    resolve(false);
                }
            });
        }, 500);
    });
}

function showWinnerText() {
    return new Promise(function(resolve, reject) {
        addFadeOverlay();
        setTimeout(function() {
            let gameDiv = document.getElementById("game-div");
            let tooltip = createTooltip("<span class='tooltip-main'>You Survived!</span><br>"+
                "<span class='tooltip-sub'>Get ready for the next wave</span>"
            , ["tooltip-fade-in", "tooltip-fade-in"]);
            gameDiv.appendChild(tooltip);
            setTimeout(function() {
                gameDiv.removeChild(tooltip);
                resolve();
            }, TEXT_FADE_DURATION);
        }, 500);
    });
}

function getCanvasBox() {
    let boundRect = canvas.getBoundingClientRect();
    return {x: 0, y: 0, w: boundRect.width, h: boundRect.height};
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
        let quit = false;
        document.getElementById("countdown-div").style.display = "block";
        canvas.addEventListener("mousemove", function(e) {
            mousePos = getCanvasPos(e.clientX, e.clientY);
        });
        window.addEventListener("keypress", function(e) {
            if (e.key == "q") {
                quit = true;
            }
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
                        dead = true;
                    }
                    else if (!zone.static && currTick % (DEATHZONE_MAX_GROWTH-Math.abs(zone.growthRate)) == 0) {
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
                    dead = true;
                }
                else if (currTick % MOVE_RATE == 0) {
                    enemy.move();
                }
            }
            let funcName = "wave"+wave+"Loop";
            let waveStatus = window[funcName](activeEnemies, deathZones, currTick);
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
                resolve(false);
            }
    
            if (enemiesToRemove != []) {
                activeEnemies = removeEnemies(enemiesToRemove, activeEnemies);
            }
            currTick++;
            if (currTick < 0) currTick = 0;

            if (quit || dead) {
                clearInterval(intervalId);
                reject(quit);
            }
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
    return canvas;
}

function createTooltip(text, classNames=[]) {
    let tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerHTML = text;
    if (classNames.length == 1) {
        tooltip.style.marginTop = "-100px"
        tooltip.classList.add(classNames[0]);
        tooltip.style.animationDuration = TEXT_FADE_DURATION;
        tooltip.style.opacity = 0;
    }
    else if (classNames.length > 1) {
        let tips = tooltip.getElementsByTagName("span");
        for (let i = 0; i < tips.length; i++) {
            let subTip = tips.item(i);
            subTip.style.opacity = 0;
            if (i > 0) {
                subTip.style.animationDelay = "0.5s";
            }
            subTip.classList.add(classNames[i]);
        }
    }
    return tooltip;
}

function drawRoundIntro(wave) {
    return new Promise(function(resolve, reject) {
        let funcName = "wave"+wave+"FlavorText";
        let flavorText = window[funcName]();
        let tooltip = createTooltip("<span class='tooltip-main'>Wave " + 
            padNumber(wave) + 
            "</span><br><span class='tooltip-sub'>"+flavorText+"</span>"
        , ["tooltip-fade-both", "tooltip-fade-both"]);
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
        , ["tooltip-fade-both", "tooltip-fade-both"]);
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

function eraseBoxArrow(ctx, bounds) {
    eraseRect(ctx, bounds);
}

function drawArrow(upwards, ctx, color, props) {
    let arrowHeight = props.arrowHeight;
    let arrowWidth = props.arrowWidth;
    let arrowMid = props.arrowMid;
    let startY = props.startY;
    let offset = props.offset;
    let oldFill = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (upwards) {
        // Left side of arrow.
        let x = arrowMid - (arrowWidth/2);
        let y = startY + arrowHeight + offset;
        ctx.moveTo(x, y);
        // Arrow head.
        y = (y-arrowHeight)+arrowWidth;
        ctx.lineTo(x, y);
        ctx.lineTo(arrowMid - arrowWidth, y);
        ctx.lineTo(arrowMid, y-arrowWidth);
        x = arrowMid + (arrowWidth);
        ctx.lineTo(x, y);
        x = x - arrowWidth/2, y;
        ctx.lineTo(x, y);
        // Right side of arrow.
        y = startY + arrowHeight + offset;
        ctx.lineTo(x, y);
        ctx.lineTo(x-arrowWidth, y);
    }
    else {
        // Left side of arrow.
        let x = arrowMid - (arrowWidth/2);
        let y = startY - arrowHeight - offset;
        ctx.moveTo(x, y);
        // Arrow head.
        y = (y+arrowHeight)-arrowWidth;
        ctx.lineTo(x, y);
        ctx.lineTo(arrowMid - arrowWidth, y);
        ctx.lineTo(arrowMid, y+arrowWidth);
        x = arrowMid + (arrowWidth);
        ctx.lineTo(x, y);
        x = x - arrowWidth/2, y;
        ctx.lineTo(x, y);
        // Right side of arrow.
        y = startY - arrowHeight - offset;
        ctx.lineTo(x, y);
        ctx.lineTo(x-arrowWidth, y);
    }
    ctx.fill();
    ctx.fillStyle = oldFill;
}

function drawBoxArrow(ctx, box, tooltip) {
    let arrowHeight = 200;
    let arrowWidth = 60;
    let boxX = box.x + (box.w / 2);
    let boxInCentre = box.x > tooltip.offsetLeft && box.x < tooltip.offsetLeft + tooltip.offsetWidth;
    let tooltipCloseAbove = box.y - tooltip.offsetTop - arrowHeight - 50 < 0;
    let upwards = boxInCentre && tooltipCloseAbove;
    let delay = 50;
    let offset = 25;
    let delta = -1;
    let arrowBounds = null;
    let arrowProps = {arrowHeight: arrowHeight, arrowWidth: arrowWidth, arrowMid: boxX, offset: offset};
    if (upwards) {
        arrowBounds =  {x: boxX - arrowWidth, y: box.y + box.h + 5, w: arrowWidth*2, h: arrowHeight + arrowWidth + 25};
        arrowProps["startY"] = box.y + box.h;
    }
    else {
        arrowBounds = {x: boxX - arrowWidth, y: box.y - arrowHeight - arrowWidth - 25, w: arrowWidth*2, h: arrowHeight + arrowWidth + 20};
        arrowProps["startY"] = box.y;
    }
    let bgColor = window.getComputedStyle(document.body, null).backgroundColor;
    let intervalId = setInterval(() => {
        eraseRect(ctx, arrowBounds);
        offset += delta;
        arrowProps.offset = offset + 7;
        drawArrow(upwards, ctx, "rgb(30, 0, 00)", arrowProps);
        arrowProps.offset = offset;
        drawArrow(upwards, ctx, "rgb(220, 0, 0)", arrowProps);
        if (offset == 10) delta = 1;
        else if (offset == 25) delta = -1;
    }, delay);
    return {bounds: arrowBounds, intervalId: intervalId};
}

function drawStartBox(wave) {
    return new Promise(function(resolve, reject) {
        let funcName = "wave"+wave+"StartBox";
        let canvas = getCanvas();
        let ctx = canvas.getContext("2d");
        let box = window[funcName](canvas);
        
        ctx.lineWidth = 1;
        drawRect(ctx, box, "rgb(255, 0, 0)");
    
        let tooltip = createTooltip("Move to the start position!", ["tooltip-fade-in"]);
        let gameDiv = document.getElementById("game-div");
        gameDiv.appendChild(tooltip);

        let arrowObj = drawBoxArrow(ctx, box, tooltip);
    
        let triggered = false;
        canvas.addEventListener("mousemove", function(e) {
            let pos = getCanvasPos(e.clientX, e.clientY);
            if (!triggered && contains(pos.x, pos.y, box)) {
                eraseBoxArrow(ctx, arrowObj.bounds);
                clearInterval(arrowObj.intervalId);
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

function initialize(divId) {
    swapViews(divId, "game-div");
    let gameDiv = document.getElementById("game-div");
    let canvas = getCanvas();
    canvas.width = gameDiv.offsetWidth;
    canvas.height = gameDiv.offsetHeight;
}

function swapViews(oldId, newId) {
    document.getElementById(oldId).style.display = "none";
    document.getElementById(newId).style.display = "block";
}

// Populate level selection menu.
let levelDiv = document.getElementById("levels-div");
let levelTemplate = document.getElementsByClassName("level-select").item(0);

var i = 1;
let legalWave = true;
while (legalWave) {
    (function() {
        let clone = levelTemplate.cloneNode(true);
        let btn = clone.getElementsByTagName("button").item(0);
        let funcName = "wave"+i+"FlavorText";
        try {
            let wave = i;
            let name = window[funcName]();
            btn.textContent += wave + " - " + name;
            btn.onclick = function() {
                initialize('levels-div');
                mainLoop(wave, true);
            }
    
            levelDiv.appendChild(clone);
        }
        catch (error) {
            legalWave = false;
        }
    })();
    i++;
}

TOTAL_WAVES = i-1;

levelDiv.removeChild(levelTemplate);