const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboard = document.getElementById('leaderboard');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const gameOverStats = document.getElementById('game-over-stats');

const colorSwatches = document.querySelectorAll('.color-swatch');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const quitGameBtn = document.getElementById('quit-game-btn');

const usernameInput = document.getElementById('username-input');
const widthCalcSpan = document.getElementById('width-calc-span');
const gameOverTitle = document.getElementById('game-over-title');

// --- Colors ---
const COLORS = {
    blue: '#007AFF',
    red: '#FF3B30',
    green: '#34C759',
    yellow: '#FFCC00',
    orange: '#FF9500',
    purple: '#AF52DE',
    gridLines: '#E5E5EA',
    pathOpacity: 'rgba(255, 255, 255, 0.4)'
};

// --- Game Constants & State ---
const GRID_SIZE = 50;
const CELL_SIZE = 16; // 800 / 50
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

let isPlaying = false;
let selectedColorKey = 'blue';
let selectedColorHex = COLORS.blue;
let dummyBots = [];

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
            // 20% chance: Single Noun
            name = noun;
        } else if (formatRoll < 0.35) {
            // 15% chance: Single Adjective
            name = adj;
        } else if (formatRoll < 0.5) {
            // 15% chance: Noun + Suffix
            name = `${noun}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
        } else {
            // 50% chance: Adj + Noun
            name = `${adj}${noun}`;
            // 30% chance to add a gaming suffix to the compound
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

let grid = []; // 2D array: 0=empty, 1=player1
let playerPos = { x: 25, y: 25 };
let visualPos = { x: 25 * CELL_SIZE, y: 25 * CELL_SIZE };
let currentDir = { dx: 0, dy: 1 };
let nextDir = { dx: 0, dy: 1 };
let path = [];
let territoryCount = 0;
let collisionCell = null;
let isKing = false;

let lastTime = 0;
let moveTimer = 0;
const moveInterval = 100; // ms per grid step

// --- Menu Logic ---
function updateInputWidth() {
    widthCalcSpan.textContent = usernameInput.value || ' ';
    // The span is absolute & hidden, we just read its width
    usernameInput.style.width = widthCalcSpan.offsetWidth + 'px';
}

usernameInput.value = playerName;
updateInputWidth();

let isIntentionalFocus = false;

function clearDefaultName() {
    isIntentionalFocus = true;
    if (!hasModifiedName) {
        usernameInput.value = '';
        playerName = '';
        updateInputWidth();
    }
}

usernameInput.addEventListener('mousedown', clearDefaultName);
usernameInput.addEventListener('touchstart', clearDefaultName, {passive: true});

usernameInput.addEventListener('focus', () => {
    if (!isIntentionalFocus) {
        usernameInput.blur();
    }
    isIntentionalFocus = false; // Reset for next interaction
});

usernameInput.addEventListener('input', () => {
    hasModifiedName = true;
    playerName = usernameInput.value.trim();
    updateInputWidth();
});

// Color Selection
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColorKey = swatch.dataset.color;
        selectedColorHex = COLORS[selectedColorKey];
    });
});

// Start / Restart Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function closeApp() {
    window.open('', '_self', '');
    window.close();
    window.location.href = "about:blank"; // Fallback
}

quitBtn.addEventListener('click', closeApp);
quitGameBtn.addEventListener('click', closeApp);

quitToMenuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    canvas.classList.add('hidden');
    leaderboard.classList.add('hidden');
});

// --- Core Game Logic ---
function startGame() {
    initAudio();

    // Reset State
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    playerPos = { x: 25, y: 25 };
    visualPos = { x: playerPos.x * CELL_SIZE, y: playerPos.y * CELL_SIZE };
    currentDir = { dx: 0, dy: 1 };
    nextDir = { dx: 0, dy: 1 };
    path = [];
    territoryCount = 0;
    collisionCell = null;
    isKing = false;

    // Generate dummy bots for the leaderboard BEFORE updating territory count
    const availableColors = Object.values(COLORS).filter(c => c !== selectedColorHex && c !== COLORS.gridLines && c !== COLORS.pathOpacity);
    dummyBots = [];
    let takenNames = [playerName || "Player"];
    for (let i = 0; i < 4; i++) {
        let botName = generateFunnyName(takenNames);
        takenNames.push(botName);
        dummyBots.push({
            name: botName,
            color: availableColors[i % availableColors.length],
            percent: (Math.random() * 8 + 2) // Random static territory between 2% and 10%
        });
    }

    // Create initial 3x3 base
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            grid[playerPos.x + dx][playerPos.y + dy] = 1;
        }
    }
    updateTerritoryCount();

    // UI Updates
    menuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    leaderboard.classList.remove('hidden');
    canvas.classList.remove('hidden');

    isPlaying = true;
    document.body.classList.add('playing-cursor-hide');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateTerritoryCount() {
    territoryCount = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[x][y] === 1) territoryCount++;
        }
    }
    const percent = ((territoryCount / TOTAL_CELLS) * 100);

    // Build player array
    let players = [
        { name: playerName || "Player", color: selectedColorHex, percent: percent, isReal: true },
        ...dummyBots
    ];

    // Sort descending
    players.sort((a, b) => b.percent - a.percent);

    // Check if real player is 1st
    isKing = players[0].isReal;

    // Render Leaderboard
    leaderboard.innerHTML = '';
    players.forEach((p, index) => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        if (p.isReal) {
            entry.classList.add('highlighted-player');
        }

        const rank = document.createElement('span');
        rank.className = 'leaderboard-rank';
        rank.textContent = `#${index + 1}`;

        const name = document.createElement('span');
        name.className = 'leaderboard-name';
        name.style.color = p.color;

        if (index === 0) {
            name.innerHTML = `<svg width="16" height="13" viewBox="-9 -14 18 15" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:-1px; margin-right:4px;">
                <path d="M -7,0 L 7,0 L 9,-10 L 3.5,-4 L 0,-13 L -3.5,-4 L -9,-10 Z" fill="#FFCC00" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));"/>
            </svg>`;
            name.appendChild(document.createTextNode(p.name));
        } else {
            name.textContent = p.name;
        }

        const score = document.createElement('span');
        score.className = 'leaderboard-score';
        score.textContent = `${p.percent.toFixed(2)}%`;

        entry.appendChild(rank);
        entry.appendChild(name);
        entry.appendChild(score);
        leaderboard.appendChild(entry);
    });

    if (territoryCount >= TOTAL_CELLS && isPlaying) {
        die(true);
    }
}

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
    if (!actx) return;
    
    const osc = actx.createOscillator();
    const gainNode = actx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.28, actx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + 0.3);
}

