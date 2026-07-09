import React, { useEffect, useRef } from 'react';

export default function HappyConnectCanvas({ grid, path, ROWS, COLS }) {
  const canvasRef = useRef(null);
  
  // Store visual state
  const visualItems = useRef(new Map());
  const particles = useRef([]);
  const animationFrameId = useRef(null);
  const lastTime = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI displays
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawGrid = (cw, ch) => {
      const cellW = cw / COLS;
      const cellH = ch / ROWS;
      
      // Draw background grid lines/boxes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(cw, r * cellH);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, ch);
        ctx.stroke();
      }
    };

    const drawPath = (cw, ch) => {
      if (!path || path.length < 2) return;
      const cellW = cw / COLS;
      const cellH = ch / ROWS;

      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const { r, c } = path[i];
        const x = (c + 0.5) * cellW;
        const y = (r + 0.5) * cellH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      const firstCell = path[0];
      const item = grid[firstCell.r]?.[firstCell.c];
      const color = item ? item.typeDef.color : '#fff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    };

    const drawBombPreview = (cw, ch) => {
       if (!path || path.length === 0) return;
       const cellW = cw / COLS;
       const cellH = ch / ROWS;
       
       const rowsToHighlight = new Set();
       const colsToHighlight = new Set();

       // Only show preview if the path is valid (length >= 3) or at least contains a bomb
       path.forEach(p => {
          const item = grid[p.r]?.[p.c];
          if (item && item.special) {
             if (item.special === 'horizontal' || item.special === 'cross') {
                rowsToHighlight.add(p.r);
             }
             if (item.special === 'vertical' || item.special === 'cross') {
                colsToHighlight.add(p.c);
             }
          }
       });

       if (rowsToHighlight.size === 0 && colsToHighlight.size === 0) return;

       ctx.save();
       // Pulse effect for the preview
       const t = performance.now() / 200;
       const alpha = Math.sin(t) * 0.05 + 0.15; // 0.1 to 0.2
       ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
       
       // Draw row highlights
       rowsToHighlight.forEach(r => {
          ctx.fillRect(0, r * cellH, cw, cellH);
       });
       // Draw col highlights
       colsToHighlight.forEach(c => {
          ctx.fillRect(c * cellW, 0, cellW, ch);
       });

       ctx.restore();
    };

    const drawItem = (ctx, vi, x, y, size) => {
      const { typeDef, special, scale, opacity } = vi;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = opacity;

      const r = size * 0.45; // radius
      const color = typeDef.color;

      // Special Bomb indicators - Draw behind the shape
      if (special) {
         const t = performance.now() / 150;
         const pulseAlpha = Math.sin(t) * 0.3 + 0.6; // 0.3 to 0.9
         
         ctx.save();
         
         // Base circular glow
         ctx.shadowColor = '#fff';
         ctx.shadowBlur = 20;
         ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha * 0.8})`;
         ctx.beginPath();
         ctx.arc(0, 0, r * 1.0, 0, Math.PI * 2);
         ctx.fill();

         // Draw Pointy Star Rays
         ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
         const drawRay = (isVertical) => {
             const rayLen = r * 1.8;
             const rayThick = r * 0.15;
             ctx.beginPath();
             if (isVertical) {
                 ctx.moveTo(-rayThick, 0);
                 ctx.lineTo(0, -rayLen);
                 ctx.lineTo(rayThick, 0);
                 ctx.lineTo(0, rayLen);
             } else {
                 ctx.moveTo(0, -rayThick);
                 ctx.lineTo(rayLen, 0);
                 ctx.lineTo(0, rayThick);
                 ctx.lineTo(-rayLen, 0);
             }
             ctx.closePath();
             ctx.fill();
         };

         if (special === 'horizontal' || special === 'cross') {
            drawRay(false);
         }
         if (special === 'vertical' || special === 'cross') {
            drawRay(true);
         }
         ctx.restore();
      }

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;

      // Draw Shape based on name
      const name = typeDef.name;
      ctx.beginPath();
      if (name === 'Heart') {
         ctx.moveTo(0, -r * 0.25);
         ctx.bezierCurveTo(-r * 0.9, -r * 0.8, -r * 1.3, r * 0.2, 0, r * 0.95);
         ctx.bezierCurveTo(r * 1.3, r * 0.2, r * 0.9, -r * 0.8, 0, -r * 0.25);
         ctx.fill();
      } else if (name === 'Diamond') {
         ctx.moveTo(0, -r * 0.8);
         ctx.lineTo(r * 0.8, 0);
         ctx.lineTo(0, r * 0.8);
         ctx.lineTo(-r * 0.8, 0);
         ctx.fill();
      } else if (name === 'Star') {
         for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r * 0.8, -Math.sin((18 + i * 72) * Math.PI / 180) * r * 0.8);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * r * 0.4, -Math.sin((54 + i * 72) * Math.PI / 180) * r * 0.4);
         }
         ctx.closePath();
         ctx.fill();
      } else if (name === 'Bug') {
         // Spiky blob for bug
         for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const rad = i % 2 === 0 ? r * 0.8 : r * 0.6;
            ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
         }
         ctx.closePath();
         ctx.fill();
      } else if (name === 'Ring') {
         // Rounded rect
         ctx.roundRect(-r*0.7, -r*0.7, r*1.4, r*1.4, r*0.3);
         ctx.fill();
      } else {
         // Rose or default: Circle
         ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
         ctx.fill();
      }
      ctx.shadowBlur = 0; // Turn off glow for inner details

      // Gloss effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      if (name === 'Heart') ctx.arc(-r*0.3, -r*0.1, r*0.15, 0, Math.PI*2);
      else if (name === 'Diamond') ctx.arc(0, -r*0.3, r*0.15, 0, Math.PI*2);
      else if (name === 'Star') ctx.arc(0, -r*0.15, r*0.12, 0, Math.PI*2);
      else ctx.arc(-r*0.2, -r*0.2, r*0.15, 0, Math.PI*2);
      ctx.fill();

      // Kawaii Face
      const eyeOffset = name === 'Diamond' || name === 'Star' ? r * 0.1 : 0;
      
      if (name === 'Bug') {
         // Angry cute face
         ctx.fillStyle = '#fff';
         ctx.beginPath(); ctx.arc(-r * 0.25, -r*0.1, r * 0.2, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(r * 0.25, -r*0.1, r * 0.2, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = '#d63031'; // red pupils
         ctx.beginPath(); ctx.arc(-r * 0.25, -r*0.1, r * 0.08, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(r * 0.25, -r*0.1, r * 0.08, 0, Math.PI*2); ctx.fill();
         // Angry eyebrows
         ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
         ctx.beginPath(); ctx.moveTo(-r*0.4, -r*0.3); ctx.lineTo(-r*0.1, -r*0.2); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(r*0.4, -r*0.3); ctx.lineTo(r*0.1, -r*0.2); ctx.stroke();
      } else {
         // Normal cute face
         ctx.fillStyle = '#2d3436';
         ctx.beginPath(); ctx.arc(-r * 0.25, eyeOffset, r * 0.08, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(r * 0.25, eyeOffset, r * 0.08, 0, Math.PI*2); ctx.fill();
         // Blush
         ctx.fillStyle = 'rgba(255, 107, 129, 0.6)';
         ctx.beginPath(); ctx.arc(-r * 0.4, eyeOffset + r * 0.1, r * 0.1, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(r * 0.4, eyeOffset + r * 0.1, r * 0.1, 0, Math.PI*2); ctx.fill();
         // Smile
         ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 2;
         ctx.beginPath(); ctx.arc(0, eyeOffset + r * 0.05, r * 0.1, 0, Math.PI); ctx.stroke();
      }

      // Remove text based special bomb indicators

      ctx.restore();
    };

    const drawParticles = (ctx, dt) => {
       for(let i = particles.current.length - 1; i >= 0; i--){
         const p = particles.current[i];
         p.x += p.vx * dt;
         p.y += p.vy * dt;
         p.life -= dt;
         
         if (p.life <= 0) {
           particles.current.splice(i, 1);
           continue;
         }

         ctx.save();
         ctx.globalAlpha = p.life / p.maxLife;
         ctx.fillStyle = p.color;
         ctx.shadowColor = p.color;
         ctx.shadowBlur = 5;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
       }
    };

    // Update logical grid into visual items
    const currentIds = new Set();
    const cellW = canvas.parentElement.clientWidth / COLS;
    const cellH = canvas.parentElement.clientHeight / ROWS;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const item = grid[r][c];
        if (!item) continue;
        currentIds.add(item.id);

        const targetX = (c + 0.5) * cellW;
        const targetY = (r + 0.5) * cellH;

        if (!visualItems.current.has(item.id)) {
           visualItems.current.set(item.id, {
             id: item.id,
             x: targetX,
             y: -cellH, // Start above board
             targetX,
             targetY,
             scale: 1,
             opacity: 1,
             typeDef: item.typeDef,
             special: item.special,
             isPopping: false
           });
        } else {
           const vi = visualItems.current.get(item.id);
           vi.targetX = targetX;
           vi.targetY = targetY;
           vi.special = item.special; // update special type
           
           if (item.isPopping && !vi.isPopping) {
             vi.isPopping = true;
             // Spawn particles
             for(let k=0; k<15; k++){
                particles.current.push({
                   x: vi.x, y: vi.y,
                   vx: (Math.random() - 0.5) * 500,
                   vy: (Math.random() - 0.5) * 500,
                   size: Math.random() * 4 + 2,
                   color: item.typeDef.color,
                   life: 0.5 + Math.random() * 0.3,
                   maxLife: 0.8
                });
             }
           }
        }
      }
    }

    // Clean up popped or removed items
    visualItems.current.forEach((vi, id) => {
      if (!currentIds.has(id)) {
        if (!vi.isPopping) {
          // It was removed directly (e.g. restart)
          visualItems.current.delete(id);
        }
      }
    });

    const renderLoop = (time) => {
      const dt = (time - lastTime.current) / 1000 || 0;
      lastTime.current = time;

      const cw = canvas.parentElement.clientWidth;
      const ch = canvas.parentElement.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      drawGrid(cw, ch);
      drawBombPreview(cw, ch);
      drawPath(cw, ch);

      const size = Math.min(cw/COLS, ch/ROWS);

      visualItems.current.forEach((vi, id) => {
         // Interpolate position
         const dx = vi.targetX - vi.x;
         const dy = vi.targetY - vi.y;
         vi.x += dx * 15 * dt;
         vi.y += dy * 15 * dt;

         if (vi.isPopping) {
           vi.scale -= 5 * dt;
           vi.opacity -= 3 * dt;
           if (vi.scale <= 0 || vi.opacity <= 0) {
             visualItems.current.delete(id);
           }
         } else {
             // selected scale
             const isInPath = path.some(p => Math.abs(p.r - (vi.targetY/ch*ROWS - 0.5)) < 0.1 && Math.abs(p.c - (vi.targetX/cw*COLS - 0.5)) < 0.1);
             vi.scale = vi.scale + ((isInPath ? 1.2 : 1) - vi.scale) * 10 * dt;
         }

         if (vi.scale > 0 && vi.opacity > 0) {
            drawItem(ctx, vi, vi.x, vi.y, size);
         }
      });

      drawParticles(ctx, dt);

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    lastTime.current = performance.now();
    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [grid, path, ROWS, COLS]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />;
}
