const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboard = document.getElementById('leaderboard');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const gameOverTitle = document.getElementById('game-over-title');
const gameOverLeaderboard = document.getElementById('game-over-leaderboard');
const colorSwatches = document.querySelectorAll('.color-swatch');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const quitGameBtn = document.getElementById('quit-game-btn');

let gridCanvas = null;
function initGridCache() {
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    let gCtx = gridCanvas.getContext('2d');
    
    gCtx.strokeStyle = '#e0e0e0';
    gCtx.lineWidth = 1;
    gCtx.beginPath();
    for (let x = 0; x <= gridCanvas.width; x += CELL_SIZE) {
        gCtx.moveTo(x, 0);
        gCtx.lineTo(x, gridCanvas.height);
    }
    for (let y = 0; y <= gridCanvas.height; y += CELL_SIZE) {
        gCtx.moveTo(0, y);
        gCtx.lineTo(gridCanvas.width, y);
    }
    gCtx.stroke();
}

const usernameInput = document.getElementById('username-input');
const widthCalcSpan = document.getElementById('width-calc-span');


// --- Colors ---
const COLORS = {
    blue: '#007AFF',
    red: '#FF3B30',
    green: '#34C759',
    yellow: '#FFCC00',
    pink: '#FF69B4',
    cyan: '#32ADE6',
    purple: '#AF52DE',
    orange: '#FF9500',
    gridLines: '#E5E5EA',
    pathOpacity: 'rgba(255, 255, 255, 0.4)'
};

// --- Game Constants & State ---
const GRID_SIZE = 50;
const CELL_SIZE = 16; // 800 / 50
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

let isPlaying = false;
let selectedColorKey = "blue";
let selectedColorHex = COLORS.blue;

function generateFunnyName(takenNames = []) {
    const adjectives = ["Neon", "Cyber", "Quantum", "Plasma", "Toxic", "Radical", "Hyper", "Sonic", "Lunar", "Solar", "Cosmic", "Ghost", "Ninja", "Pixel", "Retro", "Savage", "Spicy", "Salty", "Mega", "Ultra", "Epic", "Dark", "Shadow", "Iron", "Gold", "Magic", "Sneaky", "Crazy", "Silly", "Cool", "Hot", "Icy"];
    const nouns = ["Block", "Cube", "Viper", "Phantom", "Glitch", "Sniper", "Dragon", "Wizard", "Titan", "Cyborg", "Bandit", "Demon", "Knight", "Rider", "Hunter", "Potato", "Panda", "Taco", "Bot", "King", "Boss", "Beast", "Wraith", "Slime", "Wolf", "Bear", "Cat", "Dog", "Duck", "Frog"];
    const suffixes = ["X", "Pro", "HD", "xoxo", "TV", "God", "Z", "V2", "Max"];

    let name = "";
    let attempts = 0;

    do {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const formatRoll = Math.random();

        if (formatRoll < 0.2) {
            name = noun;
        } else if (formatRoll < 0.35) {
            name = adj;
        } else if (formatRoll < 0.5) {
            name = `${noun}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
        } else {
            name = `${adj}${noun}`;
            if (Math.random() > 0.7) {
                name = `${name}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
            }
        }
        name = name.substring(0, 16);
        attempts++;
    } while (takenNames.includes(name) && attempts < 50);

    return name;
}

let playerName = generateFunnyName();
let hasModifiedName = false;
let grid = [];



let entities = [];
let idCounter = 1;
let kingId = null;

let particles = [];
let fireworkTimer = 0;
let isWon = false;
let winAnimationFrame = null;

let lastTime = 0;
let moveTimer = 0;
const moveInterval = 100; // ms per grid step

const playerCrown = document.getElementById("player-crown");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsResumeBtn = document.getElementById("settings-resume-btn");
const settingsSoundBtn = document.getElementById("settings-sound-btn");
const settingsRestartBtn = document.getElementById("settings-restart-btn");
const settingsQuitBtn = document.getElementById("settings-quit-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmYesBtn = document.getElementById("confirm-yes-btn");
const confirmNoBtn = document.getElementById("confirm-no-btn");

const fxCanvas = document.getElementById("fx-canvas");
const fxCtx = fxCanvas.getContext("2d");

let isPaused = false;
let isSoundEnabled = true;

function togglePause() {
    if (!isPlaying) return;
    isPaused = !isPaused;
}

settingsBtn.addEventListener("click", () => {
    if (!isPlaying) return;
    isPaused = true;
    settingsModal.classList.remove("hidden");
});

settingsResumeBtn.addEventListener("click", () => {
    isPaused = false;
    settingsModal.classList.add("hidden");
});

settingsSoundBtn.addEventListener("click", () => {
    isSoundEnabled = !isSoundEnabled;
    settingsSoundBtn.textContent = isSoundEnabled ? "Sound: ON" : "Sound: OFF";
});

settingsRestartBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    confirmModal.classList.remove("hidden");
});

settingsQuitBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    // Show confirmation or just quit
    isPaused = false;
    quitToMenu();
});

confirmNoBtn.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    settingsModal.classList.remove("hidden"); // go back to settings
});

confirmYesBtn.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    startGame();
});
function resizeFxCanvas() {
    fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeFxCanvas);
resizeFxCanvas();

// --- Menu Logic ---
function updateInputWidth() {
    widthCalcSpan.textContent = usernameInput.value || " ";
    usernameInput.style.width = widthCalcSpan.offsetWidth + "px";
}
usernameInput.value = playerName;
updateInputWidth();

let isIntentionalFocus = false;
function clearDefaultName() {
    isIntentionalFocus = true;
    if (!hasModifiedName) {
        usernameInput.value = "";
        playerName = "";
        updateInputWidth();
    }
}
usernameInput.addEventListener("mousedown", clearDefaultName);
usernameInput.addEventListener("touchstart", clearDefaultName, { passive: true });
usernameInput.addEventListener("focus", () => {
    if (!isIntentionalFocus) usernameInput.blur();
    isIntentionalFocus = false;
});
usernameInput.addEventListener("input", () => {
    hasModifiedName = true;
    playerName = usernameInput.value.trim();
    updateInputWidth();
});

const customColorModal = document.getElementById("custom-color-modal");
const colorWheelCanvas = document.getElementById("color-wheel-canvas");
const cwCtx = colorWheelCanvas ? colorWheelCanvas.getContext("2d") : null;
const colorWheelPreview = document.getElementById("color-wheel-preview");
const colorWheelConfirmBtn = document.getElementById("color-wheel-confirm-btn");

