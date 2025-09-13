import React, { useState, useEffect, useRef, useCallback } from 'react'
import { atom, useAtom } from 'jotai'

type Point = { x: number; y: number }

// Define Jotai atoms
const snakeAtom = atom<Point[]>([{ x: 15, y: 15 }])
const directionAtom = atom<Point>({ x: 1, y: 0 })
const nextDirectionAtom = atom<Point>({ x: 1, y: 0 })
const foodsAtom = atom<Point[]>([])
const scoreAtom = atom<number>(0)
const gameOverAtom = atom<boolean>(false)
const speedModeAtom = atom<'Slow' | 'Normal' | 'Fast'>('Normal')
const themeAtom = atom<'dark' | 'light'>('dark')
// Food log for analysis
const foodLogAtom = atom<{position: Point, timestamp: number}[]>([])
// Track recent food positions to avoid repetition
const recentFoodsAtom = atom<Point[]>([])

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const lastTickRef = useRef<number>(0)

  // Game state with Jotai
  const [snake, setSnake] = useAtom(snakeAtom)
  const [direction, setDirection] = useAtom(directionAtom)
  const [nextDirection, setNextDirection] = useAtom(nextDirectionAtom)
  const [foods, setFoods] = useAtom(foodsAtom)
  const [score, setScore] = useAtom(scoreAtom)
  const [gameOver, setGameOver] = useAtom(gameOverAtom)
  const [speedMode, setSpeedMode] = useAtom(speedModeAtom)
  const [theme, setTheme] = useAtom(themeAtom)
  const [foodLog, setFoodLog] = useAtom(foodLogAtom)
  const [recentFoods, setRecentFoods] = useAtom(recentFoodsAtom)
  const [isRespawnScheduled, setIsRespawnScheduled] = useState<boolean>(false)

  // Refs to access current state in callbacks
  const snakeRef = useRef(snake)
  const recentFoodsRef = useRef(recentFoods)
  
  useEffect(() => {
    snakeRef.current = snake
    recentFoodsRef.current = recentFoods
  }, [snake, recentFoods])

  // Game constants
  const gridCellSize = 20
  const gridCells = 30 // 600px / 20px per cell (50% more space)
  const baseSpeedMs = 120
  const minSpeedMs = 60
  // Food is static - no movement

  // Calculate current speed based on mode only (no score acceleration)
  const getCurrentSpeed = useCallback(() => {
    const multiplier = speedMode === 'Slow' ? 1.25 : speedMode === 'Fast' ? 0.75 : 1.0
    return Math.round(baseSpeedMs * multiplier)
  }, [speedMode])

  // Food is static - doesn't move


  // Spawn single food item (static - no direction)
  const spawnFood = useCallback((): Point[] => {
    while (true) {
      const position: Point = {
        x: Math.floor(Math.random() * gridCells),
        y: Math.floor(Math.random() * gridCells)
      }
      // Check if position is on snake
      const onSnake = snakeRef.current.some(s => s.x === position.x && s.y === position.y)
      const inRecent = recentFoodsRef.current.some(f => f.x === position.x && f.y === position.y)
      if (!onSnake && !inRecent) {
        // Log food position with timestamp
        setFoodLog(prev => [...prev, {
          position: {x: position.x, y: position.y},
          timestamp: Date.now()
        }])
        // Update recent foods (keep last 5 positions)
        setRecentFoods(prev => {
          const updated = [...prev, position]
          return updated.length > 5 ? updated.slice(1) : updated
        })
        return [position]
      }
    }
  }, [gridCells, snake]) // Depends on gridCells and current snake state

  // Initialize food separately
  const initFood = useCallback(() => {
    const newFoods = spawnFood()
    console.log(`Initial foods: ${newFoods.length} items`)
    setFoods(newFoods)
  }, [spawnFood, setFoods])

  // Reset game
  const resetGame = useCallback(() => {
    setIsRespawnScheduled(false)
    setSnake([{ x: 15, y: 15 }])
    setDirection({ x: 1, y: 0 })
    setNextDirection({ x: 1, y: 0 })
    setScore(0)
    setGameOver(false)
    setFoodLog([]) // Reset food log on game restart
    setRecentFoods([]) // Reset recent foods on restart
    lastTickRef.current = 0
    initFood()
  }, [initFood, setSnake, setDirection, setNextDirection, setScore, setGameOver, setFoodLog, setRecentFoods])




  // Initialize game on mount
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      resetGame();
      isInitialMount.current = false;
    }
  }, [])

  // Initialize game on first render
  useEffect(() => {
    resetGame();
  }, [])

  // Initialize game on mount
  useEffect(() => {
    resetGame();
  }, [])

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
      
      // Check if head collides with food
      if (foods.length > 0) {
        const foodIndex = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y)
        const ateFood = foodIndex !== -1

        if (ateFood) {
          console.log(`Food eaten at (${foods[foodIndex].x}, ${foods[foodIndex].y})!`)
          setScore(prevScore => prevScore + 1)
          setFoods([]) // Remove food
          
          // Schedule new food to appear after 5 seconds if not already scheduled
          if (!isRespawnScheduled) {
            setIsRespawnScheduled(true)
            setTimeout(() => {
              const newFoods = spawnFood()
              setFoods(newFoods)
              setIsRespawnScheduled(false)
            }, 1000) // Reduced respawn delay to 1 second
          }
          
          return newSnake
        }
      }

      return newSnake.slice(0, -1)
    })

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameOver, nextDirection, getCurrentSpeed, spawnFood, setSnake, setDirection, setGameOver, setScore, setFoods, foods])

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

  // Draw function - now takes snake, foods and theme as parameters
  const draw = useCallback((ctx: CanvasRenderingContext2D, showGameOver: boolean, snake: Point[], foods: Point[], theme: 'dark' | 'light') => {
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
    foods.forEach(food => {
      roundedRect(ctx, food.x * gridCellSize, food.y * gridCellSize, gridCellSize, gridCellSize, 4)
      ctx.fill()
    })

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
  
  // Draw on canvas when state changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    console.log(`Drawing frame - Foods: ${foods.length} items with ${theme} theme`)
    draw(ctx, gameOver, snake, foods, theme)
  }, [snake, gameOver, foods, theme, draw])

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
  }, [direction, setNextDirection])

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
  }, [direction, setNextDirection])

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
        <p>Use arrow keys or WASD to move. Avoid walls and yourself.</p>
      </footer>
    </div>
  )
}

export default SnakeGame
