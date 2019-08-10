const SPAWN_RATE = 150;
const SPAWN_AMOUNT = 32;
const DEATHZONE_RATES = [200, 200, 200, 200, 400];
const DEATHZONE_WINDUP = 4;
const MAX_SPEED = 8;
const MIN_SPEED = 2;

function getDeathZone(index) {
    let boundRect = canvas.getBoundingClientRect();
    let zones = [
        createDeathzone(0, 0, boundRect.width/4+1, boundRect.height, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/2 + boundRect.width/4 - 1, 0, boundRect.width/4+1, boundRect.height, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, 0, boundRect.width/2, boundRect.height/4, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, boundRect.height - boundRect.height/4, boundRect.width/2, boundRect.height/4, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, boundRect.height/4, boundRect.width/2, boundRect.height/2, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE, 1, true)
    ];
    DEATHZONE_RATES.pop();
    return index < zones.length ? zones[index] : null;
}

function wave1FlavorText() {
    return "Meteor Shower";
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

function wave1Loop(canvas, enemies, deathZones, tick) {
    const SPAWN_SPACES = 4;
    const POLY_VARIANCE = (POLY_MAX - POLY_MIN);
    if (tick % SPAWN_RATE == 0 && tick / TICK_RATE < SURVIVAL_TIME - 5) {
        let canvasRect = canvas.getBoundingClientRect();
        for (let i = 0; i < SPAWN_AMOUNT; i++) {
            let spawnPos = i / (SPAWN_AMOUNT / 4);
            let baselineX = spawnPos < 2;
            let x = 0, y = 0, speedX = 0, speedY = 0;
            if (baselineX) {
                let baseline = canvasRect.width;
                let offset = canvasRect.left
                staticPos = spawnPos < 1 ? canvasRect.top - 10 : canvasRect.height - canvasRect.top - POLY_VARIANCE;
                x = offset + (tick % 50) + ((i % (SPAWN_AMOUNT/SPAWN_SPACES)) * SPAWN_SPACES * (baseline / SPAWN_AMOUNT));
                y = staticPos;
                speedX = getRandomSpeed();
                speedX = Math.random() > 0.5 ? speedX : -speedX;
                speedY = getRandomSpeed();
                speedY = spawnPos < 1 ? speedY : -speedY;
            }
            else {
                let baseline = canvasRect.height;
                let offset = canvasRect.top
                let staticPos = spawnPos < 3 ? canvasRect.left - 10 : canvasRect.width - canvasRect.top - POLY_VARIANCE;
                x = staticPos;
                y = offset + (tick % 50) + ((i % (SPAWN_AMOUNT/SPAWN_SPACES)) * SPAWN_SPACES * (baseline / SPAWN_AMOUNT));
                speedX = getRandomSpeed();
                speedX = spawnPos < 3 ? speedX : -speedX;
                speedY = getRandomSpeed();
                speedY = Math.random() > 0.5 ? speedY : -speedY;
            }
            enemies.push(createEnemy(x, y, speedX, speedY, "rand_poly", "gray", 8));
        }
    }
    if (tick > 0 && tick % DEATHZONE_RATES[DEATHZONE_RATES.length-1] == 0) {
        let zone = getDeathZone(deathZones.length);
        if (zone != null) deathZones.push(zone);
    }
    return createWaveObj(enemies, deathZones);
}