// Draw Color Wheel
if (cwCtx) {
    let radius = colorWheelCanvas.width / 2;
    let imageData = cwCtx.createImageData(colorWheelCanvas.width, colorWheelCanvas.height);
    let data = imageData.data;
    for (let y = 0; y < colorWheelCanvas.height; y++) {
        for (let x = 0; x < colorWheelCanvas.width; x++) {
            let dx = x - radius;
            let dy = y - radius;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
                let angle = Math.atan2(dy, dx);
                let hue = (angle + Math.PI) / (2 * Math.PI) * 360;
                let sat = (distance / radius) * 100;
                let rgb = hslToRgb(hue / 360, sat / 100, 0.5);
                let index = (y * colorWheelCanvas.width + x) * 4;
                data[index] = rgb[0];
                data[index + 1] = rgb[1];
                data[index + 2] = rgb[2];
                data[index + 3] = 255;
            }
        }
    }
    cwCtx.putImageData(imageData, 0, 0);
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s == 0) { r = g = b = l; } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

colorSwatches.forEach(swatch => {
    swatch.addEventListener("click", () => {
        colorSwatches.forEach(s => {
            s.classList.remove("selected");
            s.style.borderColor = "";
        });
        swatch.classList.add("selected");
        selectedColorKey = swatch.dataset.color;
        
        if (selectedColorKey === "custom") {
            if (!selectedColorHex || Object.values(COLORS).includes(selectedColorHex)) {
                selectedColorHex = "#AF52DE"; // Default purple
            }
            colorWheelPreview.style.backgroundColor = selectedColorHex;
            swatch.style.borderColor = selectedColorHex;
            customColorModal.classList.remove("hidden");
        } else {
            selectedColorHex = COLORS[selectedColorKey];
        }
    });
});

function pickColor(e) {
    if (!cwCtx) return;
    const rect = colorWheelCanvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    let scaleX = colorWheelCanvas.width / rect.width;
    let scaleY = colorWheelCanvas.height / rect.height;
    x = x * scaleX;
    y = y * scaleY;

    let radius = colorWheelCanvas.width / 2;
    let dx = x - radius;
    let dy = y - radius;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= radius) {
        let angle = Math.atan2(dy, dx);
        let hue = (angle + Math.PI) / (2 * Math.PI) * 360;
        let sat = (distance / radius) * 100;
        let rgb = hslToRgb(hue / 360, sat / 100, 0.5);
        let hex = "#" + ("000000" + ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16)).slice(-6);
        
        selectedColorHex = hex;
        colorWheelPreview.style.backgroundColor = hex;
        const customSwatch = document.querySelector('.custom-color');
        if (customSwatch) customSwatch.style.borderColor = hex;
    }
}

window.addEventListener('contextmenu', e => e.preventDefault());

let isDraggingColor = false;
if (colorWheelCanvas) {
    colorWheelCanvas.addEventListener("mousedown", (e) => { isDraggingColor = true; pickColor(e); });
    colorWheelCanvas.addEventListener("mousemove", (e) => { if (isDraggingColor) pickColor(e); });
    window.addEventListener("mouseup", () => { isDraggingColor = false; });

    colorWheelCanvas.addEventListener("touchstart", (e) => { e.preventDefault(); isDraggingColor = true; pickColor(e); }, {passive: false});
    colorWheelCanvas.addEventListener("touchmove", (e) => { if (isDraggingColor) { e.preventDefault(); pickColor(e); } }, {passive: false});
    window.addEventListener("touchend", () => { isDraggingColor = false; });
    window.addEventListener("touchcancel", () => { isDraggingColor = false; });
}

if (colorWheelConfirmBtn) {
    colorWheelConfirmBtn.addEventListener("click", () => {
        customColorModal.classList.add("hidden");
        startBtn.focus();
    });
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

function closeApp() {
    window.open("", "_self", "");
    window.close();
    window.location.href = "about:blank";
}
quitBtn.addEventListener("click", closeApp);
quitGameBtn.addEventListener("click", closeApp);

quitToMenuBtn.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
    canvas.classList.add("hidden");
    leaderboard.classList.add("hidden");
});

let actx = null;
function initAudio() {
    if (!actx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) actx = new AudioCtx();
    }
    if (actx && actx.state === 'suspended') {
        actx.resume();
    }
}

function playHitSound() {
    if (!actx || !isSoundEnabled) return;

    const time = actx.currentTime;

    // 1. White Noise Burst (The crisp high-end "tsch")
    const bufferSize = actx.sampleRate * 0.1; // 100ms
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = actx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = actx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4000; // Keep only the sharp high frequencies

    const noiseGain = actx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08); // Ultra-fast decay

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(actx.destination);

    // 2. Punch Transient (The physical "thwack")
    const osc = actx.createOscillator();
    const oscGain = actx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.05); // Fast pitch drop

    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(actx.destination);

    noise.start(time);
    osc.start(time);
    
    noise.stop(time + 0.1);
    osc.stop(time + 0.1);
}
function playTurnSound() {
    if (!actx || !isSoundEnabled) return;

    const osc = actx.createOscillator();
    const gainNode = actx.createGain();

    osc.type = 'sine';
    // A subtle high pitched pop/tick
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.05);

    // Subtle background pop/tick volume
    gainNode.gain.setValueAtTime(0.12, actx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + 0.05);
}
function playFireworkSound() {
    if (!actx || !isSoundEnabled) return;
    
    // 500ms to 1000ms randomized buffer delay
    const delay = 0.5 + (Math.random() * 0.5);
    const burstTime = actx.currentTime + delay;
    
    // 1. The Soft Boom (Low-passed noise)
    const bufferSize = actx.sampleRate * 0.8;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 200, burstTime);
    filter.frequency.exponentialRampToValueAtTime(100, burstTime + 0.4);
    
    const noiseGain = actx.createGain();
    noiseGain.gain.setValueAtTime(0, burstTime);
    noiseGain.gain.linearRampToValueAtTime(0.2, burstTime + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.8);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(actx.destination);
    noise.start(burstTime);
    noise.stop(burstTime + 0.9);
    
    // 2. Soft Low Thud (for subtle physical impact)
    const osc = actx.createOscillator();
    const oscGain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, burstTime);
    osc.frequency.exponentialRampToValueAtTime(30, burstTime + 0.3);
    
    oscGain.gain.setValueAtTime(0, burstTime);
    oscGain.gain.linearRampToValueAtTime(0.3, burstTime + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.4);
    
    osc.connect(oscGain);
    oscGain.connect(actx.destination);
    osc.start(burstTime);
    osc.stop(burstTime + 0.5);
}