function playTurnSound() {
    if (!actx) return;
    
    const osc = actx.createOscillator();
    const gainNode = actx.createGain();

    osc.type = 'sine';
    // A subtle high pitched pop/tick
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.05);

    // Uniform volume matching the hit sound
    gainNode.gain.setValueAtTime(0.28, actx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + 0.05);
}

function die(isWin = false) {
    isPlaying = false;
    document.body.classList.remove('playing-cursor-hide');
    gameOverScreen.classList.remove('hidden');

    if (isWin) {
        gameOverTitle.textContent = "You Win!";
        gameOverTitle.style.color = "#34C759"; // green
    } else {
        playHitSound();
        gameOverTitle.textContent = "Game Over!";
        gameOverTitle.style.color = "#FF3B30"; // red
    }

    const percent = ((territoryCount / TOTAL_CELLS) * 100).toFixed(2);
    gameOverStats.textContent = isWin ? "100% Territory Captured!" : `Final Score: ${percent}%`;
}

function movePlayer() {
    currentDir = nextDir;
    let oldPos = { x: playerPos.x, y: playerPos.y };
    playerPos.x += currentDir.dx;
    playerPos.y += currentDir.dy;

    // Bounds check
    if (playerPos.x < 0 || playerPos.x >= GRID_SIZE || playerPos.y < 0 || playerPos.y >= GRID_SIZE) {
        collisionCell = {
            x: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x)),
            y: Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y))
        };
        die();
        return;
    }

    // Hit own path check
    for (let p of path) {
        if (p.x === playerPos.x && p.y === playerPos.y) {
            collisionCell = { x: playerPos.x, y: playerPos.y };
            die();
            return;
        }
    }

    // Leave trail BEHIND the player if the cell they just left was empty
    if (grid[oldPos.x][oldPos.y] === 0) {
        path.push({ x: oldPos.x, y: oldPos.y });
    }

    const state = grid[playerPos.x][playerPos.y];

    if (state === 1) {
        // In own territory
        if (path.length > 0) {
            capturePath();
        }
    }
}

function capturePath() {
    // 1. Draw boundary
    for (let p of path) {
        grid[p.x][p.y] = 1;
    }
    path = [];

    // 2. Flood fill outside to find empty interior
    fillEnclosedArea();
    updateTerritoryCount();
}

function fillEnclosedArea() {
    // A simple approach: Flood fill from edges (0,0 to GRID_SIZE,GRID_SIZE)
    // Any 0 cell connected to edge remains 0. Any 0 cell NOT connected to edge becomes 1.
    let tempGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    let queue = [];

    // Add all edge cells to queue if they are 0
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if ((x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) && grid[x][y] === 0) {
                tempGrid[x][y] = 2; // 2 means "outside"
                queue.push({ x, y });
            }
        }
    }

    const dirs = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

    // BFS flood fill
    let head = 0;
    while (head < queue.length) {
        let curr = queue[head++];
        for (let dir of dirs) {
            let nx = curr.x + dir.dx;
            let ny = curr.y + dir.dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[nx][ny] === 0 && tempGrid[nx][ny] === 0) {
                    tempGrid[nx][ny] = 2;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    // Anything still 0 in tempGrid and 0 in actual grid is enclosed!
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[x][y] === 0 && tempGrid[x][y] === 0) {
                grid[x][y] = 1;
            }
        }
    }
}

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;

    // Prevent default scrolling for arrows/space
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    let oldNextDir = { dx: nextDir.dx, dy: nextDir.dy };

    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentDir.dy !== 1) {
        nextDir = { dx: 0, dy: -1 };
    } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && currentDir.dy !== -1) {
        nextDir = { dx: 0, dy: 1 };
    } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && currentDir.dx !== 1) {
        nextDir = { dx: -1, dy: 0 };
    } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && currentDir.dx !== -1) {
        nextDir = { dx: 1, dy: 0 };
    }

    if (oldNextDir.dx !== nextDir.dx || oldNextDir.dy !== nextDir.dy) {
        playTurnSound();
    }
});

