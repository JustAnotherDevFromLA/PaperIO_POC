const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboard = document.getElementById('leaderboard');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let dpr = Math.max(window.devicePixelRatio || 1, 2); // Keep dpr for UI/FX if needed

let pathGrid = new Int16Array(50 * 50); // Hardcoded GRID_SIZE 50
let bfsVisited = new Uint16Array(50 * 50);
let bfsVisitId = 0;

// DO NOT SCALE the giant game board canvases! Doing so exceeds iOS GPU memory limits and forces slow CPU compositing.
canvas.width = 800;
canvas.height = 800;
// ctx.scale is removed, everything is rendered 1:1 to the 800x800 grid

const gameOverTitle = document.getElementById('game-over-title');
const gameOverLeaderboard = document.getElementById('game-over-leaderboard');
const colorSwatches = document.querySelectorAll('.color-swatch');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d', {alpha: false});
bgCanvas.width = 800;
bgCanvas.height = 800;

function drawBgGrid() {
    bgCtx.fillStyle = 'white';
    bgCtx.fillRect(0, 0, 800, 800);
    
    // Very soft lines to prevent optical stuttering (wagon-wheel effect) during fast camera panning
    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    for (let x = 0; x <= 800; x += CELL_SIZE) {
        bgCtx.moveTo(x, 0);
        bgCtx.lineTo(x, 800);
    }
    for (let y = 0; y <= 800; y += CELL_SIZE) {
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(800, y);
    }
    bgCtx.stroke();
    
    // Draw slightly more visible dots at intersections to help with spatial awareness without adding judder
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = CELL_SIZE; x < 800; x += CELL_SIZE) {
        for (let y = CELL_SIZE; y < 800; y += CELL_SIZE) {
            bgCtx.fillRect(x - 1, y - 1, 2, 2);
        }
    }
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
let myPlayer = null;
let idCounter = 1;
let kingId = null;

let particles = [];
let fireworkTimer = 0;
let isWon = false;
let winAnimationFrame = null;

let deadCameraOffset = {x: 0, y: 0};
let currentCamOffsetX = null;
let currentCamOffsetY = null;
let currentCamScale = 1.0;
let isMouseDragging = false;
const moveInterval = 100; // ms per grid step
let moveTimer = 0;
let gameActiveTimeMs = 0;

const gameTimerHud = document.getElementById("game-timer-hud");
const globalLeaderboardModal = document.getElementById("global-leaderboard-modal");
const globalLeaderboardList = document.getElementById("global-leaderboard-list");
const closeGlobalLeaderboardBtn = document.getElementById("close-global-leaderboard-btn");
const globalLeaderboardMenuBtn = document.getElementById("global-leaderboard-menu-btn");
const globalLeaderboardEndBtn = document.getElementById("global-leaderboard-end-btn");

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

if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
        if (!isPlaying) return;
        isPaused = true;
        settingsModal.classList.remove("hidden");
    });
}

if (settingsResumeBtn) {
    settingsResumeBtn.addEventListener("click", () => {
        isPaused = false;
        settingsModal.classList.add("hidden");
    });
}

if (settingsSoundBtn) {
    settingsSoundBtn.addEventListener("click", () => {
        isSoundEnabled = !isSoundEnabled;
        settingsSoundBtn.textContent = isSoundEnabled ? "Sound: ON" : "Sound: OFF";
    });
}

if (settingsRestartBtn) {
    settingsRestartBtn.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
        confirmModal.classList.remove("hidden");
    });
}

if (settingsQuitBtn) {
    settingsQuitBtn.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
        // Show confirmation or just quit
        isPaused = false;
        quitToMenu();
    });
}

if (confirmNoBtn) {
    confirmNoBtn.addEventListener("click", () => {
        confirmModal.classList.add("hidden");
        settingsModal.classList.remove("hidden"); // go back to settings
    });
}

if (confirmYesBtn) {
    confirmYesBtn.addEventListener("click", () => {
        confirmModal.classList.add("hidden");
        startGame();
    });
}
let cachedViewportWidth = window.innerWidth;
let cachedViewportHeight = window.innerHeight;
let cachedBoardWidth = window.innerWidth;
let cachedBoardHeight = window.innerHeight;

function resizeFxCanvas() {
    let dpr = Math.max(window.devicePixelRatio || 1, 2);
    cachedViewportWidth = window.innerWidth;
    cachedViewportHeight = window.innerHeight;
    fxCanvas.width = cachedViewportWidth * dpr;
    fxCanvas.height = cachedViewportHeight * dpr;
    fxCtx.setTransform(1, 0, 0, 1, 0, 0);
    fxCtx.scale(dpr, dpr);
    
    let boardWrapper = document.getElementById('board-wrapper');
    if (boardWrapper) {
        cachedBoardWidth = boardWrapper.clientWidth;
        cachedBoardHeight = boardWrapper.clientHeight;
    }
}
window.addEventListener("resize", resizeFxCanvas);
resizeFxCanvas();