// --- Core Game Logic ---
function getSafeSpawnPosition() {
    let attempts = 0;
    while(attempts < 200) {
        let bx = Math.floor(Math.random() * 40) + 5;
        let by = Math.floor(Math.random() * 40) + 5;
        let safe = true;
        // Check 5x5 area around spawn to ensure it's completely empty
        for(let dx=-2; dx<=2; dx++) {
            for(let dy=-2; dy<=2; dy++) {
                if(grid[bx+dx] && grid[bx+dx][by+dy] !== 0) {
                    safe = false; break;
                }
            }
            if(!safe) break;
        }
        
        if (safe) {
            for (let e of entities) {
                if (!e.isDead) {
                    let dist = Math.abs(bx - e.pos.x) + Math.abs(by - e.pos.y);
                    if (dist < 20) {
                        safe = false;
                        break;
                    }
                }
            }
        }

        if(safe) return {x: bx, y: by};
        attempts++;
    }
    return null; // No safe space found
}

function startGame() {
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
    initAudio();

    if (winAnimationFrame) {
        cancelAnimationFrame(winAnimationFrame);
        winAnimationFrame = null;
    }
    isWon = false;
    particles = [];
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    entities = [];
    idCounter = 1;

    // Create player
    let playerSpawn = {x: Math.floor(Math.random() * 40) + 5, y: Math.floor(Math.random() * 40) + 5};
    entities.push({
        id: idCounter++,
        name: playerName || "Player",
        isReal: true,
        color: selectedColorHex,
        pos: {x: playerSpawn.x, y: playerSpawn.y},
        visualPos: {x: playerSpawn.x * CELL_SIZE, y: playerSpawn.y * CELL_SIZE},
        currentDir: {dx: 0, dy: 1},
        nextDir: {dx: 0, dy: 1},
        path: [],
        territoryCount: 0,
        killCount: 0,
        isDead: false,
        collisionCell: null
    });

    // Create Bots
    const availableColors = Object.values(COLORS).filter(c => c !== selectedColorHex && c !== COLORS.gridLines && c !== COLORS.pathOpacity);
    let takenNames = [playerName || "Player"];
    for(let i=0; i<4; i++) {
        let botName = generateFunnyName(takenNames);
        takenNames.push(botName);
        let spawn = getSafeSpawnPosition();
        if(!spawn) spawn = {x: Math.floor(Math.random() * 40) + 5, y: Math.floor(Math.random() * 40) + 5}; // Fallback for start game
        
        entities.push({
            id: idCounter++,
            name: botName,
            isReal: false,
            color: availableColors[i % availableColors.length],
            pos: {x: spawn.x, y: spawn.y},
            visualPos: {x: spawn.x * CELL_SIZE, y: spawn.y * CELL_SIZE},
            currentDir: {dx: 0, dy: 1},
            nextDir: {dx: 0, dy: 1},
            path: [],
            territoryCount: 0,
            killCount: 0,
            isDead: false,
            collisionCell: null,
            state: "WANDER",
            framesInState: 0
        });
    }

    // Initial bases
    entities.forEach(e => {
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                grid[e.pos.x + dx][e.pos.y + dy] = e.id;
            }
        }
    });
    
    updateTerritoryCount();

    menuScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    leaderboard.classList.remove("hidden");
    canvas.classList.remove("hidden");
    isPaused = false;
    settingsBtn.classList.remove("hidden");

    isPlaying = true;
    document.body.classList.add("playing-cursor-hide");
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

let territoryCanvas = null;
let tCtx = null;

function initTerritoryCache() {
    territoryCanvas = document.createElement('canvas');
    territoryCanvas.width = canvas.width;
    territoryCanvas.height = canvas.height;
    tCtx = territoryCanvas.getContext('2d');
    updateTerritoryCount();
}

function updateTerritoryCount() {
    let entityMap = {};
    for (let e of entities) {
        e.territoryCount = 0;
        entityMap[e.id] = e;
    }

    if (tCtx) tCtx.clearRect(0, 0, territoryCanvas.width, territoryCanvas.height);
    
    let regionsByColor = {};

    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            let id = grid[x][y];
            if (id > 0 && entityMap[id]) {
                entityMap[id].territoryCount++;
                if (tCtx) {
                    let c = entityMap[id].color;
                    if (!regionsByColor[c]) regionsByColor[c] = [];
                    regionsByColor[c].push({x, y});
                }
            }
        }
    }

    if (tCtx) {
        for (let c in regionsByColor) {
            tCtx.fillStyle = c;
            tCtx.beginPath();
            for (let p of regionsByColor[c]) {
                tCtx.rect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
            tCtx.fill();
        }
    }
    
    let players = entities.map(e => ({
        id: e.id,
        name: e.name,
        color: e.color,
        percent: (e.territoryCount / TOTAL_CELLS) * 100,
        killCount: e.killCount || 0,
        isReal: e.isReal,
        isDead: e.isDead,
        respawnTimer: e.respawnTimer || 0
    }));
    players.sort((a, b) => {
        if (Math.abs(b.percent - a.percent) > 0.001) {
            return b.percent - a.percent;
        }
        return a.respawnTimer - b.respawnTimer;
    });

    if (players.length > 0) {
        kingId = players[0].id;
    } else {
        kingId = null;
    }

    leaderboard.innerHTML = "";

    players.forEach((p, index) => {
        const square = document.createElement("div");
        square.className = "leaderboard-square";
        if (p.isReal) square.classList.add("is-player");
        
        square.style.backgroundColor = p.color;

        if (p.isDead) {
            square.classList.add("dead");
            if (isPlaying) {
                square.textContent = `${Math.ceil(p.respawnTimer)}`;
            }
        } else if (index === 0) {
            // Crown for the current leader
            square.innerHTML = `<svg width="14" height="12" viewBox="-9 -14 18 15" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4));"><path d="M -7,0 L 7,0 L 9,-10 L 3.5,-4 L 0,-13 L -3.5,-4 L -9,-10 Z" fill="#fff"/></svg>`;
        }
        
        leaderboard.appendChild(square);
    });

    entities.forEach(e => {
        if (!e.isDead && isPlaying) {
            let percent = ((e.territoryCount / TOTAL_CELLS) * 100);
            if (percent >= 100) {
                die(e.isReal);
            }
        }
    });
}

