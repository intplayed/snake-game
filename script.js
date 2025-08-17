// Game constants
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const INITIAL_SPEED = 150;

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
    gameLoop: null
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
        return head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE || 
               head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE;
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
        this.position = {
            x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
            y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
        };
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

// Game functions
function startGame() {
    if (game.isRunning) return;
    
    game.isRunning = true;
    game.score = 0;
    game.speed = INITIAL_SPEED;
    
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
    
    // Render game objects
    food.render();
    snake.render();
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

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

// Initial render
render();