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

function wave2Loop(canvas, enemies, deathZones, tick) {
    return createWaveObj(enemies, deathZones);
}