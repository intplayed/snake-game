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
    walls: []
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

    render() {
        ctx.fillStyle = '#2ecc71';
        this.body.forEach((segment, index) => {
            if (index === 0) {
                // Head - slightly different color
                ctx.fillStyle = '#27ae60';
            } else {
                ctx.fillStyle = '#2ecc71';
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
let food = new Food();

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

// Game functions
function startGame() {
    if (game.isRunning) return;
    
    game.isRunning = true;
    game.score = 0;
    game.speed = INITIAL_SPEED;
    
    // Load current level
    loadLevel(game.currentLevel);
    
    // Reset snake
    snake = new Snake();
    snake.direction = { x: 1, y: 0 };
    snake.nextDirection = { x: 1, y: 0 };
    
    // Reset food
    food = new Food();
    ensureFoodNotOnSnake();
    
    // Update UI
    startBtn.style.display = 'none';
    restartBtn.style.display = 'inline-block';
    gameOverDiv.style.display = 'none';
    updateScore();
    
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
    // Move snake
    snake.move();
    
    // Handle wrap-around if enabled
    snake.wrapPosition();
    
    // Check collisions
    if (snake.checkWallCollision() || snake.checkSelfCollision()) {
        endGame();
        return;
    }
    
    // Check food collision
    if (food.checkCollision(snake)) {
        snake.grow();
        food.generateNewPosition();
        ensureFoodNotOnSnake();
        
        // Update score and speed
        game.score += 10;
        updateScore();
        
        // Increase speed slightly
        if (game.score % 50 === 0) {
            game.speed = Math.max(80, game.speed - 5);
            clearInterval(game.gameLoop);
            game.gameLoop = setInterval(gameUpdate, game.speed);
        }
    } else {
        snake.shrink();
    }
    
    render();
}

function ensureFoodNotOnSnake() {
    while (snake.body.some(segment => 
        segment.x === food.position.x && segment.y === food.position.y)) {
        food.generateNewPosition();
    }
}

function updateScore() {
    scoreElement.textContent = game.score;
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
    snake.render();
}

// Mobile detection
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|YaBrowser/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768) ||
           ('ontouchstart' in window);
}

// Show mobile controls if on mobile device
if (isMobile()) {
    document.getElementById('mobileControls').style.display = 'flex';
    document.querySelector('.desktop-instruction').style.display = 'none';
    document.querySelector('.mobile-instruction').style.display = 'block';
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

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

// Mobile control buttons
document.getElementById('upBtn').addEventListener('click', () => {
    if (game.isRunning) snake.changeDirection({ x: 0, y: -1 });
});

document.getElementById('downBtn').addEventListener('click', () => {
    if (game.isRunning) snake.changeDirection({ x: 0, y: 1 });
});

document.getElementById('leftBtn').addEventListener('click', () => {
    if (game.isRunning) snake.changeDirection({ x: -1, y: 0 });
});

document.getElementById('rightBtn').addEventListener('click', () => {
    if (game.isRunning) snake.changeDirection({ x: 1, y: 0 });
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!game.isRunning) return;
    
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

// Prevent scrolling on mobile when touching the game area
document.body.addEventListener('touchstart', (e) => {
    if (e.target === canvas || e.target.classList.contains('control-btn')) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', (e) => {
    if (e.target === canvas || e.target.classList.contains('control-btn')) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (e.target === canvas || e.target.classList.contains('control-btn')) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize game
loadLevel(1); // Load first level

// Initial render
render();