function killEntity(target, killer) {
    if(target.isDead) return;
    target.isDead = true;
    
    if (!target.collisionCell) {
        target.collisionCell = {x: target.pos.x, y: target.pos.y};
    }
    
    target.path = [];
    for(let x=0; x<GRID_SIZE; x++){
        for(let y=0; y<GRID_SIZE; y++){
            if(grid[x][y] === target.id) grid[x][y] = 0;
        }
    }
    
    if (killer && killer.id !== target.id) {
        killer.killCount = (killer.killCount || 0) + 1;
    }
    playHitSound(); // Trigger MW2 Hitmarker on ANY kill or death!
    
    target.deathMarkerAlpha = 1.0;
    target.deathCount = (target.deathCount || 0) + 1;
    target.respawnTimer = 10 + ((target.deathCount - 1) * 5);
    
    updateTerritoryCount(); // Force leaderboard redraw to show death state immediately
}

function respawnBot(bot) {
    if(!isPlaying) return;
    
    let spawn = getSafeSpawnPosition();
    if(!spawn) {
        // If the board is too crowded to find an empty 5x5, wait and try again
        setTimeout(() => respawnBot(bot), 1500);
        return;
    }

    bot.isDead = false;
    bot.path = [];
    bot.territoryCount = 0;
    
    bot.pos = {x: spawn.x, y: spawn.y};
    bot.visualPos = {x: spawn.x * CELL_SIZE, y: spawn.y * CELL_SIZE};
    bot.currentDir = {dx: 0, dy: 1};
    bot.nextDir = {dx: 0, dy: 1};
    
    for(let dx=-1; dx<=1; dx++) {
        for(let dy=-1; dy<=1; dy++) {
            if(spawn.x+dx>=0 && spawn.x+dx<GRID_SIZE && spawn.y+dy>=0 && spawn.y+dy<GRID_SIZE)
                grid[spawn.x + dx][spawn.y + dy] = bot.id;
        }
    }
    updateTerritoryCount();
}

function getShortestPathToBase(startX, startY, botId, botPath) {
    if (grid[startX][startY] === botId) return 0;
    
    let queue = [{x: startX, y: startY, dist: 0}];
    let visited = new Set();
    visited.add(`${startX},${startY}`);
    let pathSet = new Set();
    for (let i = 0; i < botPath.length; i++) pathSet.add(`${botPath[i].x},${botPath[i].y}`);
    
    let cellsExplored = 0;
    
    while(queue.length > 0) {
        let curr = queue.shift();
        
        for (let d of [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}]) {
            let nx = curr.x + d.dx;
            let ny = curr.y + d.dy;
            
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] === botId) return curr.dist + 1;
                
                let key = `${nx},${ny}`;
                if (!visited.has(key) && !pathSet.has(key)) {
                    visited.add(key);
                    queue.push({x: nx, y: ny, dist: curr.dist + 1});
                }
            }
        }
    }
    return Infinity; // Completely trapped!
}

function getShortestPathToEdge(startX, startY, botId) {
    if (grid[startX][startY] !== botId) return 0;
    
    let queue = [{x: startX, y: startY, dist: 0}];
    let visited = new Set();
    visited.add(`${startX},${startY}`);
    let cellsExplored = 0;
    
    while(queue.length > 0) {
        let curr = queue.shift();
        cellsExplored++;
        if (cellsExplored > 200) return curr.dist; 
        
        for (let d of [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}]) {
            let nx = curr.x + d.dx;
            let ny = curr.y + d.dy;
            
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] !== botId) return curr.dist + 1;
                
                let key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({x: nx, y: ny, dist: curr.dist + 1});
                }
            }
        }
    }
    return Infinity;
}

