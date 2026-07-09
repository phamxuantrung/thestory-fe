import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Matter from 'matter-js';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import SuikaCanvas from './SuikaCanvas';
import './SuikaGame.css';
import { drawFruit, getFruit, FRUITS } from './suikaFruits';
import { playDropSound, playMergeSound, playWatermelonSound } from './suikaAudio';
import { treeService } from '../services/treeService';

const SuikaNextCanvas = ({ level }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 60;
    const height = 60;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const fruit = getFruit(level);
    // Draw the fruit in the center with a smaller radius (max 25)
    // The biggest starting fruit is level 3 (radius 38). Let's scale it down a bit for the preview box.
    const previewRadius = Math.min(25, fruit.radius);

    drawFruit(ctx, fruit, previewRadius, width / 2, height / 2, 0, false);

  }, [level]);

  return <canvas ref={canvasRef} style={{ width: '60px', height: '60px' }} />;
};

export default function SuikaGame() {
  const navigate = useNavigate();
  const sceneRef = useRef(null);
  const engineRef = useRef(null);

  const [score, setScore] = useState(0);
  const [nextFruitLevel, setNextFruitLevel] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [canDrop, setCanDrop] = useState(true);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [cursorX, setCursorX] = useState(null); // track pointer X for drop indicator
  const [isAiming, setIsAiming] = useState(false); // track drag-to-aim state

  const DROP_ZONE_HEIGHT = 60; // px in display coords (top strip)

  const [xuEarned, setXuEarned] = useState(0);
  const xuEarnedRef = useRef(0);
  const gameEndClaimed = useRef(false);

  const GAME_WIDTH = 400;
  const GAME_HEIGHT = 533; // 3:4 aspect ratio

  const getRandomNextFruit = () => Math.floor(Math.random() * 4); // 0 to 3

  useEffect(() => {
    // Initialize Matter.js
    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      World = Matter.World,
      Events = Matter.Events;

    const engine = Engine.create();
    engineRef.current = engine;
    const world = engine.world;

    // Create Walls
    const wallOptions = { isStatic: true, render: { visible: false }, friction: 0.1, restitution: 0.2, label: 'Wall' };
    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH + 100, 50, wallOptions);
    const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
    const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);

    World.add(world, [ground, leftWall, rightWall]);

    // Handle Collisions (Merging)
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((collision) => {
        const bodyA = collision.bodyA;
        const bodyB = collision.bodyB;

        if (bodyA.label.startsWith('Wall') || bodyB.label.startsWith('Wall')) return;

        const levelA = parseInt(bodyA.label);
        const levelB = parseInt(bodyB.label);

        if (levelA === levelB && !bodyA.isRemoving && !bodyB.isRemoving) {
          bodyA.isRemoving = true;
          bodyB.isRemoving = true;

          // Merge to next level
          const nextLevel = levelA + 1;

          setScore(s => s + (nextLevel * 10));

          if (nextLevel < FRUITS.length) {
            const nextFruit = getFruit(nextLevel);
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;

            const newBody = Bodies.circle(newX, newY, nextFruit.radius, {
              restitution: 0.2,
              friction: 0.1,
              label: nextLevel.toString(),
            });

            World.remove(world, bodyA);
            World.remove(world, bodyB);
            World.add(world, newBody);
            playMergeSound(nextLevel);
          } else {
            // Merged the biggest fruit! Watermelon!
            World.remove(world, bodyA);
            World.remove(world, bodyB);
            playWatermelonSound();
            // Maybe trigger confetti here!
          }
        }
      });
    });

    const runner = Runner.create();
    Runner.run(runner, engine);

    let consecutiveOverTicks = 0;
    // Game Loop for GameOver Check
    const checkGameOver = setInterval(() => {
      if (isGameOver) return;
      const bodies = engine.world.bodies;
      let over = false;
      for (const body of bodies) {
        // Skip walls and static bodies
        if (!body.label.startsWith('Wall') && !body.isStatic && !body.isDropping) {
          // If body is stationary and above danger line (y < 60)
          if (body.position.y - body.circleRadius < 60 && Math.abs(body.velocity.y) < 0.5 && Math.abs(body.velocity.x) < 0.5) {
            over = true;
            break;
          }
        }
      }
      
      if (over) {
        consecutiveOverTicks++;
        if (consecutiveOverTicks >= 3) {
          if (xuEarnedRef.current > 0 && !gameEndClaimed.current) {
            treeService.addReward(xuEarnedRef.current).catch(console.error);
            gameEndClaimed.current = true;
          }
          setIsGameOver(true);
          setCanDrop(false);
        }
      } else {
        consecutiveOverTicks = 0;
      }
    }, 1000);

    return () => {
      Runner.stop(runner);
      Engine.clear(engine);
      clearInterval(checkGameOver);
    };
  }, []); // Run once on mount

  const updateAimIndicator = (clientX, rect) => {
    const rawX = clientX - rect.left;
    const fruit = getFruit(nextFruitLevel);
    const visualRadius = fruit.radius * (rect.width / GAME_WIDTH);
    const x = Math.max(visualRadius, Math.min(rawX, rect.width - visualRadius));
    setCursorX(x);
  };

  const handlePointerDown = (e) => {
    if (!canDrop || isGameOver) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const rawY = e.clientY - rect.top;

    // Must start aiming inside the drop zone or close to it
    if (rawY > DROP_ZONE_HEIGHT + 20) return;

    setIsAiming(true);
    updateAimIndicator(e.clientX, rect);
  };

  const handlePointerMove = (e) => {
    if (isGameOver) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isAiming) {
      // If aiming, always update indicator regardless of Y
      updateAimIndicator(e.clientX, rect);
    } else {
      // If just hovering, only show indicator in drop zone
      const rawY = e.clientY - rect.top;
      if (rawY <= DROP_ZONE_HEIGHT) {
        updateAimIndicator(e.clientX, rect);
      } else {
        setCursorX(null);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isAiming || !canDrop || isGameOver) {
      setIsAiming(false);
      return;
    }
    
    setIsAiming(false);
    
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Use cursorX (visual pixels) or calculate from event if null
    let visualX = cursorX;
    if (visualX === null) {
      const rawX = e.clientX - rect.left;
      const fruit = getFruit(nextFruitLevel);
      const visualRadius = fruit.radius * (rect.width / GAME_WIDTH);
      visualX = Math.max(visualRadius, Math.min(rawX, rect.width - visualRadius));
    }

    // Convert visualX to physics engine coordinates
    const scale = GAME_WIDTH / rect.width;
    const physicsX = visualX * scale;

    const currentFruit = getFruit(nextFruitLevel);
    const body = Matter.Bodies.circle(physicsX, 20, currentFruit.radius, {
      restitution: 0.2,
      friction: 0.1,
      label: nextFruitLevel.toString()
    });
    
    // Tag body as dropping so we don't count it for game over immediately
    body.isDropping = true;
    setTimeout(() => {
      if (body) body.isDropping = false;
    }, 2000);

    Matter.World.add(engineRef.current.world, body);
    playDropSound();

    setScore(s => s + 1);
    const newXu = xuEarnedRef.current + 1;
    xuEarnedRef.current = newXu;
    setXuEarned(newXu);

    setNextFruitLevel(getRandomNextFruit());
    setCanDrop(false);
    setCursorX(null);

    // Cooldown
    setTimeout(() => {
      if (!isGameOver) setCanDrop(true);
    }, 100);
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;
    const bodiesToRemove = world.bodies.filter(b => !b.label.startsWith('Wall'));
    Matter.World.remove(world, bodiesToRemove);

    setScore(0);
    setXuEarned(0);
    xuEarnedRef.current = 0;
    gameEndClaimed.current = false;
    setIsGameOver(false);
    setCanDrop(true);
    setNextFruitLevel(getRandomNextFruit());
  };

  const handleBackClick = () => {
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    if (xuEarnedRef.current > 0 && !gameEndClaimed.current) {
      treeService.addReward(xuEarnedRef.current).catch(console.error);
      gameEndClaimed.current = true;
    }
    navigate('/games');
  };

  const cancelQuit = () => {
    setShowQuitModal(false);
  };

  const nextFruit = getFruit(nextFruitLevel);

  return (
    <div className="suika-container">
      <div className="suika-header">
        <button className="suika-back-btn" onClick={handleBackClick}><ArrowLeft size={24} /></button>
        <div className="suika-title">Suika Game</div>
        <button className="suika-restart-btn" onClick={handleRestart}><RotateCcw size={20} /></button>
      </div>

      <div className="suika-stats">
        <div className="suika-score-box">
          <div className="suika-score-label">Score</div>
          <div className="suika-score-value">{score}</div>
        </div>
        <div className="suika-next-box">
          <div className="suika-next-label">Next</div>
          <div className="suika-next-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '60px', height: '60px' }}>
            <SuikaNextCanvas level={nextFruitLevel} />
          </div>
        </div>
      </div>

      <div
        className="suika-game-area"
        ref={sceneRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => {
          handlePointerUp(e); // Drop if dragging outside, or just clear
          setCursorX(null);
        }}
        style={{ cursor: canDrop ? 'none' : 'not-allowed', position: 'relative' }}
      >
        {/* Drop Zone strip at top */}
        <div className="suika-drop-zone" style={{ height: `${DROP_ZONE_HEIGHT}px` }}>
          {cursorX !== null && canDrop && (
            <>
              {/* Vertical guide line */}
              <div className="suika-drop-guide" style={{ left: `${cursorX}px` }} />
              {/* Fruit preview at cursor */}
              <div className="suika-drop-preview" style={{
                left: `${cursorX}px`,
                top: `${DROP_ZONE_HEIGHT / 2}px`,
              }}>
                <SuikaNextCanvas level={nextFruitLevel} />
              </div>
            </>
          )}
          <div className="suika-drop-label">▼ Drop Zone ▼</div>
        </div>
        <SuikaCanvas engine={engineRef.current} width={GAME_WIDTH} height={GAME_HEIGHT} />
      </div>

      {isGameOver && (
        <div className="suika-modal-overlay">
          <div className="suika-modal-content">
            <h2 className="suika-modal-title">Game Over!</h2>
            <div className="suika-modal-score">
              Total Score
              <span>{score}</span>
            </div>
            <div className="suika-modal-score" style={{ color: '#ff69b4', marginTop: '-20px' }}>
              Xu Nhận Được
              <span style={{ color: '#ff69b4' }}>+{xuEarned}</span>
            </div>
            <button className="suika-btn-primary" onClick={handleRestart}>Play Again</button>
          </div>
        </div>
      )}

      {showQuitModal && (
        <div className="suika-modal-overlay">
          <div className="suika-modal-content">
            <h2 className="suika-modal-title">Xác nhận thoát</h2>
            <p style={{ marginBottom: '15px', color: '#555', textAlign: 'center' }}>
              Bạn có chắc chắn muốn thoát game?
            </p>
            <div className="suika-modal-score" style={{ color: '#ff69b4', marginTop: '0px' }}>
              Xu Sẽ Nhận
              <span style={{ color: '#ff69b4' }}>+{xuEarned}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="suika-btn-primary"
                style={{ background: '#ccc', color: '#333', flex: 1, padding: '10px 5px', fontSize: '0.9rem', minHeight: '40px' }}
                onClick={cancelQuit}
              >
                Tiếp tục chơi
              </button>
              <button
                className="suika-btn-primary"
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem', minHeight: '40px' }}
                onClick={confirmQuit}
              >
                Thoát ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
