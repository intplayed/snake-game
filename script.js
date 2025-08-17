// Game constants
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const INITIAL_SPEED = 150;
const GRID_WIDTH = CANVAS_SIZE / GRID_SIZE;
const GRID_HEIGHT = CANVAS_SIZE / GRID_SIZE;

// Game settings
let gameSettings = {
    wrapAround: false,
    currentLevel: 1
};

// Level configurations
const LEVELS = {
    1: {
        name: "Classic",
        walls: [],
        wrapAround: false
    },
    2: {
        name: "Wrap Around",
        walls: [],
        wrapAround: true
    },
    3: {
        name: "Center Wall",
        walls: [
            {x: 9, y: 8}, {x: 10, y: 8}, {x: 11, y: 8},
            {x: 9, y: 9}, {x: 10, y: 9}, {x: 11, y: 9},
            {x: 9, y: 10}, {x: 10, y: 10}, {x: 11, y: 10}
        ],
        wrapAround: false
    },
    4: {
        name: "Maze",
        walls: [
            // Outer border gaps
            {x: 5, y: 0}, {x: 6, y: 0}, {x: 13, y: 0}, {x: 14, y: 0},
            {x: 0, y: 5}, {x: 0, y: 6}, {x: 0, y: 13}, {x: 0, y: 14},
            {x: 19, y: 5}, {x: 19, y: 6}, {x: 19, y: 13}, {x: 19, y: 14},
            {x: 5, y: 19}, {x: 6, y: 19}, {x: 13, y: 19}, {x: 14, y: 19},
            // Inner walls
            {x: 7, y: 7}, {x: 8, y: 7}, {x: 11, y: 7}, {x: 12, y: 7},
            {x: 7, y: 12}, {x: 8, y: 12}, {x: 11, y: 12}, {x: 12, y: 12}
        ],
        wrapAround: true
    }
};

// Game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Game state
let game = {
    isRunning: false,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    speed: INITIAL_SPEED,
    gameLoop: null,
    currentLevel: 1,
    walls: [],
    mode: 'single', // 'single' or 'multiplayer'
    players: {
        player1: { score: 0, snake: null },
        player2: { score: 0, snake: null }
    },
    currentPlayer: 'player1',
    roomCode: null,
    isHost: false
};

// Snake class
class Snake {
    constructor() {
        this.body = [
            { x: 10, y: 10 }
        ];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
    }

    move() {
        // Update direction
        this.direction = { ...this.nextDirection };
        
        // Calculate new head position
        const head = { ...this.body[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        // Add new head
        this.body.unshift(head);
    }

    grow() {
        // Don't remove tail when growing
    }

    shrink() {
        // Remove tail
        this.body.pop();
    }

    changeDirection(newDirection) {
        // Prevent reversing into itself
        if (this.direction.x !== -newDirection.x || this.direction.y !== -newDirection.y) {
            this.nextDirection = newDirection;
        }
    }

    checkSelfCollision() {
        const head = this.body[0];
        return this.body.slice(1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );
    }

    checkWallCollision() {
        const head = this.body[0];
        const level = LEVELS[game.currentLevel];
        
        // Check boundary collision (only if wrap-around is disabled)
        if (!level.wrapAround) {
            if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
                return true;
            }
        }
        
        // Check wall collision
        return game.walls.some(wall => wall.x === head.x && wall.y === head.y);
    }

    wrapPosition() {
        const head = this.body[0];
        const level = LEVELS[game.currentLevel];
        
        if (level.wrapAround) {
            // Wrap around screen edges
            if (head.x < 0) head.x = GRID_WIDTH - 1;
            if (head.x >= GRID_WIDTH) head.x = 0;
            if (head.y < 0) head.y = GRID_HEIGHT - 1;
            if (head.y >= GRID_HEIGHT) head.y = 0;
        }
    }

    render(playerColor = '#2ecc71') {
        this.body.forEach((segment, index) => {
            if (index === 0) {
                // Head - slightly different color
                ctx.fillStyle = playerColor === '#2ecc71' ? '#27ae60' : '#c0392b';
            } else {
                ctx.fillStyle = playerColor;
            }
            
            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
        });
    }
}

// Food class
class Food {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.generateNewPosition();
    }

