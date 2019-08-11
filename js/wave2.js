function wave2Initialize() {
    DEATHZONE_WINDUP = 4;
    DEATHZONE_RATES = [200, 200, 200, 200, 400];
    SPAWN_RATE = 150;
    SPAWN_AMOUNT = 32;
    let boundRect = canvas.getBoundingClientRect();
    const growthRate = 8;
    const safeSpace = 300;
    DEATH_ZONES = [
        createDeathzone(0, 0, boundRect.width, 5, [220, 0, 0], 0, growthRate/2, false, ["h"]),
        createDeathzone(0, boundRect.height-5, boundRect.width, boundRect.height, [220, 0, 0], 0, growthRate/2, false, ["y"]),
        createDeathzone(0, 0, 5, boundRect.height, [220, 0, 0], 0, growthRate, false, ["w"]),
        createDeathzone(safeSpace, 0, boundRect.width-safeSpace, boundRect.height, [220, 0, 0], 0, -growthRate, false, ["x"])
    ];
}

function wave2FlavorText() {
    return "The Beaten Path";
}

function wave2StartBox(canvas) {
    let size = 50;
    let boundRect = canvas.getBoundingClientRect();
    return {
        x: 50,
        y: (canvas.height/2 + size/2) - boundRect.top,
        w: size,
        h: size
    }
}

function wave2Loop(enemies, deathZones, tick) {
    if (tick == 0) {
        for (let i = 0; i < DEATH_ZONES.length; i++) {
            let zone = getDeathZone(i);
            if (zone != null) deathZones.push(zone);
        }
    }
    if (tick % SPAWN_RATE == 0) {
        let edges = 2;
        for (let i = 0; i < edges; i++) {
            let newEnemies = spawnEnemiesAtEdge(i, SPAWN_AMOUNT/edges, tick, {shape: "rand_poly", color: "lightgray", numPoints: 8});
            enemies = enemies.concat(newEnemies);
        }
    }
    return createWaveObj(enemies, deathZones);
}