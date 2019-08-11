function wave1Initialize() {
    DEATHZONE_WINDUP = 4;
    DEATHZONE_RATES = [200, 200, 200, 200, 400];
    SPAWN_RATE = 150;
    SPAWN_AMOUNT = 32;
    let boundRect = canvas.getBoundingClientRect();
    DEATH_ZONES = [
        createDeathzone(0, 0, boundRect.width/4+1, boundRect.height, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/2 + boundRect.width/4 - 1, 0, boundRect.width/4+1, boundRect.height, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, 0, boundRect.width/2, boundRect.height/4, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, boundRect.height - boundRect.height/4, boundRect.width/2, boundRect.height/4, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE),
        createDeathzone(boundRect.width/4, boundRect.height/4, boundRect.width/2, boundRect.height/2, [220, 0, 0], DEATHZONE_WINDUP * TICK_RATE, 1, true)
    ];
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

function wave1Loop(enemies, deathZones, tick) {
    if (tick % SPAWN_RATE == 0 && tick / TICK_RATE < SURVIVAL_TIME - 5) {
        let edges = 4;
        for (let i = 0; i < edges; i++) {
            let newEnemies = spawnEnemiesAtEdge(i, SPAWN_AMOUNT/edges, tick, {shape: "rand_poly", color: "gray", numPoints: 8});
            enemies = enemies.concat(newEnemies);
        }
    }
    if (tick > 0 && tick % DEATHZONE_RATES[DEATHZONE_RATES.length-1] == 0) {
        let zone = getDeathZone(deathZones.length);
        if (zone != null) deathZones.push(zone);
    }
    return createWaveObj(enemies, deathZones);
}