    generateNewPosition() {
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 100) {
            this.position = {
                x: Math.floor(Math.random() * GRID_WIDTH),
                y: Math.floor(Math.random() * GRID_HEIGHT)
            };
            
            // Check if position is not on a wall
            validPosition = !game.walls.some(wall =>
                wall.x === this.position.x && wall.y === this.position.y
            );
            
            attempts++;
        }
    }

    checkCollision(snake) {
        const head = snake.body[0];
        return head.x === this.position.x && head.y === this.position.y;
    }

    render() {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(
            this.position.x * GRID_SIZE + 2,
            this.position.y * GRID_SIZE + 2,
            GRID_SIZE - 4,
            GRID_SIZE - 4
        );
    }
}

// Game objects
let snake = new Snake();
let snake2 = new Snake(); // Player 2 snake
let food = new Food();

// Initialize Player 2 snake position
snake2.body = [{ x: 5, y: 5 }];

// Initialize high score display
highScoreElement.textContent = game.highScore;

// Level management
function loadLevel(levelNum) {
    const level = LEVELS[levelNum];
    if (!level) return false;
    
    game.currentLevel = levelNum;
    game.walls = [...level.walls];
    gameSettings.wrapAround = level.wrapAround;
    
    // Update level display
    const levelElement = document.getElementById('levelName');
    if (levelElement) {
        levelElement.textContent = level.name;
    }
    
    return true;
}

function nextLevel() {
    const nextLevelNum = game.currentLevel + 1;
    if (LEVELS[nextLevelNum]) {
        loadLevel(nextLevelNum);
        return true;
    }
    return false;
}

function previousLevel() {
    const prevLevelNum = game.currentLevel - 1;
    if (LEVELS[prevLevelNum]) {
        loadLevel(prevLevelNum);
        return true;
    }
    return false;
}

// Multiplayer functions
function switchToSinglePlayer() {
    game.mode = 'single';
    document.getElementById('multiplayerInfo').style.display = 'none';
    document.querySelector('.game-info').style.display = 'flex';
    document.getElementById('singlePlayerBtn').classList.add('active');
    document.getElementById('multiPlayerBtn').classList.remove('active');
}

function switchToMultiplayer() {
    game.mode = 'multiplayer';
    document.getElementById('multiplayerInfo').style.display = 'block';
    document.querySelector('.game-info').style.display = 'none';
    document.getElementById('singlePlayerBtn').classList.remove('active');
    document.getElementById('multiPlayerBtn').classList.add('active');
}

function createRoom() {
    game.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    game.isHost = true;
    document.getElementById('roomCode').value = game.roomCode;
    alert(`Room created: ${game.roomCode}\n\nThis is LOCAL MULTIPLAYER on the same device.\nPlayer 1: Arrow Keys ↑↓←→\nPlayer 2: WASD Keys`);
}

function joinRoom() {
    const code = document.getElementById('roomCode').value.toUpperCase();
    if (code.length === 6) {
        game.roomCode = code;
        game.isHost = false;
        alert(`Joined room: ${code}\n\nThis is LOCAL MULTIPLAYER on the same device.\nPlayer 1: Arrow Keys ↑↓←→\nPlayer 2: WASD Keys`);
    } else {
        alert('Please enter a valid 6-character room code');
    }
}