function updateBotAI(bot) {
    bot.framesInState++;
    let validDirs = [
        {dx: 0, dy: 1}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: -1, dy: 0}
    ].filter(d => !(d.dx === -bot.currentDir.dx && d.dy === -bot.currentDir.dy));

    let inBase = grid[bot.pos.x][bot.pos.y] === bot.id;
    
    // Filter out walls
    validDirs = validDirs.filter(d => {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        return nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE;
    });
    
    // Filter out own path
    validDirs = validDirs.filter(d => {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        return !bot.path.some(p => p.x === nx && p.y === ny);
    });

    // Topological Safety Check: Do not enter dead-ends!
    validDirs = validDirs.filter(d => {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        d.distToBase = getShortestPathToBase(nx, ny, bot.id, bot.path);
        return d.distToBase !== Infinity;
    });

    if(validDirs.length === 0) return;

    // --- Situational Awareness ---
    let closestEnemyDist = 9999;
    let closestEnemyToPath = 9999;
    let closestEnemyObj = null;

    entities.forEach(other => {
        if (other.id !== bot.id && !other.isDead) {
            let distToHead = Math.abs(bot.pos.x - other.pos.x) + Math.abs(bot.pos.y - other.pos.y);
            if (distToHead < closestEnemyDist) {
                closestEnemyDist = distToHead;
                closestEnemyObj = other;
            }
            for (let p of bot.path) {
                let d = Math.abs(other.pos.x - p.x) + Math.abs(other.pos.y - p.y);
                if (d < closestEnemyToPath) closestEnemyToPath = d;
            }
        }
    });

    let baseTiles = [];
    for (let x=0; x<GRID_SIZE; x++) {
        for (let y=0; y<GRID_SIZE; y++) {
            if (grid[x][y] === bot.id) baseTiles.push({x, y});
        }
    }

    // Estimate bounds of current path to calculate Reward
    let minX = bot.pos.x, maxX = bot.pos.x, minY = bot.pos.y, maxY = bot.pos.y;
    for (let p of bot.path) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    let bestNetScore = -Infinity;
    let chosenDir = null;

    let maxSafePath = 40;
    if (closestEnemyDist > 25) maxSafePath = 150;
    else if (closestEnemyDist > 15) maxSafePath = 80;

    let isPanicking = (!inBase && (closestEnemyToPath <= 8 || bot.path.length > maxSafePath));

    for (let d of validDirs) {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        let isNextCellBase = grid[nx][ny] === bot.id;
        let distToBase = d.distToBase;

        if (isPanicking) {
            // STRICT PANIC OVERRIDE: Drop everything and run home
            let panicScore = -distToBase * 1000;
            if (isNextCellBase) panicScore += 5000;
            if (panicScore > bestNetScore) {
                bestNetScore = panicScore;
                chosenDir = d;
            }
            continue; // Skip all greedy reward/risk calculations
        }

        // --- Calculate Reward ---
        let reward = 0;
        
        if (bot.path.length === 0) {
            let distToEdge = getShortestPathToEdge(nx, ny, bot.id);
            reward += (50 - distToEdge) * 100; 
            if (!isNextCellBase) {
                reward += 5000; // HUGE bonus to finally step out of base!
            }
        } else {
            if (!isNextCellBase) {
                let potMinX = Math.min(minX, nx);
                let potMaxX = Math.max(maxX, nx);
                let potMinY = Math.min(minY, ny);
                let potMaxY = Math.max(maxY, ny);
                let area = (potMaxX - potMinX + 1) * (potMaxY - potMinY + 1);
                
                // Maximize area capture
                reward += area * 5; 
                
                // Efficient carving: heavily reward straight lines, but force a turn eventually to make a box
                let maxStraight = (closestEnemyDist > 20) ? 35 : 18;
                let forceTurn = (closestEnemyDist > 20) ? 45 : 25;

                if (d.dx === bot.currentDir.dx && d.dy === bot.currentDir.dy) {
                    if (bot.framesInState < maxStraight) {
                        reward += 300; 
                    } else if (bot.framesInState > forceTurn) {
                        reward -= 500; 
                    }
                }
            } else {
                // Securing the area is the ultimate reward
                let area = (maxX - minX + 1) * (maxY - minY + 1);
                reward += area * 25; 
            }
        }

        let distToEnemyPath = 9999;
        entities.forEach(other => {
            if (other.id !== bot.id && !other.isDead) {
                for (let p of other.path) {
                    let dPath = Math.abs(nx - p.x) + Math.abs(ny - p.y);
                    if (dPath < distToEnemyPath) distToEnemyPath = dPath;
                }
            }
        });
        if (distToEnemyPath <= 5) {
            reward += (10 - distToEnemyPath) * 150; 
        }

        // --- Calculate Risk ---
        let risk = 0;
        
        if (!inBase) {
            let distancePenaltyMultiplier = (closestEnemyDist > 20) ? 5 : 20;
            risk += distToBase * distancePenaltyMultiplier;
            
            if (closestEnemyToPath < 15) {
                risk += (15 - closestEnemyToPath) * 100;
                if (closestEnemyToPath <= 4) risk += 5000; 
            }
            
            if (closestEnemyObj) {
                let distToEnemy = Math.abs(nx - closestEnemyObj.pos.x) + Math.abs(ny - closestEnemyObj.pos.y);
                if (distToEnemy < 10) {
                    risk += (10 - distToEnemy) * 50;
                }
            }
            
            let manhattanToBase = 9999;
            if (baseTiles.length > 0) {
                for (let b of baseTiles) {
                    let mDist = Math.abs(nx - b.x) + Math.abs(ny - b.y);
                    if (mDist < manhattanToBase) manhattanToBase = mDist;
                }
            }
            if (distToBase > manhattanToBase + 2) {
                risk += (distToBase - manhattanToBase) * 200; 
            }
        } else {
            if (closestEnemyObj) {
                let distToEnemy = Math.abs(nx - closestEnemyObj.pos.x) + Math.abs(ny - closestEnemyObj.pos.y);
                if (distToEnemy <= 5) {
                    let enemyInTheirBase = grid[closestEnemyObj.pos.x][closestEnemyObj.pos.y] === closestEnemyObj.id;
                    if (enemyInTheirBase) {
                        risk += 500; 
                    } else {
                        reward += (10 - distToEnemy) * 300; 
                    }
                }
            }
        }

        let netScore = reward - risk + (Math.random() * 10);

        if (netScore > bestNetScore) {
            bestNetScore = netScore;
            chosenDir = d;
        }
    }

    if(chosenDir) {
        if (bot.currentDir.dx !== chosenDir.dx || bot.currentDir.dy !== chosenDir.dy) {
            bot.framesInState = 0; 
        }
        bot.nextDir = chosenDir;
    } else {
        bot.nextDir = validDirs[0];
    }
}

function moveEntities() {
    entities.forEach(e => {
        if(e.isDead) return;
        
        if(!e.isReal) updateBotAI(e);

        e.currentDir = e.nextDir;
        let oldPos = {x: e.pos.x, y: e.pos.y};
        e.pos.x += e.currentDir.dx;
        e.pos.y += e.currentDir.dy;

        // Out of bounds
        if(e.pos.x < 0 || e.pos.x >= GRID_SIZE || e.pos.y < 0 || e.pos.y >= GRID_SIZE) {
            e.collisionCell = {
                x: Math.max(0, Math.min(GRID_SIZE - 1, e.pos.x)),
                y: Math.max(0, Math.min(GRID_SIZE - 1, e.pos.y))
            };
            killEntity(e, null);
            return;
        }

        // Self intersect
        for(let p of e.path) {
            if(p.x === e.pos.x && p.y === e.pos.y) {
                e.collisionCell = {x: e.pos.x, y: e.pos.y};
                killEntity(e, null);
                return;
            }
        }
    });
    
    // Check path cuts and head-to-head
    entities.forEach(e => {
        if(e.isDead) return;
        entities.forEach(other => {
            if(other.isDead || e.id === other.id) return;
            
            // e cut other path
            for(let p of other.path) {
                if(p.x === e.pos.x && p.y === e.pos.y) {
                    other.collisionCell = {x: e.pos.x, y: e.pos.y};
                    killEntity(other, e);
                    if(e.isReal) playTurnSound(); 
                }
            }
            
            // Head to head
            let crossed = (e.pos.x === (other.pos.x - other.currentDir.dx) && 
                           e.pos.y === (other.pos.y - other.currentDir.dy) &&
                           other.pos.x === (e.pos.x - e.currentDir.dx) &&
                           other.pos.y === (e.pos.y - e.currentDir.dy));
                           
            if((e.pos.x === other.pos.x && e.pos.y === other.pos.y) || crossed) {
                let eSafe = grid[e.pos.x][e.pos.y] === e.id;
                let otherSafe = grid[other.pos.x][other.pos.y] === other.id;
                
                if (eSafe && !otherSafe) {
                    other.collisionCell = {x: e.pos.x, y: e.pos.y};
                    killEntity(other, e);
                    if(e.isReal) playTurnSound(); 
                } else if (!eSafe && otherSafe) {
                    e.collisionCell = {x: other.pos.x, y: other.pos.y};
                    killEntity(e, other);
                    if(other.isReal) playTurnSound(); 
                } else {
                    e.collisionCell = {x: e.pos.x, y: e.pos.y};
                    other.collisionCell = {x: other.pos.x, y: other.pos.y};
                    killEntity(e, null);
                    killEntity(other, null);
                }
            }
        });
    });

    // Process valid moves
    entities.forEach(e => {
        if(e.isDead) return;
        let oldPos = {x: e.pos.x - e.currentDir.dx, y: e.pos.y - e.currentDir.dy};
        
        if (grid[oldPos.x][oldPos.y] !== e.id) {
            e.path.push({x: oldPos.x, y: oldPos.y});
        }
        
        if (grid[e.pos.x][e.pos.y] === e.id && e.path.length > 0) {
            capturePath(e);
        }
    });
}