// --- Global Leaderboard Logic ---
async function loadGlobalLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error("API returned " + response.status);
        return await response.json();
    } catch(e) {
        console.error("Failed to load global leaderboard", e);
    }
    
    // Fallback to local storage if API fails or is offline
    let data = localStorage.getItem("papelio_global_leaderboard");
    if (data) {
        try { return JSON.parse(data); } catch(e) { return []; }
    }
    return [];
}

async function saveToGlobalLeaderboard(player, isWin) {
    if (!player || !player.isReal) return;
    
    let score = Math.floor((player.territoryCount / TOTAL_CELLS) * 10000); // 100.00%
    let payload = {
        name: player.name,
        color: player.color,
        score: score,
        kills: player.killCount || 0,
        deaths: player.deathCount || (isWin ? 0 : 1),
        timeMs: gameActiveTimeMs,
        date: new Date().getTime()
    };
    
    try {
        const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("API returned " + response.status);
    } catch(e) {
        console.error("Failed to save to global leaderboard", e);
        // Fallback to local storage
        let scores = await loadGlobalLeaderboard();
        scores.push(payload);
        scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeMs - b.timeMs;
        });
        if (scores.length > 100) scores = scores.slice(0, 100);
        localStorage.setItem("papelio_global_leaderboard", JSON.stringify(scores));
    }
}

function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function showGlobalLeaderboard() {
    globalLeaderboardList.innerHTML = "<div style='text-align: center; color: #888; padding: 20px 0;'>Loading scores...</div>";
    globalLeaderboardModal.classList.remove("hidden");
    
    let scores = await loadGlobalLeaderboard();
    globalLeaderboardList.innerHTML = "";
    
    if (scores.length === 0) {
        globalLeaderboardList.innerHTML = "<div style='text-align: center; color: #888; padding: 20px 0;'>No scores yet! Play a game to get on the board.</div>";
    } else {
        scores.forEach((s, i) => {
            let row = document.createElement("div");
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.padding = "8px 12px";
            row.style.background = i % 2 === 0 ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.06)";
            row.style.borderRadius = "8px";
            
            let left = document.createElement("div");
            left.style.display = "flex";
            left.style.alignItems = "center";
            left.style.gap = "10px";
            
            let rank = document.createElement("span");
            rank.style.fontWeight = "bold";
            rank.style.color = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#666";
            rank.style.minWidth = "24px";
            rank.textContent = `#${i+1}`;
            
            let nameCont = document.createElement("div");
            nameCont.style.display = "flex";
            nameCont.style.flexDirection = "column";
            
            let nameText = document.createElement("span");
            nameText.style.fontWeight = "bold";
            nameText.style.color = s.color;
            nameText.textContent = s.name;
            
            let statsText = document.createElement("span");
            statsText.style.fontSize = "11px";
            statsText.style.color = "#888";
            statsText.textContent = `⚔️ ${s.kills} | 💀 ${s.deaths}`;
            
            nameCont.appendChild(nameText);
            nameCont.appendChild(statsText);
            
            left.appendChild(rank);
            left.appendChild(nameCont);
            
            let right = document.createElement("div");
            right.style.display = "flex";
            right.style.flexDirection = "column";
            right.style.alignItems = "flex-end";
            
            let scoreText = document.createElement("span");
            scoreText.style.fontWeight = "bold";
            scoreText.textContent = (s.score / 100).toFixed(2) + "%";
            
            let timeText = document.createElement("span");
            timeText.style.fontSize = "12px";
            timeText.style.color = "#666";
            timeText.textContent = formatTime(s.timeMs);
            
            right.appendChild(scoreText);
            right.appendChild(timeText);
            
            row.appendChild(left);
            row.appendChild(right);
            
            globalLeaderboardList.appendChild(row);
        });
    }
    
    globalLeaderboardModal.classList.remove("hidden");
}

if (globalLeaderboardMenuBtn) {
    globalLeaderboardMenuBtn.addEventListener("click", showGlobalLeaderboard);
}
if (globalLeaderboardEndBtn) {
    globalLeaderboardEndBtn.addEventListener("click", showGlobalLeaderboard);
}
if (closeGlobalLeaderboardBtn) {
    closeGlobalLeaderboardBtn.addEventListener("click", () => {
        globalLeaderboardModal.classList.add("hidden");
    });
}

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


function quitToMenu() {
    isPlaying = false;
    isWon = false;
    if (winAnimationFrame) {
        cancelAnimationFrame(winAnimationFrame);
        winAnimationFrame = null;
    }
    
    gameOverScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
    canvas.classList.add("hidden");
    bgCanvas.classList.add("hidden");
    leaderboard.classList.add("hidden");
    if (gameTimerHud) gameTimerHud.classList.add("hidden");
    
    let winCrown = document.getElementById("win-crown-overlay");
    if (winCrown) winCrown.style.display = "none";
}

quitToMenuBtn.addEventListener("click", quitToMenu);