// Game functions
function startGame() {
    if (game.isRunning) return;
    
    // No room required for local multiplayer
    
    game.isRunning = true;
    game.speed = INITIAL_SPEED;
    
    // Load current level
    loadLevel(game.currentLevel);
    
    if (game.mode === 'single') {
        // Single player mode
        game.score = 0;
        snake = new Snake();
        snake.direction = { x: 1, y: 0 };
        snake.nextDirection = { x: 1, y: 0 };
    } else {
        // Multiplayer mode - local multiplayer on same device
        game.players.player1.score = 0;
        game.players.player2.score = 0;
        
        // Reset both snakes with better starting positions
        snake = new Snake();
        snake.body = [{ x: 15, y: 10 }];
        snake.direction = { x: -1, y: 0 };
        snake.nextDirection = { x: -1, y: 0 };
        
        snake2 = new Snake();
        snake2.body = [{ x: 5, y: 10 }];
        snake2.direction = { x: 1, y: 0 };
        snake2.nextDirection = { x: 1, y: 0 };
        
        game.players.player1.snake = snake;
        game.players.player2.snake = snake2;
        
        // Show multiplayer instructions
        alert('Multiplayer started!\n\nPlayer 1 (Green): Arrow Keys ↑↓←→\nPlayer 2 (Red): WASD Keys\n\nBoth players use the same device.');
    }
    
    // Reset food
    food = new Food();
    ensureFoodNotOnSnake();
    
    // Update UI
    startBtn.style.display = 'none';
    restartBtn.style.display = 'inline-block';
    gameOverDiv.style.display = 'none';
    
    if (game.mode === 'single') {
        updateScore();
    } else {
        updateMultiplayerScore();
    }
    
    // Start game loop
    game.gameLoop = setInterval(gameUpdate, game.speed);
}

function endGame() {
    game.isRunning = false;
    clearInterval(game.gameLoop);
    
    // Update high score
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('snakeHighScore', game.highScore);
        highScoreElement.textContent = game.highScore;
    }
    
    // Show game over screen
    finalScoreElement.textContent = game.score;
    gameOverDiv.style.display = 'block';
    
    // Update UI
    startBtn.style.display = 'inline-block';
    restartBtn.style.display = 'none';
}

function gameUpdate() {
    if (game.mode === 'single') {
        // Single player logic
        snake.move();
        snake.wrapPosition();
        
        if (snake.checkWallCollision() || snake.checkSelfCollision()) {
            endGame();
            return;
        }
        
        if (food.checkCollision(snake)) {
            snake.grow();
            food.generateNewPosition();
            ensureFoodNotOnSnake();
            
            game.score += 10;
            updateScore();
            
            if (game.score % 50 === 0) {
                game.speed = Math.max(80, game.speed - 5);
                clearInterval(game.gameLoop);
                game.gameLoop = setInterval(gameUpdate, game.speed);
            }
        } else {
            snake.shrink();
        }
    } else {
        // Multiplayer logic
        snake.move();
        snake2.move();
        snake.wrapPosition();
        snake2.wrapPosition();
        
        // Check collisions for both players
        const player1Dead = snake.checkWallCollision() || snake.checkSelfCollision() || checkSnakeCollision(snake, snake2);
        const player2Dead = snake2.checkWallCollision() || snake2.checkSelfCollision() || checkSnakeCollision(snake2, snake);
        
        if (player1Dead || player2Dead) {
            endMultiplayerGame(player1Dead, player2Dead);
            return;
        }
        
        // Check food collision for both players
        if (food.checkCollision(snake)) {
            snake.grow();
            game.players.player1.score += 10;
            food.generateNewPosition();
            ensureFoodNotOnSnake();
        } else {
            snake.shrink();
        }
        
        if (food.checkCollision(snake2)) {
            snake2.grow();
            game.players.player2.score += 10;
            food.generateNewPosition();
            ensureFoodNotOnSnake();
        } else {
            snake2.shrink();
        }
        
        updateMultiplayerScore();
    }
    
    render();
}

function checkSnakeCollision(snake1, snake2) {
    const head = snake1.body[0];
    return snake2.body.some(segment => segment.x === head.x && segment.y === head.y);
}

function endMultiplayerGame(player1Dead, player2Dead) {
    game.isRunning = false;
    clearInterval(game.gameLoop);
    
    let winner = '';
    if (player1Dead && player2Dead) {
        winner = 'Draw!';
    } else if (player1Dead) {
        winner = 'Player 2 Wins!';
    } else if (player2Dead) {
        winner = 'Player 1 Wins!';
    }
    
    finalScoreElement.textContent = winner;
    gameOverDiv.style.display = 'block';
    
    startBtn.style.display = 'inline-block';
    restartBtn.style.display = 'none';
}