// Touch Swipes
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

window.addEventListener('touchmove', e => {
    if (isPlaying) e.preventDefault(); // Prevent scrolling while playing
}, { passive: false });

window.addEventListener('touchend', e => {
    if (!isPlaying) return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;

    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    let oldNextDir = { dx: nextDir.dx, dy: nextDir.dy };

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (dx > 30 && currentDir.dx !== -1) nextDir = { dx: 1, dy: 0 };
        else if (dx < -30 && currentDir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    } else {
        // Vertical
        if (dy > 30 && currentDir.dy !== -1) nextDir = { dx: 0, dy: 1 };
        else if (dy < -30 && currentDir.dy !== 1) nextDir = { dx: 0, dy: -1 };
    }

    if (oldNextDir.dx !== nextDir.dx || oldNextDir.dy !== nextDir.dy) {
        playTurnSound();
    }
});

// --- Render Loop ---
function drawRect(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

function gameLoop(time) {
    if (!isPlaying) return;

    let dt = time - lastTime;
    if (dt > 1000) dt = 16; // Prevent massive jumps if tab was inactive
    lastTime = time;

    // Movement Logic
    moveTimer += dt;
    while (moveTimer >= moveInterval) {
        movePlayer();
        moveTimer -= moveInterval;
        if (!isPlaying) {
            drawGame(1.0); // Draw the final state before stopping
            return;
        }
    }

    let progress = moveTimer / moveInterval;
    drawGame(progress);
    requestAnimationFrame(gameLoop);
}

function drawGame(progress) {
    let targetX = playerPos.x * CELL_SIZE;
    let targetY = playerPos.y * CELL_SIZE;

    // Previous physical pos
    let prevX = (playerPos.x - currentDir.dx) * CELL_SIZE;
    let prevY = (playerPos.y - currentDir.dy) * CELL_SIZE;

    visualPos.x = prevX + (targetX - prevX) * progress;
    visualPos.y = prevY + (targetY - prevY) * progress;

    // --- Draw ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid Lines
    ctx.strokeStyle = COLORS.gridLines;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, 800);
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(800, i * CELL_SIZE);
    }
    ctx.stroke();

    // Territories
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[x][y] === 1) {
                drawRect(x, y, selectedColorHex);
            }
        }
    }

    // Path
    // To match Swift's path opacity effect
    ctx.globalAlpha = 0.5;
    for (let p of path) {
        drawRect(p.x, p.y, selectedColorHex);
    }
    ctx.globalAlpha = 1.0;

    // Player
    if (!isPlaying && typeof collisionCell !== 'undefined' && collisionCell) {
        // Explode the head at the collision cell
        let cx = collisionCell.x * CELL_SIZE;
        let cy = collisionCell.y * CELL_SIZE;
        ctx.fillStyle = '#FF3B30'; // Bright iOS Red
        ctx.shadowColor = 'rgba(255, 59, 48, 1)';
        ctx.shadowBlur = 15;
        // Draw it slightly larger to emphasize the collision
        ctx.fillRect(cx - 2, cy - 2, CELL_SIZE + 4, CELL_SIZE + 4);
        ctx.shadowBlur = 0;

        // Draw Hitmarker
        let centerX = cx + CELL_SIZE / 2;
        let centerY = cy + CELL_SIZE / 2;
        let hmSize = CELL_SIZE * 0.8;

        ctx.strokeStyle = 'white';
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
    } else {
        ctx.fillStyle = selectedColorHex;
        // Draw slightly larger/shadowed box for player head
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 5;
        ctx.fillRect(visualPos.x, visualPos.y, CELL_SIZE, CELL_SIZE);
        ctx.shadowBlur = 0; // reset

        // Draw Crown if King
        if (isKing) {
            let cx = visualPos.x + CELL_SIZE / 2;
            let cy = visualPos.y - 6; // base of the crown
            let w = 14;
            let h = 10;

            ctx.fillStyle = '#FFCC00'; // Gold color
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;

            ctx.beginPath();
            ctx.moveTo(cx - w/2, cy); // bottom left
            ctx.lineTo(cx + w/2, cy); // bottom right
            ctx.lineTo(cx + w/2 + 2, cy - h); // top right peak
            ctx.lineTo(cx + w/4, cy - h/2 + 1); // right valley
            ctx.lineTo(cx, cy - h - 3); // center peak
            ctx.lineTo(cx - w/4, cy - h/2 + 1); // left valley
            ctx.lineTo(cx - w/2 - 2, cy - h); // top left peak
            ctx.closePath();

            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}
