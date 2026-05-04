// --- DOM Elements ---
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hudName = document.getElementById('hud-name');
const hudPercent = document.getElementById('hud-percent');
const hudBlocks = document.getElementById('hud-blocks');
const gameOverStats = document.getElementById('game-over-stats');

const colorSwatches = document.querySelectorAll('.color-swatch');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const quitGameBtn = document.getElementById('quit-game-btn');

const usernameInput = document.getElementById('username-input');
const usernameDisplay = document.getElementById('username-display');
const gameOverTitle = document.getElementById('game-over-title');

// --- Colors ---
const COLORS = {
    indigo: '#5856D6',
    crimson: '#DC143C',
    emerald: '#50C878',
    amber: '#FFBF00',
    gridLines: '#E5E5EA',
    pathOpacity: 'rgba(255, 255, 255, 0.4)'
};

// --- Game Constants & State ---
const GRID_SIZE = 50;
const CELL_SIZE = 16; // 800 / 50
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

let isPlaying = false;
let selectedColorKey = 'indigo';
let selectedColorHex = COLORS.indigo;

function generateFunnyName() {
    const names = [
        "Sir Snax-a-Lot", "Captain Crunch", "The Blockfather", "Square Pants", 
        "Blocky Balboa", "Pixel Pioneer", "Paper Boy", "Lord of the Grid",
        "Color Conqueror", "Geometric Genius", "The Paintbrush", "Area 51"
    ];
    return names[Math.floor(Math.random() * names.length)];
}

let playerName = generateFunnyName();

let grid = []; // 2D array: 0=empty, 1=player1
let playerPos = { x: 25, y: 25 };
let visualPos = { x: 25 * CELL_SIZE, y: 25 * CELL_SIZE };
let currentDir = { dx: 0, dy: 1 };
let nextDir = { dx: 0, dy: 1 };
let path = [];
let territoryCount = 0;

let lastTime = 0;
let moveTimer = 0;
const moveInterval = 100; // ms per grid step

// --- Menu Logic ---
// Auto-size input field to match display span (simulating SwiftUI hack)
function updateInputWidth() {
    const text = usernameInput.value || ' ';
    usernameDisplay.textContent = text;
    usernameInput.style.width = usernameDisplay.offsetWidth + 'px';
    playerName = text.trim();
}

usernameInput.value = playerName;
usernameInput.addEventListener('input', updateInputWidth);
updateInputWidth(); // Init

// Swap Text to Input on click
usernameDisplay.addEventListener('click', () => {
    usernameDisplay.classList.add('hidden');
    usernameInput.classList.remove('hidden');
    usernameInput.focus();
});

usernameInput.addEventListener('blur', () => {
    usernameInput.classList.add('hidden');
    usernameDisplay.classList.remove('hidden');
    updateInputWidth();
});

// Hide input initially, show span
usernameInput.classList.add('hidden');
usernameDisplay.classList.remove('hidden');

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
    hud.classList.add('hidden');
    playerName = generateFunnyName();
    usernameInput.value = playerName;
    updateInputWidth();
});

