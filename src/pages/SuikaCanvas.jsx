import React, { useEffect, useRef } from 'react';
import { FRUITS, drawFruit } from './suikaFruits';

export default function SuikaCanvas({ engine, width, height }) {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Support high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      if (!engine || !engine.world) return;

      // Clear
      ctx.clearRect(0, 0, width, height);

      const bodies = engine.world.bodies;

      bodies.forEach(body => {
        // Walls don't have fruit levels, skip rendering or render as lines
        if (body.label.startsWith('Wall')) {
          ctx.fillStyle = 'rgba(255, 182, 193, 0.3)';
          ctx.fillRect(body.bounds.min.x, body.bounds.min.y, body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y);
          return;
        }

        const level = parseInt(body.label);
        if (isNaN(level)) return;

        const fruit = FRUITS[level];
        if (!fruit) return;

        const { x, y } = body.position;
        const radius = body.circleRadius;
        const angle = body.angle;

        drawFruit(ctx, fruit, radius, x, y, angle);
      });

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [engine, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      className="suika-canvas"
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}
