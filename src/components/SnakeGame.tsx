import React, { useState, useEffect, useRef, useCallback } from 'react'

type Point = { x: number; y: number }

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const lastTickRef = useRef<number>(0)

  // Game state
  const [snake, setSnake] = useState<Point[]>([{ x: 15, y: 15 }])
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 })
  const [nextDirection, setNextDirection] = useState<Point>({ x: 1, y: 0 })
  const [food, setFood] = useState<Point>({ x: 0, y: 0 })
  const [score, setScore] = useState<number>(0)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [speedMode, setSpeedMode] = useState<'Slow' | 'Normal' | 'Fast'>('Normal')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Use ref to track current snake state
  const snakeRef = useRef<Point[]>(snake)
  useEffect(() => {
    snakeRef.current = snake
  }, [snake])

  // Game constants
  const gridCellSize = 20
  const gridCells = 30 // 600px / 20px per cell (50% more space)
  const baseSpeedMs = 120
  const minSpeedMs = 60
  // Food is static - no movement

  // Calculate current speed based on score and mode
  const getCurrentSpeed = useCallback(() => {
    const dynamicSpeed = Math.max(minSpeedMs, baseSpeedMs - score * 2)
    const multiplier = speedMode === 'Slow' ? 1.25 : speedMode === 'Fast' ? 0.75 : 1.0
    return Math.max(minSpeedMs, Math.round(dynamicSpeed * multiplier))
  }, [score, speedMode])

  // Food is static - doesn't move


  // Spawn food (static - no direction)
  const spawnFood = useCallback((): Point => {
    while (true) {
      const position: Point = {
        x: Math.floor(Math.random() * gridCells),
        y: Math.floor(Math.random() * gridCells)
      }
      // Use snakeRef.current to get the latest snake state
      const onSnake = snakeRef.current.some(s => s.x === position.x && s.y === position.y)
      if (!onSnake) {
        console.log(`Spawning food at (${position.x}, ${position.y})`)
        return position
      }
    }
  }, [gridCells]) // Only depends on gridCells

  // Reset game
  const resetGame = useCallback(() => {
    setSnake([{ x: 15, y: 15 }])
    setDirection({ x: 1, y: 0 })
    setNextDirection({ x: 1, y: 0 })
    setScore(0)
    setGameOver(false)
    lastTickRef.current = 0
    const newFood = spawnFood()
    console.log(`Initial food position: (${newFood.x}, ${newFood.y})`)
    setFood(newFood)
  }, [spawnFood])

  // Initialize food on first render
  useEffect(() => {
    setFood(spawnFood())
  }, [spawnFood])


  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameOver) return

    // Snake movement timing
    const speedMs = getCurrentSpeed()
    if (timestamp - lastTickRef.current < speedMs) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }
    lastTickRef.current = timestamp

    setSnake(prevSnake => {
      setDirection(nextDirection)
      const newHead: Point = { 
        x: prevSnake[0].x + nextDirection.x, 
        y: prevSnake[0].y + nextDirection.y 
      }

      // Wall collision
      if (newHead.x < 0 || newHead.y < 0 || newHead.x >= gridCells || newHead.y >= gridCells) {
        setGameOver(true)
        return prevSnake
      }

      // Self collision
      if (prevSnake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true)
        return prevSnake
      }

      const newSnake = [newHead, ...prevSnake]
      // Use foodRef to get the current food position
      const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y

      if (ateFood) {
        console.log(`Food eaten at (${foodRef.current.x}, ${foodRef.current.y})! Respawning new food`)
        const newFoodPos = spawnFood()
        console.log(`New food position: (${newFoodPos.x}, ${newFoodPos.y})`)
        setScore(prevScore => prevScore + 1)
        setFood(newFoodPos)
        return newSnake
      } else {
        return newSnake.slice(0, -1)
      }
    })

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameOver, nextDirection, food, getCurrentSpeed, spawnFood])

  // Start game loop
  useEffect(() => {
    if (!gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop, gameOver])

  // Draw function - now takes snake, food and theme as parameters
  const draw = useCallback((ctx: CanvasRenderingContext2D, showGameOver: boolean, snake: Point[], food: Point, theme: 'dark' | 'light') => {
    const canvasSize = gridCells * gridCellSize
    
    // Set colors based on theme
    const backgroundColor = theme === 'dark' ? '#0f172a' : '#f1f5f9'
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'
    const foodColor = theme === 'dark' ? '#ef4444' : '#dc2626'
    const snakeColor = theme === 'dark' ? '#22c55e' : '#16a34a'
    const gameOverBg = theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'
    const gameOverText = theme === 'dark' ? '#e5e7eb' : '#1e293b'

    // Background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    // Grid (subtle)
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    for (let i = 0; i <= gridCells; i++) {
      const p = i * gridCellSize + 0.5
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, canvasSize)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, p)
      ctx.lineTo(canvasSize, p)
      ctx.stroke()
    }

    // Food
    ctx.fillStyle = foodColor
    roundedRect(ctx, food.x * gridCellSize, food.y * gridCellSize, gridCellSize, gridCellSize, 4)
    ctx.fill()

    // Snake
    ctx.fillStyle = snakeColor
    snake.forEach((segment, index) => {
      const radius = index === 0 ? 6 : 4
      roundedRect(ctx, segment.x * gridCellSize, segment.y * gridCellSize, gridCellSize, gridCellSize, radius)
      ctx.fill()
    })

    if (showGameOver) {
      ctx.fillStyle = gameOverBg
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      ctx.fillStyle = gameOverText
      ctx.textAlign = 'center'
      ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
      ctx.fillText('Game Over - Press Restart', canvasSize / 2, canvasSize / 2)
    }
  }, [])

  // Rounded rectangle helper
  const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // Create ref for food to access latest value in draw function
  const foodRef = useRef<Point>(food)
  useEffect(() => {
    foodRef.current = food
  }, [food])
  
  // Draw on canvas when state changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    console.log(`Drawing frame - Food at (${food.x}, ${food.y}) with ${theme} theme`)
    draw(ctx, gameOver, snake, food, theme)
  }, [snake, gameOver, food, draw, theme])

  // Keyboard controls
  const handleKey = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    const isHorizontal = direction.x !== 0
    const isVertical = direction.y !== 0

    if ((key === 'arrowup' || key === 'w') && !isVertical) {
      setNextDirection({ x: 0, y: -1 })
    } else if ((key === 'arrowdown' || key === 's') && !isVertical) {
      setNextDirection({ x: 0, y: 1 })
    } else if ((key === 'arrowleft' || key === 'a') && !isHorizontal) {
      setNextDirection({ x: -1, y: 0 })
    } else if ((key === 'arrowright' || key === 'd') && !isHorizontal) {
      setNextDirection({ x: 1, y: 0 })
    }
  }, [direction])

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const startX = touch.clientX - rect.left
    const startY = touch.clientY - rect.top

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const currentX = touch.clientX - rect.left
      const currentY = touch.clientY - rect.top

      const dx = currentX - startX
      const dy = currentY - startY

      if (Math.abs(dx) + Math.abs(dy) < 10) return

      const isHorizontal = direction.x !== 0
      const isVertical = direction.y !== 0

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && !isHorizontal) setNextDirection({ x: 1, y: 0 })
        else if (dx < 0 && !isHorizontal) setNextDirection({ x: -1, y: 0 })
      } else {
        if (dy > 0 && !isVertical) setNextDirection({ x: 0, y: 1 })
        else if (dy < 0 && !isVertical) setNextDirection({ x: 0, y: -1 })
      }

      document.removeEventListener('touchmove', handleTouchMove)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: true })
  }, [direction])

  // Event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Speed mode toggle
  const toggleSpeedMode = () => {
    setSpeedMode(prev => {
      if (prev === 'Slow') return 'Normal'
      if (prev === 'Normal') return 'Fast'
      return 'Slow'
    })
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Food is static - no movement

  return (
    <div className="container">
      <header>
        <h1>Snake</h1>
        <div className="scoreboard">
          <span>Score: </span><span>{score}</span>
        </div>
        <div className="scoreboard">
          <span>Speed: </span><span>{getCurrentSpeed()}ms</span>
        </div>
      </header>
      <canvas 
        ref={canvasRef}
        width={600} 
        height={600} 
        aria-label="Snake game canvas" 
        role="img"
        onTouchStart={handleTouchStart}
      />
      <div className="controls">
        <button onClick={resetGame} aria-label="Restart game">
          Restart
        </button>
        <button onClick={toggleSpeedMode} aria-label="Change speed">
          Speed: {speedMode}
        </button>
        <button onClick={toggleTheme} aria-label="Toggle theme">
          Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>
      <footer>
        <p>Use arrow keys or WASD to move. Avoid walls and yourself. Food is static and only appears at fixed positions.</p>
      </footer>
    </div>
  )
}

export default SnakeGame