let actx = null;
function initAudio() {
    if (!actx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            actx = new AudioCtx();
            // Play a silent sound immediately on creation to fully unlock iOS audio engine
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start(0);
            osc.stop(0.01);
        }
    }
    if (actx && actx.state !== 'running') {
        let p = actx.resume();
        if (p !== undefined) p.catch(() => {});
    }
}

// Ensure audio context stays active by resuming on any interaction
document.addEventListener('touchstart', initAudio, { passive: true });
document.addEventListener('click', initAudio, { passive: true });
document.addEventListener('keydown', initAudio, { passive: true });

function playHitSound() {
    if (!actx || !isSoundEnabled) return;
    if (actx.state !== 'running') {
        let p = actx.resume();
        if (p !== undefined) p.catch(() => {});
    }

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
    if (actx.state !== 'running') {
        let p = actx.resume();
        if (p !== undefined) p.catch(() => {});
    }

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
    if (actx.state !== 'running') {
        let p = actx.resume();
        if (p !== undefined) p.catch(() => {});
    }
    
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
    
    gameActiveTimeMs = 0;
    if (gameTimerHud) {
        gameTimerHud.textContent = formatTime(gameActiveTimeMs);
        gameTimerHud.classList.remove("hidden");
    }

    // Create player
    let playerSpawn = {x: Math.floor(Math.random() * 40) + 5, y: Math.floor(Math.random() * 40) + 5};
    myPlayer = {
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
    };
    entities.push(myPlayer);

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
    bgCanvas.classList.remove("hidden");
    isPaused = false;
    if (settingsBtn) settingsBtn.classList.remove("hidden");

    deadCameraOffset = {x: 0, y: 0};
    isPlaying = true;
    document.body.classList.add("playing-cursor-hide");
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateTerritoryCount() {
    let entityMap = {};
    for (let e of entities) {
        e.territoryCount = 0;
        entityMap[e.id] = e;
    }

    drawBgGrid();
    
    let regionsByColor = {};

    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            let id = grid[x][y];
            if (id > 0 && entityMap[id]) {
                entityMap[id].territoryCount++;
                let c = entityMap[id].color;
                if (!regionsByColor[c]) regionsByColor[c] = [];
                regionsByColor[c].push({x, y});
            }
        }
    }

    for (let c in regionsByColor) {
        bgCtx.fillStyle = c;
        for (let p of regionsByColor[c]) {
            bgCtx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    entities.forEach(e => {
        if (!e.isDead && isPlaying) {
            let percent = ((e.territoryCount / TOTAL_CELLS) * 100);
            if (percent >= 100) {
                die(e.isReal);
            }
        }
    });

    updateLeaderboardUI();
}

function updateLeaderboardUI() {
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

    // Optimization: Avoid destroying and recreating DOM nodes (DOM thrashing)
    // Only create missing nodes, then update their contents
    while (leaderboard.children.length < players.length) {
        const square = document.createElement("div");
        square.className = "leaderboard-square";
        leaderboard.appendChild(square);
    }
    while (leaderboard.children.length > players.length) {
        leaderboard.removeChild(leaderboard.lastChild);
    }

    players.forEach((p, index) => {
        const square = leaderboard.children[index];
        square.className = "leaderboard-square"; // reset
        if (p.isReal) square.classList.add("is-player");
        
        square.style.backgroundColor = p.color;

        if (p.isDead) {
            square.classList.add("dead");
            square.id = `timer-${p.id}`;
            if (isPlaying) {
                square.innerHTML = `${Math.ceil(p.respawnTimer)}`;
            } else {
                square.innerHTML = "";
            }
        } else if (index === 0) {
            square.innerHTML = `<svg width="14" height="12" viewBox="-9 -14 18 15" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4)); transform: translateY(1px);"><path d="M -7,0 L 7,0 L 9,-10 L 3.5,-4 L 0,-13 L -3.5,-4 L -9,-10 Z" fill="#fff"/></svg>`;
        } else {
            square.innerHTML = "";
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
    let baseTimer = 10 + ((target.deathCount - 1) * 5);
    // Synchronize to the global 1-second interval so ALL timers tick down at the exact same frame
    let globalTimeFrac = (performance.now() / 1000) % 1.0;
    target.respawnTimer = baseTimer + (1.0 - globalTimeFrac) - 0.001;
    
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

// Pre-allocate a flat array for the BFS queue to avoid object allocation and shift() overhead.
// Max size is GRID_SIZE * GRID_SIZE * 3 (x, y, dist).
let bfsQueue = new Int16Array(50 * 50 * 3);

function getShortestPathToBase(startX, startY, botId) {
    if (grid[startX][startY] === botId) return 0;
    
    bfsVisitId++;
    if (bfsVisitId >= 65000) {
        bfsVisited.fill(0);
        bfsVisitId = 1;
    }
    
    let head = 0;
    let tail = 0;
    
    bfsQueue[tail++] = startX;
    bfsQueue[tail++] = startY;
    bfsQueue[tail++] = 0;
    
    bfsVisited[startX * GRID_SIZE + startY] = bfsVisitId;
    
    while(head < tail) {
        let cx = bfsQueue[head++];
        let cy = bfsQueue[head++];
        let dist = bfsQueue[head++];
        
        for (let d of [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}]) {
            let nx = cx + d.dx;
            let ny = cy + d.dy;
            
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] === botId) return dist + 1;
                
                let idx = nx * GRID_SIZE + ny;
                if (bfsVisited[idx] !== bfsVisitId && pathGrid[idx] !== botId) {
                    bfsVisited[idx] = bfsVisitId;
                    bfsQueue[tail++] = nx;
                    bfsQueue[tail++] = ny;
                    bfsQueue[tail++] = dist + 1;
                }
            }
        }
    }
    return Infinity; // Completely trapped!
}

function getShortestPathToEdge(startX, startY, botId) {
    if (grid[startX][startY] !== botId) return 0;
    
    bfsVisitId++;
    if (bfsVisitId >= 65000) {
        bfsVisited.fill(0);
        bfsVisitId = 1;
    }
    
    let head = 0;
    let tail = 0;
    
    bfsQueue[tail++] = startX;
    bfsQueue[tail++] = startY;
    bfsQueue[tail++] = 0;
    
    bfsVisited[startX * GRID_SIZE + startY] = bfsVisitId;
    
    while(head < tail) {
        let cx = bfsQueue[head++];
        let cy = bfsQueue[head++];
        let dist = bfsQueue[head++];
        
        for (let d of [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}]) {
            let nx = cx + d.dx;
            let ny = cy + d.dy;
            
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] !== botId) return dist + 1;
                
                let idx = nx * GRID_SIZE + ny;
                if (bfsVisited[idx] !== bfsVisitId) {
                    bfsVisited[idx] = bfsVisitId;
                    bfsQueue[tail++] = nx;
                    bfsQueue[tail++] = ny;
                    bfsQueue[tail++] = dist + 1;
                }
            }
        }
    }
    return Infinity;
}

