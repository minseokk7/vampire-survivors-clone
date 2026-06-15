// Global variables
let canvas, ctx;
let lastTime = 0;
let gameTime = 0; // Real seconds passed in game
let isGameActive = false;
let isPaused = false;

// Game Entities
let player;
let enemyManager;
let expManager;
let globalParticleSystem; // Accessible to enemy.js
let camera = { x: 0, y: 0 };

// UI Elements
const ui = {
    mainMenu: null,
    gameOver: null,
    levelUp: null,
    timeDisplay: null,
    healthFill: null,
    cardsContainer: null,
    finalTime: null,
    finalLevel: null
};

// Map Boundaries
const MAP_SIZE = { width: 5000, height: 5000 };

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // UI Setup
    ui.mainMenu = document.getElementById('main-menu');
    ui.gameOver = document.getElementById('game-over-screen');
    ui.levelUp = document.getElementById('level-up-screen');
    ui.timeDisplay = document.getElementById('time-display');
    ui.healthFill = document.getElementById('health-bar-fill');
    ui.cardsContainer = document.getElementById('upgrade-cards-container');
    ui.finalTime = document.getElementById('final-time');
    ui.finalLevel = document.getElementById('final-level');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Draw background for main menu before starting
    drawGrid(0, 0);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startGame() {
    ui.mainMenu.classList.remove('active');
    ui.gameOver.classList.remove('active');
    ui.levelUp.classList.remove('active');
    
    player = new Player(0, 0);
    player.addWeapon(Fireball); // Starting weapon
    
    enemyManager = new EnemyManager();
    expManager = new ExperienceManager();
    globalParticleSystem = new ParticleSystem();
    
    gameTime = 0;
    isGameActive = true;
    isPaused = false;
    lastTime = performance.now();
    
    updateHealthUI();
    
    requestAnimationFrame(gameLoop);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateHealthUI() {
    if (player) {
        const percentage = Math.max(0, (player.health / player.maxHealth) * 100);
        ui.healthFill.style.width = `${percentage}%`;
        
        // Color changes based on health
        if (percentage < 25) ui.healthFill.style.backgroundColor = '#e53935';
        else if (percentage < 50) ui.healthFill.style.backgroundColor = '#fb8c00';
        else ui.healthFill.style.backgroundColor = 'var(--health-color)';
    }
}

function showLevelUpScreen(newLevel) {
    isPaused = true;
    ui.levelUp.classList.add('active');
    ui.cardsContainer.innerHTML = '';
    
    // Select 3 random options (or all if < 3)
    const options = [...WEAPON_TYPES].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    options.forEach(opt => {
        const isUpgrade = player.hasWeapon(opt.class);
        const currentWeapon = isUpgrade ? player.getWeapon(opt.class) : null;
        
        // Prevent upgrading past level 5
        if (currentWeapon && currentWeapon.level >= 5) {
            // Pick a different option or just return if no options left
            // For simplicity, we just won't show maxed out cards
            return;
        }

        const nextLevel = isUpgrade ? currentWeapon.level + 1 : 1;
        
        let desc = opt.description;
        if (isUpgrade) {
            if (nextLevel === 3 && opt.perk3) desc = "LV3 PERK: " + opt.perk3;
            else if (nextLevel === 5 && opt.perk5) desc = "LV5 EVOLUTION: " + opt.perk5;
            else desc = "Damage and Cooldown improved.";
        }
        
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon" style="background: ${opt.iconBg}">${opt.iconText}</div>
            <div class="upgrade-title">${opt.name}</div>
            <div class="upgrade-desc">${desc}</div>
            <div class="upgrade-level">${isUpgrade ? 'Upgrade to LV ' + nextLevel : 'New Weapon!'}</div>
        `;
        
        card.addEventListener('click', () => {
            if (isUpgrade) {
                currentWeapon.upgrade();
            } else {
                player.addWeapon(opt.class);
            }
            ui.levelUp.classList.remove('active');
            isPaused = false;
            lastTime = performance.now(); // Reset delta time
            requestAnimationFrame(gameLoop);
        });
        
        ui.cardsContainer.appendChild(card);
    });
}

function gameOver() {
    isGameActive = false;
    ui.gameOver.classList.add('active');
    ui.finalTime.innerText = formatTime(gameTime);
    ui.finalLevel.innerText = expManager.level;
}

function drawGrid(camX, camY) {
    const tileSize = 150;
    // Calculate top-left visible tile coordinates
    const startCol = Math.floor(camX / tileSize);
    const startRow = Math.floor(camY / tileSize);
    
    // Draw grassy background pattern filling the screen
    for (let col = startCol - 1; col <= startCol + Math.ceil(canvas.width / tileSize) + 1; col++) {
        for (let row = startRow - 1; row <= startRow + Math.ceil(canvas.height / tileSize) + 1; row++) {
            const x = col * tileSize;
            const y = row * tileSize;
            
            // Pseudo-random grass patches based on grid coordinates
            const hash = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453);
            
            // Choose between two dark green/brownish colors
            if (hash % 1 > 0.5) {
                ctx.fillStyle = "#162014"; // Darker green
            } else {
                ctx.fillStyle = "#1a2517"; // Slightly lighter green
            }
            ctx.fillRect(x - camX, y - camY, tileSize + 1, tileSize + 1); // +1 prevents gaps
            
            // Draw subtle details (grass clumps / dirt)
            if (hash % 1 > 0.8) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
                ctx.beginPath();
                ctx.arc(x - camX + tileSize/2, y - camY + tileSize/2, 12, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
}

function gameLoop(currentTime) {
    if (!isGameActive) return;
    
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap dt to prevent huge jumps
    lastTime = currentTime;

    if (!isPaused) {
        // Update Game State
        gameTime += dt;
        ui.timeDisplay.innerText = formatTime(gameTime);
        
        player.update(dt, MAP_SIZE);
        updateHealthUI();
        
        if (player.isDead) {
            gameOver();
            return;
        }

        player.weapons.forEach(w => w.update(dt, enemyManager.enemies));
        enemyManager.update(dt, player, expManager);
        expManager.update(dt, player, (newLevel) => {
            player.level = newLevel; // Sync for global damage scaling
            isPaused = true;
            showLevelUpScreen(newLevel);
        });
        globalParticleSystem.update(dt);
        
        // Update Camera
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }

    // Render
    ctx.fillStyle = "var(--bg-color)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid(camera.x, camera.y);
    
    expManager.draw(ctx, camera.x, camera.y);
    enemyManager.draw(ctx, camera.x, camera.y);
    player.weapons.forEach(w => w.draw(ctx, camera.x, camera.y));
    player.draw(ctx, camera.x, camera.y);
    globalParticleSystem.draw(ctx, camera.x, camera.y);

    if (!isPaused && isGameActive) {
        requestAnimationFrame(gameLoop);
    }
}

// Start up
window.onload = init;