// --- Core Game Logic ---
function startGame() {
    // Reset State
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    playerPos = { x: 25, y: 25 };
    visualPos = { x: playerPos.x * CELL_SIZE, y: playerPos.y * CELL_SIZE };
    currentDir = { dx: 0, dy: 1 };
    nextDir = { dx: 0, dy: 1 };
    path = [];
    territoryCount = 0;

    // Create initial 3x3 base
    for(let dx=-1; dx<=1; dx++) {
        for(let dy=-1; dy<=1; dy++) {
            grid[playerPos.x + dx][playerPos.y + dy] = 1;
        }
    }
    updateTerritoryCount();

    // UI Updates
    menuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    canvas.classList.remove('hidden');
    
    hudName.textContent = playerName === "" ? "Player" : playerName;
    hudName.style.color = selectedColorHex;

    isPlaying = true;
    document.body.classList.add('playing-cursor-hide');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateTerritoryCount() {
    territoryCount = 0;
    for(let x=0; x<GRID_SIZE; x++) {
        for(let y=0; y<GRID_SIZE; y++) {
            if(grid[x][y] === 1) territoryCount++;
        }
    }
    const percent = ((territoryCount / TOTAL_CELLS) * 100).toFixed(2);
    hudPercent.textContent = `${percent}%`;
    hudBlocks.textContent = `(${territoryCount} / ${TOTAL_CELLS})`;

    if (territoryCount >= TOTAL_CELLS && isPlaying) {
        die(true);
    }
}

function die(isWin = false) {
    isPlaying = false;
    document.body.classList.remove('playing-cursor-hide');
    gameOverScreen.classList.remove('hidden');
    
    if (isWin) {
        gameOverTitle.textContent = "You Win!";
        gameOverTitle.style.color = "#34C759"; // green
    } else {
        gameOverTitle.textContent = "Game Over";
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
        die();
        return;
    }

    // Hit own path check
    for (let p of path) {
        if (p.x === playerPos.x && p.y === playerPos.y) {
            die();
            return;
        }
    }

    // Leave trail BEHIND the player if the cell they just left was empty
    if (grid[oldPos.x][oldPos.y] === 0) {
        path.push({x: oldPos.x, y: oldPos.y});
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
    for(let x=0; x<GRID_SIZE; x++) {
        for(let y=0; y<GRID_SIZE; y++) {
            if ((x === 0 || x === GRID_SIZE-1 || y === 0 || y === GRID_SIZE-1) && grid[x][y] === 0) {
                tempGrid[x][y] = 2; // 2 means "outside"
                queue.push({x, y});
            }
        }
    }

    const dirs = [{dx:0,dy:1}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:-1,dy:0}];

    // BFS flood fill
    let head = 0;
    while(head < queue.length) {
        let curr = queue[head++];
        for(let dir of dirs) {
            let nx = curr.x + dir.dx;
            let ny = curr.y + dir.dy;
            if(nx>=0 && nx<GRID_SIZE && ny>=0 && ny<GRID_SIZE) {
                if(grid[nx][ny] === 0 && tempGrid[nx][ny] === 0) {
                    tempGrid[nx][ny] = 2;
                    queue.push({x: nx, y: ny});
                }
            }
        }
    }

    // Anything still 0 in tempGrid and 0 in actual grid is enclosed!
    for(let x=0; x<GRID_SIZE; x++) {
        for(let y=0; y<GRID_SIZE; y++) {
            if(grid[x][y] === 0 && tempGrid[x][y] === 0) {
                grid[x][y] = 1;
            }
        }
    }
}

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    
    // Prevent default scrolling for arrows/space
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentDir.dy !== 1) {
        nextDir = { dx: 0, dy: -1 };
    } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && currentDir.dy !== -1) {
        nextDir = { dx: 0, dy: 1 };
    } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && currentDir.dx !== 1) {
        nextDir = { dx: -1, dy: 0 };
    } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && currentDir.dx !== -1) {
        nextDir = { dx: 1, dy: 0 };
    }
});

// Touch Swipes
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

window.addEventListener('touchmove', e => {
    if(isPlaying) e.preventDefault(); // Prevent scrolling while playing
}, {passive: false});

window.addEventListener('touchend', e => {
    if(!isPlaying) return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (dx > 30 && currentDir.dx !== -1) nextDir = { dx: 1, dy: 0 };
        else if (dx < -30 && currentDir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    } else {
        // Vertical
        if (dy > 30 && currentDir.dy !== -1) nextDir = { dx: 0, dy: 1 };
        else if (dy < -30 && currentDir.dy !== 1) nextDir = { dx: 0, dy: -1 };
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
    for(let i=0; i<=GRID_SIZE; i++) {
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, 800);
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(800, i * CELL_SIZE);
    }
    ctx.stroke();

    // Territories
    for(let x=0; x<GRID_SIZE; x++) {
        for(let y=0; y<GRID_SIZE; y++) {
            if(grid[x][y] === 1) {
                drawRect(x, y, selectedColorHex);
            }
        }
    }

    // Path
    // To match Swift's path opacity effect
    ctx.globalAlpha = 0.5;
    for(let p of path) {
        drawRect(p.x, p.y, selectedColorHex);
    }
    ctx.globalAlpha = 1.0;

    // Player
    ctx.fillStyle = selectedColorHex;
    // Draw slightly larger/shadowed box for player head
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;
    ctx.fillRect(visualPos.x, visualPos.y, CELL_SIZE, CELL_SIZE);
    ctx.shadowBlur = 0; // reset
}