function getManhattanToBase(startX, startY, botId, maxDist) {
    if (grid[startX][startY] === botId) return 0;
    for (let r = 1; r <= maxDist; r++) {
        for (let i = 0; i < r; i++) {
            let x1 = startX + i, y1 = startY - r + i;
            if (x1>=0 && x1<GRID_SIZE && y1>=0 && y1<GRID_SIZE && grid[x1][y1]===botId) return r;
            let x2 = startX + r - i, y2 = startY + i;
            if (x2>=0 && x2<GRID_SIZE && y2>=0 && y2<GRID_SIZE && grid[x2][y2]===botId) return r;
            let x3 = startX - i, y3 = startY + r - i;
            if (x3>=0 && x3<GRID_SIZE && y3>=0 && y3<GRID_SIZE && grid[x3][y3]===botId) return r;
            let x4 = startX - r + i, y4 = startY - i;
            if (x4>=0 && x4<GRID_SIZE && y4>=0 && y4<GRID_SIZE && grid[x4][y4]===botId) return r;
        }
    }
    return maxDist + 1;
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
    
    // Filter out own path (O(1) lookup via pathGrid)
    validDirs = validDirs.filter(d => {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        return pathGrid[nx * GRID_SIZE + ny] !== bot.id;
    });

    // Topological Safety Check: Do not enter dead-ends!
    validDirs = validDirs.filter(d => {
        let nx = bot.pos.x + d.dx;
        let ny = bot.pos.y + d.dy;
        d.distToBase = getShortestPathToBase(nx, ny, bot.id);
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
            reward += (200 - distToEdge) * 500; // Sprint to the closest empty cell
            if (!isNextCellBase) {
                reward += 20000; // HUGE bonus to finally step out of base and start capturing!
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
                let manhattanToOtherHead = Math.abs(nx - other.pos.x) + Math.abs(ny - other.pos.y);
                // Fast path-pruning: skip if the enemy's path cannot possibly reach this cell within 5 distance
                if (manhattanToOtherHead - other.path.length > 5) return;
                
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
            // If enemy is far away, the bot feels NO penalty for venturing far out. It will finish off capturing the board.
            let distancePenaltyMultiplier = (closestEnemyDist > 30) ? 0 : ((closestEnemyDist > 15) ? 5 : 20);
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
            
            let manhattanToBase = getManhattanToBase(nx, ny, bot.id, 20);
            if (distToBase > manhattanToBase + 2) {
                // Quadratic penalty to counter quadratic area reward and prevent spiraling/coiling
                risk += Math.pow(distToBase - manhattanToBase, 2) * 100; 
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
    // Rebuild global pathGrid for O(1) lookups
    pathGrid.fill(0);
    for (let e of entities) {
        if (!e.isDead) {
            for (let p of e.path) {
                pathGrid[p.x * GRID_SIZE + p.y] = e.id;
            }
        }
    }

    entities.forEach(e => {
        if(e.isDead) return;
        
        if(!e.isReal) {
            updateBotAI(e);
        }

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

        // Fast path collision check via O(1) pathGrid
        let pathOwner = pathGrid[e.pos.x * GRID_SIZE + e.pos.y];
        if (pathOwner > 0) {
            if (pathOwner === e.id) {
                e.collisionCell = {x: e.pos.x, y: e.pos.y};
                killEntity(e, null);
                return;
            } else {
                let other = entities.find(o => o.id === pathOwner);
                if (other && !other.isDead) {
                    other.collisionCell = {x: e.pos.x, y: e.pos.y};
                    killEntity(other, e);
                    if(e.isReal) playTurnSound();
                }
            }
        }
    });
    
    // Check head-to-head (Path cuts are now handled in O(1) above!)
    entities.forEach(e => {
        if(e.isDead) return;
        entities.forEach(other => {
            if(other.isDead || e.id === other.id) return;
            
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

let fillTempGrid = new Uint8Array(GRID_SIZE * GRID_SIZE);
let fillQueueX = new Int16Array(GRID_SIZE * GRID_SIZE);
let fillQueueY = new Int16Array(GRID_SIZE * GRID_SIZE);

function fillEnclosedArea(id) {
    fillTempGrid.fill(0);
    let head = 0;
    let tail = 0;

    for(let x=0; x<GRID_SIZE; x++){
        for(let y=0; y<GRID_SIZE; y++){
            if((x===0 || x===GRID_SIZE-1 || y===0 || y===GRID_SIZE-1) && grid[x][y] !== id) {
                fillTempGrid[x * GRID_SIZE + y] = 2;
                fillQueueX[tail] = x;
                fillQueueY[tail] = y;
                tail++;
            }
        }
    }

    const dx = [0, 0, 1, -1];
    const dy = [1, -1, 0, 0];
    
    while(head < tail) {
        let cx = fillQueueX[head];
        let cy = fillQueueY[head];
        head++;
        
        for(let i=0; i<4; i++) {
            let nx = cx + dx[i];
            let ny = cy + dy[i];
            if(nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE) {
                if(grid[nx][ny] !== id && fillTempGrid[nx * GRID_SIZE + ny] === 0) {
                    fillTempGrid[nx * GRID_SIZE + ny] = 2;
                    fillQueueX[tail] = nx;
                    fillQueueY[tail] = ny;
                    tail++;
                }
            }
        }
    }

    for(let x=0; x<GRID_SIZE; x++){
        for(let y=0; y<GRID_SIZE; y++){
            if(grid[x][y] !== id && fillTempGrid[x * GRID_SIZE + y] === 0) {
                grid[x][y] = id;
                
                // Process encirclement logic on enemies
                entities.forEach(other => {
                    if (other.id !== id && !other.isDead) {
                        // 1. Delete any uncaptured trail segments caught inside
                        let pathLength = other.path.length;
                        if (pathLength > 0) {
                            other.path = other.path.filter(p => !(p.x === x && p.y === y));
                        }
                        
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
    
    if (gameTimerHud) {
        gameTimerHud.classList.add("hidden");
    }
    
    saveToGlobalLeaderboard(myPlayer, playerWon);
    
    updateTerritoryCount(); // Final cleanup for the leaderboard UI
    
    // Build legacy detailed leaderboard for the Game Over screen
    let players = entities.map(e => ({
        id: e.id,
        name: e.name,
        color: e.color,
        percent: (e.territoryCount / TOTAL_CELLS) * 100,
        killCount: e.killCount || 0,
        isReal: e.isReal
    }));
    players.sort((a, b) => b.percent - a.percent);

    gameOverLeaderboard.innerHTML = "";
    gameOverLeaderboard.style.width = "100%";
    gameOverLeaderboard.style.marginBottom = "20px";

    players.forEach((p, index) => {
        const entry = document.createElement("div");
        entry.className = "leaderboard-entry";
        if (p.isReal) entry.classList.add("highlighted-player");

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.style.position = "relative";
        
        if (index === 0) {
            rank.innerHTML = `<span style="position: relative; display: inline-block;">#1
                <svg width="18" height="14" viewBox="-9 -14 18 15" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: -8px; left: -3px; transform: rotate(-15deg); filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4)); z-index: 1;">
                    <path d="M -7,0 L 7,0 L 9,-10 L 3.5,-4 L 0,-13 L -3.5,-4 L -9,-10 Z" fill="#FFCC00"/>
                </svg>
            </span>`;
        } else {
            rank.textContent = `#${index + 1}`;
        }

        const nameContainer = document.createElement("span");
        nameContainer.className = "leaderboard-name";
        nameContainer.style.color = "black";
        nameContainer.style.display = "flex";
        nameContainer.style.alignItems = "center";

        const colorSquare = document.createElement("div");
        colorSquare.style.width = "12px";
        colorSquare.style.height = "12px";
        colorSquare.style.backgroundColor = p.color;
        colorSquare.style.borderRadius = "2px";
        colorSquare.style.marginRight = "6px";
        colorSquare.style.flexShrink = "0";
        colorSquare.style.boxShadow = "0 1px 2px rgba(0,0,0,0.3)";

        const nameText = document.createElement("span");
        nameText.textContent = p.name;

        nameContainer.appendChild(colorSquare);
        nameContainer.appendChild(nameText);

        const score = document.createElement("span");
        score.className = "leaderboard-score";
        score.innerHTML = `⚔️ ${p.killCount}`;

        entry.appendChild(rank);
        entry.appendChild(nameContainer);
        entry.appendChild(score);
        gameOverLeaderboard.appendChild(entry);
    });

    document.body.classList.remove("playing-cursor-hide");
    if (settingsBtn) settingsBtn.classList.add("hidden");
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
    e.preventDefault();
    if (!isPlaying) {
        if (isWon) {
            let dx = e.touches[0].screenX - touchStartX;
            let dy = e.touches[0].screenY - touchStartY;
            deadCameraOffset.x += dx;
            deadCameraOffset.y += dy;
            touchStartX = e.touches[0].screenX;
            touchStartY = e.touches[0].screenY;
        }
        return;
    }
    
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

window.addEventListener("mousedown", e => {
    if (!isPlaying && isWon) {
        isMouseDragging = true;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
    }
});

window.addEventListener("mousemove", e => {
    if (isMouseDragging && !isPlaying && isWon) {
        let dx = e.clientX - touchStartX;
        let dy = e.clientY - touchStartY;
        deadCameraOffset.x += dx;
        deadCameraOffset.y += dy;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
    }
});

window.addEventListener("mouseup", () => isMouseDragging = false);
window.addEventListener("mouseleave", () => isMouseDragging = false);

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
        x = Math.random() * window.innerWidth;
        y = Math.random() * (window.innerHeight / 2);
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
        
        if (p.stuck) {
            // Fast simulated drip (two overlapping rectangles)
            ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.3})`;
            ctx.fillRect(p.x - p.size, p.y - p.size * 2, p.size * 2, p.size * 4);
            
            ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size, p.size, p.size * 2);
        } else {
            // Fast rect rendering for moving particles
            ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
            ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
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

    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
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
    
    // Fast forward time by 2x when the real player is dead
    if (myPlayer && myPlayer.isDead) {
        dt *= 2.0;
    }
    
    if (!isPaused) {
        gameActiveTimeMs += dt;
        if (gameTimerHud) {
            let newFormattedTime = formatTime(gameActiveTimeMs);
            if (gameTimerHud.textContent !== newFormattedTime) {
                gameTimerHud.textContent = newFormattedTime;
            }
        }
    }
    
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
    let timerUpdated = false;
    entities.forEach(e => {
        if (e.isDead && e.respawnTimer > 0) {
            e.respawnTimer -= dt / 1000;
            let timerEl = document.getElementById(`timer-${e.id}`);
            if (timerEl) {
                let newText = `${Math.ceil(e.respawnTimer)}`;
                if (timerEl.textContent !== newText) {
                    timerEl.textContent = newText;
                    timerUpdated = true;
                }
            }
            if (e.respawnTimer <= 0) {
                e.respawnTimer = 0;
                respawnBot(e); // This now respawns both bots and the real player
                timerUpdated = true;
            }
        }
    });
    
    // Force leaderboard resort when timers change
    if (timerUpdated) {
        updateLeaderboardUI();
    }

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
    ctx.clearRect(0, 0, 800, 800);

    // Paths
    ctx.globalAlpha = 0.5;
    
    // Viewport bounds calculation for path/head culling
    let canvasRectWidth = cachedViewportWidth;
    let canvasRectHeight = cachedViewportHeight;
    let scaleX = canvasRectWidth / 800;
    let scaleY = canvasRectHeight / 800;
    let pxCam = (myPlayer.visualPos.x + CELL_SIZE / 2);
    let pyCam = (myPlayer.visualPos.y + CELL_SIZE / 2);
    
    let viewLeft = pxCam - (canvasRectWidth / scaleX / 2) - 100;
    let viewRight = pxCam + (canvasRectWidth / scaleX / 2) + 100;
    let viewTop = pyCam - (canvasRectHeight / scaleY / 2) - 100;
    let viewBottom = pyCam + (canvasRectHeight / scaleY / 2) + 100;
    
    // Do not cull when zoomed out so paths and areas render correctly!
    if (myPlayer.isDead) {
        viewLeft = -1000;
        viewRight = 10000;
        viewTop = -1000;
        viewBottom = 10000;
    }

    entities.forEach(e => {
        if(e.isDead) return;
        
        // Fast off-screen prune: check if the entity's current head is way off-screen
        let vx = e.visualPos.x;
        let vy = e.visualPos.y;
        if (vx < viewLeft - 1000 || vx > viewRight + 1000 || vy < viewTop - 1000 || vy > viewBottom + 1000) {
             // If entity is extremely far off-screen, skip path rendering completely
             return;
        }

        // Solid contiguous line rendering with uniform opacity
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = CELL_SIZE;
        ctx.lineJoin = "miter";
        ctx.lineCap = "square";
        
        ctx.beginPath();
        let drawn = false;
        
        if (e.path.length > 0) {
            ctx.moveTo(e.path[0].x * CELL_SIZE + CELL_SIZE/2, e.path[0].y * CELL_SIZE + CELL_SIZE/2);
            for(let i=1; i<e.path.length; i++) {
                ctx.lineTo(e.path[i].x * CELL_SIZE + CELL_SIZE/2, e.path[i].y * CELL_SIZE + CELL_SIZE/2);
            }
            // Connect seamlessly to the moving visual head
            ctx.lineTo(e.visualPos.x + CELL_SIZE/2, e.visualPos.y + CELL_SIZE/2);
            drawn = true;
        } else if (grid[e.pos.x][e.pos.y] !== e.id) {
            // Player just stepped out of base: start line from edge of base
            let tailX = (e.pos.x - e.currentDir.dx) * CELL_SIZE + CELL_SIZE/2;
            let tailY = (e.pos.y - e.currentDir.dy) * CELL_SIZE + CELL_SIZE/2;
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(e.visualPos.x + CELL_SIZE/2, e.visualPos.y + CELL_SIZE/2);
            drawn = true;
        }
        
        if (drawn) ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // Heads
    entities.forEach(e => {
        if(e.isDead) {
            if(isPlaying && e.collisionCell && e.deathMarkerAlpha > 0) {
                let cx = e.collisionCell.x * CELL_SIZE;
                let cy = e.collisionCell.y * CELL_SIZE;
                
                // Simulated death marker glow
                ctx.fillStyle = `rgba(255, 59, 48, ${e.deathMarkerAlpha * 0.3})`;
                ctx.fillRect(cx - 6, cy - 6, CELL_SIZE + 12, CELL_SIZE + 12);
                ctx.fillStyle = `rgba(255, 59, 48, ${e.deathMarkerAlpha * 0.6})`;
                ctx.fillRect(cx - 2, cy - 2, CELL_SIZE + 4, CELL_SIZE + 4);

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
            
            ctx.save();
            let cx = e.visualPos.x + CELL_SIZE / 2;
            let cy = e.visualPos.y + CELL_SIZE / 2 - jump;
            
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.scale(1.0, scaleY_squash);
            ctx.translate(-cx, -cy);
            
            ctx.fillStyle = e.color;
            ctx.fillRect(e.visualPos.x, e.visualPos.y - jump, CELL_SIZE, CELL_SIZE);
            
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 1;
            ctx.strokeRect(e.visualPos.x, e.visualPos.y - jump, CELL_SIZE, CELL_SIZE);
            
            ctx.restore();
            return;
        }

        ctx.save();
        
        if (grid[e.pos.x] && grid[e.pos.x][e.pos.y] === e.id) {
            // Simulated intense white glow (fast multi-rect)
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(e.visualPos.x - 4, e.visualPos.y - 4, CELL_SIZE + 8, CELL_SIZE + 8);
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillRect(e.visualPos.x - 2, e.visualPos.y - 2, CELL_SIZE + 4, CELL_SIZE + 4);
        }
        
        ctx.fillStyle = e.color;
        ctx.fillRect(e.visualPos.x, e.visualPos.y, CELL_SIZE, CELL_SIZE);
        
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(e.visualPos.x, e.visualPos.y, CELL_SIZE, CELL_SIZE);
        
        ctx.restore();
    });

    // Normal play crown rendering has been moved to the DOM overlay to prevent clipping at the borders.

    if (myPlayer) {
        let boardWrapper = document.getElementById('board-wrapper');
        if (boardWrapper) {
            const canvasRect = canvas.getBoundingClientRect();
            let scaleX = (canvasRect.width - 16) / 800;
            let scaleY = (canvasRect.height - 16) / 800;
            let px = (myPlayer.visualPos.x + CELL_SIZE / 2) * scaleX;
            let py = (myPlayer.visualPos.y + CELL_SIZE / 2) * scaleY;
            
            let viewportWidth = cachedViewportWidth;
            let viewportHeight = cachedViewportHeight;
            
            let offsetX = viewportWidth / 2 - px;
            let offsetY = viewportHeight / 2 - py;
            
            if (!boardWrapper.dataset.transformOriginSet) {
                boardWrapper.style.transformOrigin = "0 0";
                boardWrapper.dataset.transformOriginSet = "true";
            }
            
            let scaleFactor = 1.0;
            
            if (myPlayer.isDead) {
                // Smoothly clear the camera offset so it doesn't snap if they died while panning
                deadCameraOffset = {x: 0, y: 0};
                
                let bw = cachedBoardWidth;
                let bh = cachedBoardHeight;
                
                let fitScaleX = viewportWidth / bw;
                let fitScaleY = viewportHeight / bh;
                scaleFactor = Math.min(fitScaleX, fitScaleY) * 0.95; 
                
                offsetX = (viewportWidth - (bw * scaleFactor)) / 2;
                offsetY = (viewportHeight - (bh * scaleFactor)) / 2;
            } else {
                // Apply dead panning offset (only used during isWon state now)
                offsetX += deadCameraOffset.x;
                offsetY += deadCameraOffset.y;
                
                // We only clamp the camera bounds if the game is over!
                // During normal gameplay, the camera should NOT clamp, keeping the player perfectly centered
                // so they can see the maximum possible distance ahead even when near the map border.
                if (!isPlaying && isWon) {
                    let bw = cachedBoardWidth;
                    let bh = cachedBoardHeight;
                    
                    let maxOffsetX = 50;
                    let minOffsetX = viewportWidth - bw - 50;
                    
                    if (minOffsetX > maxOffsetX) {
                        offsetX = (viewportWidth - bw) / 2;
                    } else {
                        let clampedOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
                        deadCameraOffset.x -= (offsetX - clampedOffsetX);
                        offsetX = clampedOffsetX;
                    }
                    
                    let maxOffsetY = 50;
                    let minOffsetY = viewportHeight - bh - 50;
                    
                    if (minOffsetY > maxOffsetY) {
                        offsetY = (viewportHeight - bh) / 2;
                    } else {
                        let clampedOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
                        deadCameraOffset.y -= (offsetY - clampedOffsetY);
                        offsetY = clampedOffsetY;
                    }
                }
            }
            
            let targetOffsetX = offsetX;
            let targetOffsetY = offsetY;
            let targetScale = scaleFactor;

            if (currentCamOffsetX === null) {
                currentCamOffsetX = targetOffsetX;
                currentCamOffsetY = targetOffsetY;
                currentCamScale = targetScale;
            } else {
                if (myPlayer.isDead || isWon) {
                    let lerpSpeed = 0.15; // 2x faster zoom out effect
                    currentCamOffsetX += (targetOffsetX - currentCamOffsetX) * lerpSpeed;
                    currentCamOffsetY += (targetOffsetY - currentCamOffsetY) * lerpSpeed;
                    currentCamScale += (targetScale - currentCamScale) * lerpSpeed;
                } else {
                    let diffX = targetOffsetX - currentCamOffsetX;
                    let diffY = targetOffsetY - currentCamOffsetY;
                    let diffScale = targetScale - currentCamScale;
                    
                    // If we are far away (e.g. just respawned), swoop in fast!
                    if (Math.abs(diffScale) > 0.005 || Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
                        currentCamOffsetX += diffX * 0.15;
                        currentCamOffsetY += diffY * 0.15;
                        currentCamScale += diffScale * 0.15;
                    } else {
                        // Hard lock to player to prevent camera lag and keep player perfectly centered!
                        currentCamOffsetX = targetOffsetX;
                        currentCamOffsetY = targetOffsetY;
                        currentCamScale = targetScale;
                    }
                }
            }

            let newTransform = `translate3d(${currentCamOffsetX}px, ${currentCamOffsetY}px, 0) scale(${currentCamScale})`;
            if (boardWrapper.dataset.lastTransform !== newTransform) {
                boardWrapper.style.transform = newTransform;
                boardWrapper.dataset.lastTransform = newTransform;
            }

            let winCrown = document.getElementById("win-crown-overlay");
            if (winCrown) {
                let king = entities.find(e => e.id === kingId);
                if (king && !king.isDead) {
                    let squareYOffset = 0;
                    let crownToss = 0;

                    if (!isPlaying && isWon) {
                        let t = (performance.now() / 1000) % 2.0;
                        if (t < 0.2) {
                            let u = t / 0.2;
                            squareYOffset = (0.2 * Math.sin(u * Math.PI)) * CELL_SIZE / 2;
                        } else if (t < 0.8) {
                            let u = (t - 0.2) / 0.6;
                            squareYOffset = -Math.sin(u * Math.PI) * 40;
                        } else if (t < 1.0) {
                            let u = (t - 0.8) / 0.2;
                            squareYOffset = (0.2 * Math.sin(u * Math.PI)) * CELL_SIZE / 2;
                        }

                        // The user requested the crown to stay directly above the player square.
                        // We removed the crownToss variable completely so it stays perfectly pinned.
                    }

                    // Use pure mathematical projection relative to board wrapper to eliminate bounding rect jitter
                    let bwRaw = cachedBoardWidth;
                    let bhRaw = cachedBoardHeight;
                    let rawScaleX = (bwRaw - 16) / 800;
                    let rawScaleY = (bhRaw - 16) / 800;

                    let rawX = 8 + (king.visualPos.x + CELL_SIZE / 2) * rawScaleX;
                    let rawY = 8 + (king.visualPos.y + squareYOffset - crownToss) * rawScaleY + (-2 * rawScaleY);

                    let screenX = rawX * currentCamScale + currentCamOffsetX;
                    let screenY = rawY * currentCamScale + currentCamOffsetY;
                    let finalScaleX = rawScaleX * currentCamScale;

                    winCrown.style.display = "block";
                    winCrown.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${0.8 * finalScaleX})`;
                } else {
                    winCrown.style.display = "none";
                }
            }
        }
    }
}

