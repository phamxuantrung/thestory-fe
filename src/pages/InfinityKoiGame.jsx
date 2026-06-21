import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { treeService } from '../services/treeService';
import './InfinityKoiGame.css';

const InfinityKoiGame = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ---------- DOM ----------
    const canvas = document.getElementById('infinity-koi-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stageEl = document.getElementById('infinity-koi-stage');
    const titleScreen = document.getElementById('infinity-koi-title-screen');
    const endScreen = document.getElementById('infinity-koi-end-screen');
    const hud = document.getElementById('infinity-koi-hud');
    const hudScore = document.getElementById('infinity-koi-hud-score');
    const hudXu = document.getElementById('infinity-koi-hud-xu');
    const vitalityFill = document.getElementById('infinity-koi-vitality-fill');
    const toastEl = document.getElementById('infinity-koi-toast');

    const btnStart = document.getElementById('infinity-koi-btn-start');
    const btnRestart = document.getElementById('infinity-koi-btn-restart');
    const endTitle = document.getElementById('infinity-koi-end-title');
    const endSub = document.getElementById('infinity-koi-end-sub');
    const endScoreEl = document.getElementById('infinity-koi-end-score');
    const endXuEl = document.getElementById('infinity-koi-end-xu');
    const endTimeEl = document.getElementById('infinity-koi-end-time');
    const endBestEl = document.getElementById('infinity-koi-end-best');
    const endEmblem = document.getElementById('infinity-koi-end-emblem');

    const BEST_KEY = 'koi-pond-best-score';

    // ---------- Canvas sizing ----------
    let W = 0, H = 0, DPR = 1;
    function resizeCanvas(){
      if (!stageEl || !canvas) return;
      const rect = stageEl.getBoundingClientRect();
      DPR = window.devicePixelRatio || 1;
      W = rect.width; H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }

    function rand(a,b){ return a + Math.random()*(b-a); }
    function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
    function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
    function angleLerp(a,b,t){
      let diff = ((b-a + Math.PI*3) % (Math.PI*2)) - Math.PI;
      return a + diff*t;
    }

    // ---------- Game State ----------
    let state = null;
    let lastTime = 0;
    let rafId = null;

    function resetGame(){
      state = {
        running: true,
        time: 0,
        score: 0,
        xuEarned: 0,
        vitality: 100,
        maxVitality: 100,
        fish: {
          x: W/2, y: H*0.6,
          angle: -Math.PI/2,
          targetAngle: -Math.PI/2,
          speed: 180,
          baseSpeed: 180,
          wiggle: 0,
          length: 16,
          glow: 0,
          hurtFlash: 0
        },
        pointer: { active: false, x: W/2, y: H*0.3 },
        blossoms: [],
        ripples: [],   
        pulseTimer: 0,
        pulseInterval: 1.1,
        whirlpools: [], 
        particles: [],
        koiTrail: [],
        difficultyT: 0,
        shakeT: 0
      };
      spawnInitialBlossoms();
      updateHud();
    }

    function spawnInitialBlossoms(){
      for(let i=0;i<4;i++) spawnBlossom();
    }

    function spawnBlossom(){
      const margin = 40;
      state.blossoms.push({
        x: rand(margin, W-margin),
        y: rand(H*0.12, H*0.92),
        r: rand(9,13),
        bob: rand(0, Math.PI*2),
        hue: Math.random()<0.30 ? 'gold' : 'pink'
      });
    }

    function emitPulse(){
      state.ripples.push({ x:W/2, y:H*0.42, birth:state.time, speed: Math.min(W,H)*0.45 });
      if(Math.random()<0.6){
        state.ripples.push({
          x: rand(W*0.2,W*0.8), y: rand(H*0.25,H*0.75),
          birth: state.time + rand(0,0.4),
          speed: Math.min(W,H)*rand(0.35,0.5)
        });
      }
    }

    function rippleRadius(r){
      const age = state.time - r.birth;
      return Math.max(0, age) * r.speed;
    }

    function updateRipples(){
      state.ripples = state.ripples.filter(r=>{
        const rad = rippleRadius(r);
        return rad < Math.max(W,H)*0.9 && (state.time - r.birth) > -0.5;
      });

      state.whirlpools = [];
      for(let i=0;i<state.ripples.length;i++){
        for(let j=i+1;j<state.ripples.length;j++){
          const a = state.ripples[i], b = state.ripples[j];
          const ra = rippleRadius(a), rb = rippleRadius(b);
          if(ra<10 || rb<10) continue;
          const d = dist(a.x,a.y,b.x,b.y);
          if(d<1 || d> ra+rb || d < Math.abs(ra-rb)) continue;
          const aDist = (ra*ra - rb*rb + d*d) / (2*d);
          const h2 = ra*ra - aDist*aDist;
          if(h2<0) continue;
          const h = Math.sqrt(h2);
          const mx = a.x + aDist*(b.x-a.x)/d;
          const my = a.y + aDist*(b.y-a.y)/d;
          const ox = -(b.y-a.y)*(h/d);
          const oy =  (b.x-a.x)*(h/d);
          const p1 = {x:mx+ox, y:my+oy};
          const p2 = {x:mx-ox, y:my-oy};
          for(const p of [p1,p2]){
            if(p.x>10 && p.x<W-10 && p.y>60 && p.y<H-10){
              state.whirlpools.push({x:p.x, y:p.y, strength: Math.min(1, (ra+rb)/(Math.min(W,H)*0.6))});
            }
          }
        }
      }
    }

    function setPointerFromEvent(e, active){
      if(!stageEl) return;
      const rect = stageEl.getBoundingClientRect();
      let cx, cy;
      if(e.touches && e.touches.length){
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = e.clientX - rect.left;
        cy = e.clientY - rect.top;
      }
      state.pointer.x = cx;
      state.pointer.y = cy;
      state.pointer.active = active;
    }

    function onPointerDown(e){
      if(!state || !state.running) return;
      setPointerFromEvent(e, true);
    }
    function onPointerMove(e){
      if(!state || !state.running || !state.pointer.active) return;
      setPointerFromEvent(e, true);
    }
    function onPointerUp(e){
      if(!state) return;
      state.pointer.active = false;
    }

    const preventDef = e => e.preventDefault();
    let lastTap = 0;
    const preventDoubleTap = (e)=>{
      const now=Date.now();
      if(now-lastTap<300) e.preventDefault();
      lastTap=now;
    };

    let toastTimer=null;
    function showToast(msg){
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(()=>toastEl.classList.remove('show'), 1500);
    }

    function updateHud(){
      hudScore.textContent = state.score;
      hudXu.textContent = state.xuEarned;
      vitalityFill.style.width = clamp(state.vitality,0,100) + '%';
    }

    function update(dt){
      if(!state.running) return;
      state.time += dt;
      state.difficultyT += dt;

      state.pulseTimer += dt;
      const interval = Math.max(0.7, state.pulseInterval - state.difficultyT*0.015);
      if(state.pulseTimer >= interval){
        state.pulseTimer = 0;
        emitPulse();
      }
      updateRipples();

      const f = state.fish;
      if(state.pointer.active){
        const dx = state.pointer.x - f.x;
        const dy = state.pointer.y - f.y;
        if(Math.hypot(dx,dy) > 6){
          f.targetAngle = Math.atan2(dy,dx);
        }
      }
      f.angle = angleLerp(f.angle, f.targetAngle, clamp(dt*3.2, 0, 1));
      f.wiggle += dt * (6 + f.speed*0.04);

      const moveSpeed = f.speed * (state.pointer.active ? 1 : 0.6);
      f.x += Math.cos(f.angle) * moveSpeed * dt;
      f.y += Math.sin(f.angle) * moveSpeed * dt;

      const pad = 22;
      if(f.x < pad) f.targetAngle = angleLerp(f.targetAngle, 0, 0.08);
      if(f.x > W-pad) f.targetAngle = angleLerp(f.targetAngle, Math.PI, 0.08);
      if(f.y < pad+50) f.targetAngle = angleLerp(f.targetAngle, Math.PI/2, 0.08);
      if(f.y > H-pad) f.targetAngle = angleLerp(f.targetAngle, -Math.PI/2, 0.08);
      f.x = clamp(f.x, 6, W-6);
      f.y = clamp(f.y, 56, H-6);

      state.koiTrail.push({x:f.x, y:f.y, t:state.time});
      state.koiTrail = state.koiTrail.filter(p=>state.time-p.t < 0.5);

      state.vitality -= dt * (3.5 + state.score*0.035);
      if(f.hurtFlash>0) f.hurtFlash -= dt;
      if(state.shakeT>0) state.shakeT -= dt;

      for(const w of state.whirlpools){
        const d = dist(f.x,f.y,w.x,w.y);
        const dangerR = 16 + w.strength*22;
        if(d < dangerR){
          state.vitality -= dt * (50*w.strength);
          f.hurtFlash = 0.25;
          state.shakeT = 0.25;
          const ang = Math.atan2(f.y-w.y, f.x-w.x);
          f.x += Math.cos(ang)*40*dt;
          f.y += Math.sin(ang)*40*dt;
        }
      }

      for(let i=state.blossoms.length-1;i>=0;i--){
        const b = state.blossoms[i];
        b.bob += dt*2;
        const d = dist(f.x,f.y,b.x,b.y);
        if(d < b.r + 14){
          const gain = b.hue==='gold' ? 20 : 12;
          state.vitality = clamp(state.vitality + gain, 0, state.maxVitality);
          state.score += b.hue==='gold' ? 5 : 1;
          
          if(b.hue === 'gold'){
            state.xuEarned += 2;
            showToast('+2 Xu thật! (Hoa sen vàng)');
          }

          f.glow = 0.4;
          spawnPetalBurst(b.x,b.y,b.hue);
          state.blossoms.splice(i,1);
          spawnBlossom();
          updateHud();
        }
      }
      if(f.glow>0) f.glow -= dt*1.2;

      for(const p of state.particles){
        p.x += p.vx*dt; p.y += p.vy*dt;
        p.vx *= 0.94; p.vy *= 0.94;
        p.life -= dt;
      }
      state.particles = state.particles.filter(p=>p.life>0);

      updateHud();

      if(state.vitality<=0){
        state.vitality=0;
        updateHud();
        endGame();
      }
    }

    function spawnPetalBurst(x,y,hue){
      const color = hue==='gold' ? '#f2c069' : '#f2a6c4';
      for(let i=0;i<10;i++){
        const ang = Math.random()*Math.PI*2;
        const spd = rand(30,80);
        state.particles.push({
          x,y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
          life: rand(0.5,0.9), maxLife: 0.9, color
        });
      }
    }

    function draw(){
      if(!ctx) return;
      ctx.clearRect(0,0,W,H);

      const grad = ctx.createRadialGradient(W/2,H*0.35,10, W/2,H*0.5, Math.max(W,H)*0.8);
      grad.addColorStop(0, '#1d4d4a');
      grad.addColorStop(1, '#0a2426');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,W,H);

      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#eaf2ee';
      for(let i=0;i<5;i++){
        const yy = (i/5)*H + Math.sin(state.time*0.5+i)*14;
        ctx.beginPath();
        ctx.moveTo(0,yy);
        for(let x=0;x<=W;x+=24){
          ctx.lineTo(x, yy+Math.sin(x*0.03+state.time+i)*8);
        }
        ctx.stroke();
      }
      ctx.restore();

      let shakeX=0, shakeY=0;
      if(state.shakeT>0){
        shakeX = rand(-4,4)*state.shakeT*4;
        shakeY = rand(-4,4)*state.shakeT*4;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      for(const r of state.ripples){
        const rad = rippleRadius(r);
        if(rad<=0) continue;
        const age = state.time - r.birth;
        const alpha = clamp(1 - age/3.2, 0, 1) * 0.35;
        if(alpha<=0) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(234,242,238,${alpha})`;
        ctx.lineWidth = 1.4;
        ctx.arc(r.x, r.y, rad, 0, Math.PI*2);
        ctx.stroke();
      }

      for(const w of state.whirlpools){
        const R = 16 + w.strength*22;
        const grd = ctx.createRadialGradient(w.x,w.y,0, w.x,w.y,R);
        grd.addColorStop(0, `rgba(10,20,20,${0.55*w.strength})`);
        grd.addColorStop(0.7, `rgba(40,80,75,${0.25*w.strength})`);
        grd.addColorStop(1, 'rgba(40,80,75,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(w.x,w.y,R,0,Math.PI*2);
        ctx.fill();
        ctx.save();
        ctx.translate(w.x,w.y);
        ctx.rotate(state.time*3);
        ctx.strokeStyle = `rgba(234,242,238,${0.4*w.strength})`;
        ctx.lineWidth=1;
        for(let k=0;k<3;k++){
          ctx.save();
          ctx.rotate(k*Math.PI*2/3);
          ctx.beginPath();
          ctx.arc(0,0, R*0.6, 0, Math.PI*1.1);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      for(const b of state.blossoms){
        const bob = Math.sin(b.bob)*2.5;
        ctx.save();
        ctx.translate(b.x, b.y+bob);
        ctx.fillStyle = 'rgba(159,201,160,0.55)';
        ctx.beginPath();
        ctx.arc(0,0,b.r*1.7,0,Math.PI*2);
        ctx.fill();
        const petals = 6;
        const color = b.hue==='gold' ? '#f2c069' : '#f2a6c4';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = b.hue==='gold' ? 14 : 6;
        for(let i=0;i<petals;i++){
          const ang = (i/petals)*Math.PI*2;
          ctx.save();
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.ellipse(0,-b.r*0.55, b.r*0.4, b.r*0.65, 0,0,Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
        ctx.shadowBlur=0;
        ctx.fillStyle = b.hue==='gold' ? '#fff3d6' : '#fff0f6';
        ctx.beginPath();
        ctx.arc(0,0,b.r*0.3,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      for(let i=0;i<state.koiTrail.length;i++){
        const p = state.koiTrail[i];
        const age = state.time - p.t;
        const alpha = clamp(1-age/0.6,0,1)*0.18;
        ctx.fillStyle = `rgba(232,167,60,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x,p.y, 3, 0, Math.PI*2);
        ctx.fill();
      }

      drawFish(state.fish);

      for(const p of state.particles){
        ctx.save();
        ctx.globalAlpha = clamp(p.life/p.maxLife,0,1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x,p.y, 3,1.6, Math.atan2(p.vy,p.vx), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      const vg = ctx.createRadialGradient(W/2,H/2, Math.min(W,H)*0.3, W/2,H/2, Math.max(W,H)*0.75);
      vg.addColorStop(0,'rgba(0,0,0,0)');
      vg.addColorStop(1,'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg;
      ctx.fillRect(0,0,W,H);

      if(state.fish.hurtFlash>0){
        ctx.save();
        ctx.globalAlpha = Math.min(0.4, state.fish.hurtFlash);
        ctx.fillStyle = '#c8453d';
        ctx.fillRect(0,0,W,H);
        ctx.restore();
      }
    }

    function drawFish(f){
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      const wig = Math.sin(f.wiggle)*0.35;
      const L = f.length + state.score*0.12; 
      const bodyColor = '#e8a73c';
      const finColor = '#c8453d';

      if(f.glow>0){
        ctx.shadowColor = '#f2c069';
        ctx.shadowBlur = 18*f.glow;
      }

      ctx.save();
      ctx.translate(-L*0.85, 0);
      ctx.rotate(wig*1.4);
      ctx.fillStyle = finColor;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(-L*0.55, -L*0.4);
      ctx.lineTo(-L*0.4, 0);
      ctx.lineTo(-L*0.55, L*0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0,0, L*0.62, L*0.34, 0,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle = finColor;
      ctx.beginPath();
      ctx.ellipse(L*0.05, -L*0.06, L*0.22, L*0.13, 0.3, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#2a1607';
      ctx.beginPath();
      ctx.ellipse(-L*0.18, L*0.04, L*0.1, L*0.07, -0.2, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = 'rgba(200,69,61,0.85)';
      ctx.beginPath();
      ctx.moveTo(-L*0.1, -L*0.3);
      ctx.quadraticCurveTo(L*0.05, -L*0.62 + Math.sin(f.wiggle*1.3)*3, L*0.22, -L*0.3);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur=0;

      ctx.fillStyle = '#1d1208';
      ctx.beginPath();
      ctx.arc(L*0.48, -L*0.08, L*0.045, 0, Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(232,167,60,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L*0.58, L*0.02);
      ctx.quadraticCurveTo(L*0.74, L*0.08 + Math.sin(f.wiggle)*2, L*0.8, L*0.02);
      ctx.stroke();

      ctx.restore();
    }

    function loop(ts){
      if(!lastTime) lastTime = ts;
      const dt = Math.min(0.05, (ts-lastTime)/1000);
      lastTime = ts;
      update(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }
    function startLoop(){
      lastTime = 0;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    function getBest(){
      try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10); }
      catch(e){ return 0; }
    }
    function setBest(v){
      try { localStorage.setItem(BEST_KEY, String(v)); } catch(e){}
    }

    function startGame(){
      titleScreen.classList.add('infinity-koi-hidden');
      endScreen.classList.add('infinity-koi-hidden');
      hud.classList.remove('infinity-koi-hidden');
      resizeCanvas();
      resetGame();
      startLoop();
    }

    async function endGame(){
      state.running = false;
      cancelAnimationFrame(rafId);
      hud.classList.add('infinity-koi-hidden');

      const best = getBest();
      const isNewBest = state.score > best;
      if(isNewBest) setBest(state.score);

      endTitle.textContent = isNewBest ? 'Koi huyền thoại' : 'Cá đã lặn sâu';
      endSub.textContent = isNewBest
        ? 'Bạn vừa lập kỷ lục mới cho ao này.'
        : 'Vòng xoáy đã cuốn bạn xuống đáy ao tối.';
      endEmblem.textContent = isNewBest ? '👑' : '🥀';
      endScoreEl.textContent = state.score;
      endXuEl.textContent = `+${state.xuEarned} Xu`;
      endTimeEl.textContent = Math.floor(state.time) + 's';
      endBestEl.textContent = Math.max(best, state.score);

      endScreen.classList.remove('infinity-koi-hidden');

      // Add Reward
      if (state.xuEarned > 0) {
        try {
          await treeService.addReward(state.xuEarned);
        } catch (e) {
          console.error('Failed to add reward:', e);
        }
      }
    }

    btnStart.addEventListener('click', startGame);
    btnRestart.addEventListener('click', startGame);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', ()=>{
      setTimeout(resizeCanvas,120); setTimeout(resizeCanvas,400);
    });
    if(window.visualViewport) window.visualViewport.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('touchstart', onPointerDown, {passive:true});
    canvas.addEventListener('touchmove', onPointerMove, {passive:true});
    canvas.addEventListener('touchend', onPointerUp, {passive:true});
    canvas.addEventListener('touchcancel', onPointerUp, {passive:true});
    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    document.addEventListener('gesturestart', preventDef);
    document.addEventListener('contextmenu', preventDef);
    document.addEventListener('touchend', preventDoubleTap, {passive:false});

    resizeCanvas();

    return () => {
      cancelAnimationFrame(rafId);
      btnStart.removeEventListener('click', startGame);
      btnRestart.removeEventListener('click', startGame);
      window.removeEventListener('resize', resizeCanvas);
      if(window.visualViewport) window.visualViewport.removeEventListener('resize', resizeCanvas);

      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
      canvas.removeEventListener('touchcancel', onPointerUp);
      canvas.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);

      document.removeEventListener('gesturestart', preventDef);
      document.removeEventListener('contextmenu', preventDef);
      document.removeEventListener('touchend', preventDoubleTap);
    };
  }, []);

  return (
    <div className="infinity-koi-wrapper">
      <div className="infinity-koi-back-btn" onClick={() => navigate('/games')}>
        <ArrowLeft size={24} />
      </div>
      <div id="infinity-koi-wrap">
        <div id="infinity-koi-stage">
          <canvas id="infinity-koi-canvas"></canvas>

          <header className="infinity-koi-hud infinity-koi-hidden" id="infinity-koi-hud">
            <div style={{display:'flex', gap:'16px'}}>
              <div className="infinity-koi-hud-stat">
                <span className="infinity-koi-hud-label">Điểm số</span>
                <span className="num" id="infinity-koi-hud-score">0</span>
              </div>
              <div className="infinity-koi-hud-stat">
                <span className="infinity-koi-hud-label" style={{color: '#f2c069'}}>Túi Xu</span>
                <span className="num" id="infinity-koi-hud-xu" style={{color: '#f2c069'}}>0</span>
              </div>
            </div>
            
            <div className="infinity-koi-hud-stat" style={{textAlign: 'right'}}>
              <span className="infinity-koi-hud-label">Sức sống</span>
              <div id="infinity-koi-vitality-bar"><div id="infinity-koi-vitality-fill"></div></div>
            </div>
          </header>

          <div id="infinity-koi-toast"></div>

          {/* TITLE */}
          <div id="infinity-koi-title-screen">
            <div className="infinity-koi-emblem">🐟</div>
            <h1>Cá Koi Vô Cực</h1>
            <div className="infinity-koi-subtitle">một ao nước không đáy</div>
            <p className="infinity-koi-lede">Vuốt để dẫn lối cho chú koi của bạn. Lượn qua hoa sen để sống sót,
              tránh xa những vòng xoáy nơi sóng giao nhau.</p>
            <button className="infinity-koi-primary" id="infinity-koi-btn-start">Thả cá xuống ao</button>
            <div className="infinity-koi-hint-row">
              <div className="infinity-koi-hint-pill">👆 Vuốt bất kỳ đâu để đổi hướng bơi</div>
              <div className="infinity-koi-hint-pill" style={{borderColor: '#d9789f'}}>🌸 Ăn sen hồng để hồi sức (Không rớt Xu)</div>
              <div className="infinity-koi-hint-pill" style={{borderColor: '#f2c069'}}>🌻 Ăn sen vàng rớt +2 Xu thật</div>
              <div className="infinity-koi-hint-pill" style={{borderColor: '#1d4d4a'}}>🌀 Tránh vòng xoáy hút máu</div>
            </div>
          </div>

          {/* END */}
          <div id="infinity-koi-end-screen" className="infinity-koi-hidden">
            <div className="infinity-koi-emblem" id="infinity-koi-end-emblem">🥀</div>
            <h1 id="infinity-koi-end-title">Cá đã lặn sâu</h1>
            <p className="infinity-koi-lede" id="infinity-koi-end-sub">Vòng xoáy đã cuốn bạn xuống đáy ao tối.</p>
            <div id="infinity-koi-end-stats">
              <div className="infinity-koi-end-stat"><span className="num" id="infinity-koi-end-score">0</span><span className="lbl">Điểm</span></div>
              <div className="infinity-koi-end-stat"><span className="num" id="infinity-koi-end-xu">0</span><span className="lbl" style={{color:'#f2c069'}}>Nhặt được</span></div>
              <div className="infinity-koi-end-stat"><span className="num" id="infinity-koi-end-time">0s</span><span className="lbl">Thời gian</span></div>
              <div className="infinity-koi-end-stat"><span className="num" id="infinity-koi-end-best">0</span><span className="lbl">Kỷ lục</span></div>
            </div>
            <button className="infinity-koi-primary" id="infinity-koi-btn-restart">Thả cá lần nữa</button>
          </div>

          <footer className="infinity-koi-credit">CÁ KOI VÔ CỰC — bơi mãi, sống chậm, đừng để nước cuốn đi</footer>
        </div>
      </div>
    </div>
  );
};

export default InfinityKoiGame;
