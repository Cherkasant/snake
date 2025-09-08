(function() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const restartBtn = document.getElementById('restart');
    const speedBtn = document.getElementById('speed');

    // Logical grid size (independent of CSS size)
    const gridCellSize = 20; // pixels per cell in canvas space
    const gridCells = canvas.width / gridCellSize; // assumes square

    // Game state
    let snake = [{ x: 8, y: 10 }];
    let direction = { x: 1, y: 0 }; // moving right initially
    let nextDirection = { x: 1, y: 0 };
    let food = spawnFood();
    let score = 0;
    let speedMs = 120; // effective speed in ms between ticks (lower is faster)
    const baseSpeedMs = 120; // starting speed
    const minSpeedMs = 60; // minimum speed cap
    // dynamicSpeedMs decreases as score increases; speedMs = dynamicSpeedMs * modeMultiplier
    let dynamicSpeedMs = baseSpeedMs;
    const speedModes = ['Slow', 'Normal', 'Fast'];
    let speedModeIndex = 1; // Normal
    let lastTick = 0;
    let gameOver = false;

    function spawnFood() {
        while (true) {
            const position = {
                x: Math.floor(Math.random() * gridCells),
                y: Math.floor(Math.random() * gridCells)
            };
            const onSnake = snake.some(s => s.x === position.x && s.y === position.y);
            if (!onSnake) return position;
        }
    }

    function resetGame() {
        snake = [{ x: 8, y: 10 }];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        food = spawnFood();
        score = 0;
        dynamicSpeedMs = baseSpeedMs;
        applySpeedMode();
        lastTick = 0;
        gameOver = false;
        scoreEl.textContent = String(score);
        window.requestAnimationFrame(loop);
    }

    function loop(timestamp) {
        if (gameOver) return;
        if (timestamp - lastTick < speedMs) {
            window.requestAnimationFrame(loop);
            return;
        }
        lastTick = timestamp;

        // Update
        direction = nextDirection;
        const newHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // Wall collision
        if (newHead.x < 0 || newHead.y < 0 || newHead.x >= gridCells || newHead.y >= gridCells) {
            gameOver = true;
            draw(true);
            return;
        }
        // Self collision
        if (snake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) {
            gameOver = true;
            draw(true);
            return;
        }

        snake.unshift(newHead);
        const ateFood = newHead.x === food.x && newHead.y === food.y;
        if (ateFood) {
            score += 1;
            scoreEl.textContent = String(score);
            // Slightly speed up base pace, then apply mode multiplier
            dynamicSpeedMs = Math.max(minSpeedMs, dynamicSpeedMs - 2);
            applySpeedMode();
            food = spawnFood();
        } else {
            snake.pop();
        }

        draw(false);
        window.requestAnimationFrame(loop);
    }

    function draw(showGameOver) {
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridCells; i++) {
            const p = i * gridCellSize + 0.5; // crisp 1px lines
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(canvas.width, p);
            ctx.stroke();
        }

        // Food
        ctx.fillStyle = '#ef4444';
        roundedRect(food.x * gridCellSize, food.y * gridCellSize, gridCellSize, gridCellSize, 4);
        ctx.fill();

        // Snake
        ctx.fillStyle = '#22c55e';
        snake.forEach((segment, index) => {
            const radius = index === 0 ? 6 : 4;
            roundedRect(segment.x * gridCellSize, segment.y * gridCellSize, gridCellSize, gridCellSize, radius);
            ctx.fill();
        });

        if (showGameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#e5e7eb';
            ctx.textAlign = 'center';
            ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
            ctx.fillText('Game Over - Press Restart', canvas.width / 2, canvas.height / 2);
        }
    }

    function roundedRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function handleKey(e) {
        const key = e.key.toLowerCase();
        const isHorizontal = direction.x !== 0;
        const isVertical = direction.y !== 0;

        if ((key === 'arrowup' || key === 'w') && !isVertical) {
            nextDirection = { x: 0, y: -1 };
        } else if ((key === 'arrowdown' || key === 's') && !isVertical) {
            nextDirection = { x: 0, y: 1 };
        } else if ((key === 'arrowleft' || key === 'a') && !isHorizontal) {
            nextDirection = { x: -1, y: 0 };
        } else if ((key === 'arrowright' || key === 'd') && !isHorizontal) {
            nextDirection = { x: 1, y: 0 };
        }
    }

    // Touch controls (simple swipe)
    (function setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let active = false;
        canvas.addEventListener('touchstart', (e) => {
            active = true;
            const t = e.touches[0];
            touchStartX = t.clientX;
            touchStartY = t.clientY;
        }, { passive: true });
        canvas.addEventListener('touchmove', (e) => {
            if (!active) return;
            const t = e.touches[0];
            const dx = t.clientX - touchStartX;
            const dy = t.clientY - touchStartY;
            if (Math.abs(dx) + Math.abs(dy) < 10) return;
            const isHorizontal = direction.x !== 0;
            const isVertical = direction.y !== 0;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && !isHorizontal) nextDirection = { x: 1, y: 0 };
                else if (dx < 0 && !isHorizontal) nextDirection = { x: -1, y: 0 };
            } else {
                if (dy > 0 && !isVertical) nextDirection = { x: 0, y: 1 };
                else if (dy < 0 && !isVertical) nextDirection = { x: 0, y: -1 };
            }
            active = false;
        }, { passive: true });
        canvas.addEventListener('touchend', () => { active = false; }, { passive: true });
    })();

    // Events
    window.addEventListener('keydown', handleKey);
    restartBtn.addEventListener('click', resetGame);
    speedBtn.addEventListener('click', () => {
        speedModeIndex = (speedModeIndex + 1) % speedModes.length;
        applySpeedMode();
    });

    function applySpeedMode() {
        const mode = speedModes[speedModeIndex];
        const multiplier = mode === 'Slow' ? 1.25 : mode === 'Fast' ? 0.75 : 1.0;
        speedMs = Math.max(minSpeedMs, Math.round(dynamicSpeedMs * multiplier));
        if (speedBtn) speedBtn.textContent = `Speed: ${mode}`;
    }

    // Initial draw and start
    applySpeedMode();
    draw(false);
    window.requestAnimationFrame(loop);
})();