function ensureFoodNotOnSnake() {
    let attempts = 0;
    while (attempts < 100) {
        let collision = false;
        
        // Check collision with player 1 snake
        if (snake.body.some(segment =>
            segment.x === food.position.x && segment.y === food.position.y)) {
            collision = true;
        }
        
        // Check collision with player 2 snake in multiplayer mode
        if (game.mode === 'multiplayer' && snake2.body.some(segment =>
            segment.x === food.position.x && segment.y === food.position.y)) {
            collision = true;
        }
        
        if (!collision) break;
        
        food.generateNewPosition();
        attempts++;
    }
}

function updateScore() {
    scoreElement.textContent = game.score;
}

function updateMultiplayerScore() {
    document.getElementById('player1Score').textContent = game.players.player1.score;
    document.getElementById('player2Score').textContent = game.players.player2.score;
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid (optional)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_SIZE, i);
        ctx.stroke();
    }
    
    // Draw walls
    ctx.fillStyle = '#95a5a6';
    game.walls.forEach(wall => {
        ctx.fillRect(
            wall.x * GRID_SIZE,
            wall.y * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE
        );
    });
    
    // Render game objects
    food.render();
    
    if (game.mode === 'single') {
        snake.render('#2ecc71'); // Green for single player
    } else {
        snake.render('#2ecc71');  // Green for Player 1
        snake2.render('#e74c3c'); // Red for Player 2
    }
}

// Enhanced mobile detection
function isMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|yabrowser|mobile|phone|tablet/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    
    console.log('Mobile detection:', {
        userAgent: userAgent,
        isMobileUA: isMobileUA,
        isTouchDevice: isTouchDevice,
        isSmallScreen: isSmallScreen,
        screenWidth: window.innerWidth
    });
    
    return isMobileUA || isTouchDevice || isSmallScreen;
}

// Show mobile controls with better detection
function setupMobileControls() {
    const mobileControlsElement = document.getElementById('mobileControls');
    const desktopInstruction = document.querySelector('.desktop-instruction');
    const mobileInstruction = document.querySelector('.mobile-instruction');
    
    if (isMobile()) {
        console.log('Mobile device detected, showing mobile controls');
        if (mobileControlsElement) {
            mobileControlsElement.style.display = 'flex';
        }
        if (desktopInstruction) {
            desktopInstruction.style.display = 'none';
        }
        if (mobileInstruction) {
            mobileInstruction.style.display = 'block';
        }
    } else {
        console.log('Desktop device detected');
        if (mobileControlsElement) {
            mobileControlsElement.style.display = 'none';
        }
    }
}

// Setup mobile controls when DOM is ready
document.addEventListener('DOMContentLoaded', setupMobileControls);

// Also setup immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    setupMobileControls();
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Game mode buttons
document.getElementById('singlePlayerBtn').addEventListener('click', switchToSinglePlayer);
document.getElementById('multiPlayerBtn').addEventListener('click', switchToMultiplayer);

// Multiplayer room buttons
document.getElementById('createRoomBtn').addEventListener('click', createRoom);
document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);

// Level control buttons
document.getElementById('prevLevel').addEventListener('click', () => {
    if (!game.isRunning && previousLevel()) {
        render(); // Re-render to show new level
    }
});

document.getElementById('nextLevel').addEventListener('click', () => {
    if (!game.isRunning && nextLevel()) {
        render(); // Re-render to show new level
    }
});

// Simplified mobile control buttons
function addMobileControl(buttonId, direction) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const handleControl = () => {
        if (game.isRunning) {
            snake.changeDirection(direction);
        }
    };
    
    // Simple event handlers
    button.addEventListener('click', handleControl);
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleControl();
    });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, adding mobile controls');
    
    // Add controls for all directions
    addMobileControl('upBtn', { x: 0, y: -1 });
    addMobileControl('downBtn', { x: 0, y: 1 });
    addMobileControl('leftBtn', { x: -1, y: 0 });
    addMobileControl('rightBtn', { x: 1, y: 0 });
});