function capturePath(e) {
    for(let p of e.path) grid[p.x][p.y] = e.id;
    e.path = [];
    fillEnclosedArea(e.id);
    updateTerritoryCount();
}

function fillEnclosedArea(id) {
    let tempGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    let queue = [];

    for(let x=0; x<GRID_SIZE; x++){
        for(let y=0; y<GRID_SIZE; y++){
            if((x===0 || x===GRID_SIZE-1 || y===0 || y===GRID_SIZE-1) && grid[x][y] !== id) {
                tempGrid[x][y] = 2;
                queue.push({x, y});
            }
        }
    }

    const dirs = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
    let head = 0;
    while(head < queue.length) {
        let curr = queue[head++];
        for(let d of dirs) {
            let nx = curr.x + d.dx;
            let ny = curr.y + d.dy;
            if(nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE) {
                if(grid[nx][ny] !== id && tempGrid[nx][ny] === 0) {
                    tempGrid[nx][ny] = 2;
                    queue.push({x:nx, y:ny});
                }
            }
        }
    }

    for(let x=0; x<GRID_SIZE; x++){
        for(let y=0; y<GRID_SIZE; y++){
            if(grid[x][y] !== id && tempGrid[x][y] === 0) {
                grid[x][y] = id;
                
                // Process encirclement logic on enemies
                entities.forEach(other => {
                    if (other.id !== id && !other.isDead) {
                        // 1. Delete any uncaptured trail segments caught inside
                        other.path = other.path.filter(p => !(p.x === x && p.y === y));
                        
                        // 2. Kill the opponent if their actual head is encircled
                        if (other.pos.x === x && other.pos.y === y) {
                            other.collisionCell = {x, y};
                            killEntity(other, entities.find(e => e.id === id));
                        }
                    }
                });
            }
        }
    }
}

function die(playerWon = false) {
    isPlaying = false;
    isWon = true; // Always trigger the game over celebration logic!
    window.globalPlayerWon = playerWon;
    
    updateTerritoryCount(); // Final cleanup for the leaderboard UI
    
    document.body.classList.remove("playing-cursor-hide");
    settingsBtn.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");

    if (playerWon) {
        gameOverTitle.innerHTML = "Victory!";
        gameOverTitle.style.color = "#34C759";
    } else {
        playHitSound();
        gameOverTitle.innerHTML = "Defeat!";
        gameOverTitle.style.textAlign = "center";
        gameOverTitle.style.color = "#FF3B30";
    }

    leaderboard.classList.add("hidden");
    gameOverLeaderboard.innerHTML = leaderboard.innerHTML;
    
    particles = [];
    fireworkTimer = 1.0;
    lastTime = performance.now();
    requestAnimationFrame(winLoop);
}

window.addEventListener("keydown", (e) => {
    if (!isPlaying) return;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (e.code === "Space") {
        togglePause();
        return;
    }

    if (isPaused) return;

    let player = entities.find(ent => ent.isReal);
    if (!player || player.isDead) return;

    let oldNextDir = { dx: player.nextDir.dx, dy: player.nextDir.dy };

    if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && player.currentDir.dy !== 1) {
        player.nextDir = { dx: 0, dy: -1 };
    } else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && player.currentDir.dy !== -1) {
        player.nextDir = { dx: 0, dy: 1 };
    } else if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && player.currentDir.dx !== 1) {
        player.nextDir = { dx: -1, dy: 0 };
    } else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && player.currentDir.dx !== -1) {
        player.nextDir = { dx: 1, dy: 0 };
    }

    if (oldNextDir.dx !== player.nextDir.dx || oldNextDir.dy !== player.nextDir.dy) {
        playTurnSound();
    }
});

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].screenX;
    touchStartY = e.touches[0].screenY;
}, { passive: false });

window.addEventListener("touchmove", e => {
    if (isPlaying) e.preventDefault();
    else return;
    
    let player = entities.find(ent => ent.isReal);
    if (!player || player.isDead) return;

    let touchEndX = e.touches[0].screenX;
    let touchEndY = e.touches[0].screenY;

    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    let oldNextDir = { dx: player.nextDir.dx, dy: player.nextDir.dy };
    let turned = false;

    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && player.currentDir.dx !== -1) { player.nextDir = { dx: 1, dy: 0 }; turned = true; }
            else if (dx < 0 && player.currentDir.dx !== 1) { player.nextDir = { dx: -1, dy: 0 }; turned = true; }
        } else {
            if (dy > 0 && player.currentDir.dy !== -1) { player.nextDir = { dx: 0, dy: 1 }; turned = true; }
            else if (dy < 0 && player.currentDir.dy !== 1) { player.nextDir = { dx: 0, dy: -1 }; turned = true; }
        }
    }

    if (turned) {
        touchStartX = touchEndX;
        touchStartY = touchEndY;
        
        if (oldNextDir.dx !== player.nextDir.dx || oldNextDir.dy !== player.nextDir.dy) {
            playTurnSound();
        }
    }
}, { passive: false });

function spawnFirework() {
    const modalBox = document.querySelector('#game-over-screen > div').getBoundingClientRect();
    
    // Calculate the center and buffered dimensions of the modal
    const cx = (modalBox.left + modalBox.right) / 2;
    const cy = (modalBox.top + modalBox.bottom) / 2;
    const hw = (modalBox.right - modalBox.left) / 2 + 50; // half width + buffer
    const hh = (modalBox.bottom - modalBox.top) / 2 + 50; // half height + buffer

    // Bias spawning closely around the top and sides of the modal so particles rain down onto it
    const angle = Math.PI + (Math.random() * Math.PI); // PI to 2*PI (top semicircle)
    const dist = Math.random() * 180; // distance extending outwards from the buffered edge
    
    let x = cx + Math.cos(angle) * (hw + dist);
    let y = cy + Math.sin(angle) * (hh + dist);

    // Fallback in case modal bounds are completely broken
    if (isNaN(x) || isNaN(y)) {
        x = Math.random() * fxCanvas.width;
        y = Math.random() * (fxCanvas.height / 2);
    }

    // Introduce randomized scaling for fireworks of various sizes
    const scale = Math.random() * 1.5 + 0.5; // 0.5x to 2.0x overall scale multiplier
    const particleCount = Math.floor(120 * scale); // varies from 60 to 240 particles

    let colors = [
        { r: 255, g: 59, b: 48 }, // Red
        { r: 52, g: 199, b: 89 }, // Green
        { r: 0, g: 122, b: 255 }, // Blue
        { r: 255, g: 204, b: 0 }, // Yellow
        { r: 175, g: 82, b: 222 } // Purple
    ];
    let color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < particleCount; i++) {
        let pAngle = Math.random() * Math.PI * 2;
        let speed = (Math.random() * 250 + 50) * scale; // explosion radius varies with scale
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed,
            r: color.r,
            g: color.g,
            b: color.b,
            life: Math.random() * 1.0 + 0.5,
            maxLife: 1.5,
            size: (Math.random() * 4 + 1) * scale, // physical particle size varies with scale
            stuck: false,
            splatTime: Math.random() * 1.5 // Randomized 'z-depth' hit time
        });
    }

    playFireworkSound();
}
function updateParticles(dt) {
    const modalBox = document.querySelector('#game-over-screen > div').getBoundingClientRect();

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        
        if (!p.stuck) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 250 * dt; // gravity
            
            // Check collision with the frosted glass modal
            // Uses splatTime to simulate 3D depth so they don't all catch on the edge
            if (p.vy > 0 && p.life < p.splatTime &&
                p.x >= modalBox.left && p.x <= modalBox.right && 
                p.y >= modalBox.top && p.y <= modalBox.bottom) {
                
                p.stuck = true;
                p.vx = 0;
                p.vy = Math.random() * 30 + 10; // Slow drip down the glass
                p.size += Math.random() * 2 + 1; // Splatter expansion
            }
        } else {
            // Drip down the glass
            p.y += p.vy * dt;
        }

        if (p.stuck) {
            p.life -= dt / 3.0; // Decay 3 times slower when stuck to the glass
        } else {
            p.life -= dt;
        }

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}
function drawParticles(ctx) {
    particles.forEach(p => {
        let alpha = p.life / p.maxLife;
        if (alpha < 0) alpha = 0;
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
        ctx.beginPath();
        if (p.stuck) {
            // Neon glow for vibrant splatter
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
            // Draw an elongated drip shape
            ctx.ellipse(p.x, p.y, p.size / 2, p.size, 0, 0, Math.PI * 2);
        } else {
            ctx.shadowBlur = 0; // normal particle
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0; // reset to avoid bleeding
    });
}
function winLoop(timestamp) {
    if (!isWon) return; // safety stop

    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    if (window.globalPlayerWon) {
        fireworkTimer += dt;
        if (fireworkTimer > 0.6) { // Spawn every 0.6s (decreased frequency by ~20%)
            fireworkTimer = 0;
            spawnFirework();
        }
    }

    updateParticles(dt);

    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    drawGame(); // Draws the static board
    drawParticles(fxCtx); // Overlay fireworks on the absolute foreground

    winAnimationFrame = requestAnimationFrame(winLoop);
}

function drawRect(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

function gameLoop(time) {
    if (!isPlaying) return;

    let dt = time - lastTime;
    if (dt > 1000) dt = 16;
    lastTime = time;
    
    if (isPaused) {
        let progress = moveTimer / moveInterval;
        drawGame(progress);
        
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText("PAUSED", canvas.width/2, canvas.height/2);
        ctx.restore();
        
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update death cooldowns
    entities.forEach(e => {
        if (e.isDead && e.respawnTimer > 0) {
            e.respawnTimer -= dt / 1000;
            let timerEl = document.getElementById(`timer-${e.id}`);
            if (timerEl) {
                timerEl.textContent = `${Math.ceil(e.respawnTimer)}`;
            }
            if (e.respawnTimer <= 0) {
                e.respawnTimer = 0;
                respawnBot(e); // This now respawns both bots and the real player
            }
        }
    });

    moveTimer += dt;
    while (moveTimer >= moveInterval) {
        moveEntities();
        moveTimer -= moveInterval;
        if (!isPlaying) {
            drawGame(1.0);
            return;
        }
    }

    let progress = moveTimer / moveInterval;
    drawGame(progress);
    requestAnimationFrame(gameLoop);
}

function drawGame(progress) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gridCanvas) initGridCache();
    ctx.drawImage(gridCanvas, 0, 0);

    // Territories from Cached Offscreen Canvas
    if (!territoryCanvas) initTerritoryCache();
    ctx.drawImage(territoryCanvas, 0, 0);

    // Paths
    ctx.globalAlpha = 0.5;
    entities.forEach(e => {
        if(e.isDead) return;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        for(let p of e.path) {
            ctx.rect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Heads
    entities.forEach(e => {
        if(e.isDead) {
            if(isPlaying && e.collisionCell && e.deathMarkerAlpha > 0) {
                let cx = e.collisionCell.x * CELL_SIZE;
                let cy = e.collisionCell.y * CELL_SIZE;
                ctx.fillStyle = `rgba(255, 59, 48, ${e.deathMarkerAlpha})`;
                ctx.shadowColor = `rgba(255, 59, 48, ${e.deathMarkerAlpha})`;
                ctx.shadowBlur = 15;
                ctx.fillRect(cx - 2, cy - 2, CELL_SIZE + 4, CELL_SIZE + 4);
                ctx.shadowBlur = 0;

                let centerX = cx + CELL_SIZE / 2;
                let centerY = cy + CELL_SIZE / 2;
                let hmSize = CELL_SIZE * 0.8;

                ctx.strokeStyle = `rgba(255, 255, 255, ${e.deathMarkerAlpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - 4, centerY - 4);
                ctx.lineTo(centerX - hmSize, centerY - hmSize);
                ctx.moveTo(centerX + 4, centerY + 4);
                ctx.lineTo(centerX + hmSize, centerY + hmSize);
                ctx.moveTo(centerX + 4, centerY - 4);
                ctx.lineTo(centerX + hmSize, centerY - hmSize);
                ctx.moveTo(centerX - 4, centerY + 4);
                ctx.lineTo(centerX - hmSize, centerY + hmSize);
                ctx.stroke();
                
                e.deathMarkerAlpha -= 0.05; // Fade out quickly
            }
            return;
        }

        let targetX = e.pos.x * CELL_SIZE;
        let targetY = e.pos.y * CELL_SIZE;
        let prevX = (e.pos.x - e.currentDir.dx) * CELL_SIZE;
        let prevY = (e.pos.y - e.currentDir.dy) * CELL_SIZE;

        if (isPlaying && progress !== undefined) {
            e.visualPos.x = prevX + (targetX - prevX) * progress;
            e.visualPos.y = prevY + (targetY - prevY) * progress;
        }

        let isWinningPlayer = (!isPlaying && isWon && e.id === kingId);
        
        if (isWinningPlayer) {
            let t = (performance.now() / 1000) % 2.0;
            let jump = 0;
            let rot = 0;
            let scaleY_squash = 1.0;
            
            if (t < 0.2) {
                let u = t / 0.2;
                scaleY_squash = 1.0 - 0.2 * Math.sin(u * Math.PI);
            } else if (t < 0.8) {
                let u = (t - 0.2) / 0.6;
                jump = Math.sin(u * Math.PI) * 40;
                rot = u * Math.PI * 2;
            } else if (t < 1.0) {
                let u = (t - 0.8) / 0.2;
                scaleY_squash = 1.0 - 0.2 * Math.sin(u * Math.PI);
            }
            
            fxCtx.save();
            const canvasRect = canvas.getBoundingClientRect();
            let scaleX = canvasRect.width / 800;
            let scaleY = canvasRect.height / 800;
            
            let screenX = canvasRect.left + e.visualPos.x * scaleX;
            let screenY = canvasRect.top + e.visualPos.y * scaleY;
            let sSize = CELL_SIZE * scaleX;
            
            fxCtx.translate(screenX + sSize/2, screenY + sSize/2 - (jump * scaleY));
            fxCtx.rotate(rot);
            fxCtx.scale(1.0, scaleY_squash);
            fxCtx.translate(-(screenX + sSize/2), -(screenY + sSize/2));
            
            fxCtx.fillStyle = e.color;
            fxCtx.shadowColor = "rgba(0,0,0,0.5)";
            fxCtx.shadowBlur = 5 * scaleX;
            fxCtx.fillRect(screenX, screenY, sSize, sSize);
            fxCtx.shadowBlur = 0;
            
            fxCtx.strokeStyle = "rgba(0,0,0,0.15)";
            fxCtx.lineWidth = 1 * scaleX;
            fxCtx.strokeRect(screenX, screenY, sSize, sSize);
            
            fxCtx.restore();
            return;
        }

        ctx.save();
        ctx.fillStyle = e.color;
        
        if (grid[e.pos.x] && grid[e.pos.x][e.pos.y] === e.id) {
            // Intense white glow optimized (single pass)
            ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
            ctx.shadowBlur = 15;
            ctx.fillRect(e.visualPos.x, e.visualPos.y, CELL_SIZE, CELL_SIZE);
        } else {
            // Normal shadow optimized
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 4;
            ctx.fillRect(e.visualPos.x, e.visualPos.y, CELL_SIZE, CELL_SIZE);
        }
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(e.visualPos.x, e.visualPos.y, CELL_SIZE, CELL_SIZE);
        
        ctx.restore();
    });

    let king = entities.find(e => e.id === kingId);
    if (king && !king.isDead && (isPlaying || isWon)) {
        playerCrown.style.display = "block";
        let scaleX = canvas.clientWidth / 800;
        let scaleY = canvas.clientHeight / 800;
        let cx = (king.visualPos.x + CELL_SIZE / 2) * scaleX;
        let cy = (king.visualPos.y) * scaleY;
        
        if (!isPlaying && isWon) {
            let t = (performance.now() / 1000) % 2.0;
            let jump = 0;
            let squashOffset = 0;

            if (t < 0.2) {
                let u = t / 0.2;
                squashOffset = (0.2 * Math.sin(u * Math.PI)) * CELL_SIZE / 2;
            } else if (t < 0.8) {
                let u = (t - 0.2) / 0.6;
                jump = Math.sin(u * Math.PI) * 40;
            } else if (t < 1.0) {
                let u = (t - 0.8) / 0.2;
                squashOffset = (0.2 * Math.sin(u * Math.PI)) * CELL_SIZE / 2;
            }

            cy -= jump * scaleY;
            cy += squashOffset * scaleY;
        }

        let cw = 24 * scaleX;
        let ch = 18 * scaleY;
        let crownSvg = playerCrown.querySelector('svg');
        if (crownSvg) {
            crownSvg.setAttribute('width', cw);
            crownSvg.setAttribute('height', ch);
        }

        playerCrown.style.left = "0px";
        playerCrown.style.top = "0px";
        playerCrown.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -85%)`;
    } else {
        playerCrown.style.display = "none";
    }

    // Camera follow logic
    let myPlayer = entities.find(e => e.isReal);
    if (myPlayer) {
        let boardWrapper = document.getElementById('board-wrapper');
        if (boardWrapper) {
            let scaleX = canvas.clientWidth / 800;
            let scaleY = canvas.clientHeight / 800;
            let px = (myPlayer.visualPos.x + CELL_SIZE / 2) * scaleX;
            let py = (myPlayer.visualPos.y + CELL_SIZE / 2) * scaleY;
            
            let viewportWidth = window.innerWidth;
            let viewportHeight = window.innerHeight;
            
            let offsetX = viewportWidth / 2 - px;
            let offsetY = viewportHeight / 2 - py;
            
            // Clamp camera to prevent seeing too much outside the board
            let bw = boardWrapper.clientWidth;
            let bh = boardWrapper.clientHeight;
            let buffer = 60; // Allow seeing 60px outside the map
            
            let maxOffsetX = buffer;
            let minOffsetX = viewportWidth - bw - buffer;
            offsetX = minOffsetX > maxOffsetX ? (viewportWidth - bw) / 2 : Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
            
            let maxOffsetY = buffer;
            let minOffsetY = viewportHeight - bh - buffer;
            offsetY = minOffsetY > maxOffsetY ? (viewportHeight - bh) / 2 : Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
            
            boardWrapper.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        }
    }
}