// Also add controls immediately in case DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    console.log('DOM already loaded, adding mobile controls immediately');
    setTimeout(() => {
        addMobileControl('upBtn', { x: 0, y: -1 });
        addMobileControl('downBtn', { x: 0, y: 1 });
        addMobileControl('leftBtn', { x: -1, y: 0 });
        addMobileControl('rightBtn', { x: 1, y: 0 });
    }, 100);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!game.isRunning) return;
    
    // Player 1 controls (Arrow keys)
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            snake.changeDirection({ x: 0, y: -1 });
            break;
        case 'ArrowDown':
            e.preventDefault();
            snake.changeDirection({ x: 0, y: 1 });
            break;
        case 'ArrowLeft':
            e.preventDefault();
            snake.changeDirection({ x: -1, y: 0 });
            break;
        case 'ArrowRight':
            e.preventDefault();
            snake.changeDirection({ x: 1, y: 0 });
            break;
    }
    
    // Player 2 controls (WASD keys) - only in multiplayer mode
    if (game.mode === 'multiplayer') {
        switch (e.key.toLowerCase()) {
            case 'w':
                e.preventDefault();
                snake2.changeDirection({ x: 0, y: -1 });
                break;
            case 's':
                e.preventDefault();
                snake2.changeDirection({ x: 0, y: 1 });
                break;
            case 'a':
                e.preventDefault();
                snake2.changeDirection({ x: -1, y: 0 });
                break;
            case 'd':
                e.preventDefault();
                snake2.changeDirection({ x: 1, y: 0 });
                break;
        }
    }
});

// Close game over screen when clicking outside
gameOverDiv.addEventListener('click', (e) => {
    if (e.target === gameOverDiv) {
        gameOverDiv.style.display = 'none';
    }
});

// Touch/Swipe gesture support
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!game.isRunning) return;
    
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    
    handleSwipe();
}, { passive: false });

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;
    
    // Check if swipe is long enough
    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
        return;
    }
    
    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
            snake.changeDirection({ x: 1, y: 0 }); // Right
        } else {
            snake.changeDirection({ x: -1, y: 0 }); // Left
        }
    } else {
        // Vertical swipe
        if (deltaY > 0) {
            snake.changeDirection({ x: 0, y: 1 }); // Down
        } else {
            snake.changeDirection({ x: 0, y: -1 }); // Up
        }
    }
}

// Only prevent scrolling on canvas
document.body.addEventListener('touchmove', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Additional mobile button improvements
document.addEventListener('DOMContentLoaded', () => {
    // Ensure mobile controls work on all mobile browsers
    const mobileButtons = document.querySelectorAll('.control-btn');
    mobileButtons.forEach(button => {
        // Add visual feedback
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', () => {
            button.style.transform = 'scale(1)';
        });
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        button.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    });
});

// Debug function for mobile testing
function debugMobileControls() {
    console.log('=== MOBILE DEBUG INFO ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Touch support:', 'ontouchstart' in window);
    console.log('Max touch points:', navigator.maxTouchPoints);
    console.log('Screen width:', window.innerWidth);
    console.log('Is mobile:', isMobile());
    
    const buttons = ['upBtn', 'downBtn', 'leftBtn', 'rightBtn'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        console.log(`${id}:`, btn ? 'found' : 'NOT FOUND');
        if (btn) {
            console.log(`${id} visible:`, window.getComputedStyle(btn).display !== 'none');
        }
    });
    
    const mobileControls = document.getElementById('mobileControls');
    console.log('Mobile controls element:', mobileControls ? 'found' : 'NOT FOUND');
    if (mobileControls) {
        console.log('Mobile controls visible:', window.getComputedStyle(mobileControls).display !== 'none');
    }
    
    alert('Debug info logged to console. Check browser developer tools.');
}

// Initialize game
loadLevel(1); // Load first level

// Initial render
render();

// Add debug functionality for mobile
if (isMobile()) {
    // Add debug button
    setTimeout(() => {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug';
        debugBtn.style.position = 'fixed';
        debugBtn.style.top = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.style.padding = '5px 10px';
        debugBtn.style.fontSize = '12px';
        debugBtn.style.background = 'red';
        debugBtn.style.color = 'white';
        debugBtn.onclick = debugMobileControls;
        document.body.appendChild(debugBtn);
        
        // Force mobile controls to be visible
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = 'flex';
            mobileControls.style.visibility = 'visible';
            console.log('Forced mobile controls to be visible');
        }
    }, 1000);
}