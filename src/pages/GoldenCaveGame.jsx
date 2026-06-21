import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { treeService } from '../services/treeService';
import './GoldenCaveGame.css';

const GoldenCaveGame = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ---------- DOM ----------
    const titleScreen = document.getElementById('golden-cave-title-screen');
    const endScreen = document.getElementById('golden-cave-end-screen');
    const hud = document.getElementById('golden-cave-hud');
    const canvas = document.getElementById('golden-cave-game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stageEl = document.getElementById('golden-cave-stage');
    const logEl = document.getElementById('golden-cave-log');
    const bannerEl = document.getElementById('golden-cave-message-banner');

    const hudFloor = document.getElementById('golden-cave-hud-floor');
    const hudScore = document.getElementById('golden-cave-hud-score');
    const hudKeys = document.getElementById('golden-cave-hud-keys');
    const hudHearts = document.getElementById('golden-cave-hud-hearts');

    const btnStart = document.getElementById('golden-cave-btn-start');
    const btnRestart = document.getElementById('golden-cave-btn-restart');
    const endTitle = document.getElementById('golden-cave-end-title');
    const endSub = document.getElementById('golden-cave-end-sub');
    const endScore = document.getElementById('golden-cave-end-score');
    const endFloor = document.getElementById('golden-cave-end-floor');
    const endIcon = document.getElementById('golden-cave-end-icon');

    // ---------- Constants ----------
    const COLS = 15;
    const ROWS = 11;
    let TILE = 40; 

    const TILE_WALL = 0;
    const TILE_FLOOR = 1;
    const TILE_TRAP = 2;     
    const TILE_DOOR = 3;     
    const TILE_STAIRS = 4;   

    // ---------- Game State ----------
    let state = null; 
    let lastTime = 0;
    let rafId = null;
    let keysDown = {};

    function resetGame(){
      state = {
        floor: 1,
        score: 0,
        keys: 0,
        maxHp: 5,
        hp: 5,
        invuln: 0,
        attackCooldown: 0,
        attackFlashTiles: [], 
        player: { x: 1, y: 1, facing: 'down', moveT: 0 },
        grid: [],
        enemies: [],
        gold: [],
        keyItem: null, 
        doorPos: null,
        stairsPos: null,
        particles: [],
        floorCleared: false,
        messageTimer: 0,
        running: true,
        deepestFloor: 1,
        torchPulse: 0
      };
      generateFloor();
      updateHud();
    }

    function emptyGrid(){
      const g = [];
      for(let y=0;y<ROWS;y++){
        const row = [];
        for(let x=0;x<COLS;x++){
          const border = (x===0||y===0||x===COLS-1||y===ROWS-1);
          row.push(border ? TILE_WALL : TILE_FLOOR);
        }
        g.push(row);
      }
      return g;
    }

    function rand(n){ return Math.floor(Math.random()*n); }
    function randRange(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
    function dist(ax,ay,bx,by){ return Math.abs(ax-bx)+Math.abs(ay-by); }

    function generateFloor(){
      const g = emptyGrid();

      const pillarCount = randRange(6, 10);
      for(let i=0;i<pillarCount;i++){
        const x = randRange(2, COLS-3);
        const y = randRange(2, ROWS-3);
        if(dist(x,y,1,1) > 2){
          g[y][x] = TILE_WALL;
        }
      }

      const trapCount = randRange(3, 5 + state.floor);
      let placed = 0, attempts=0;
      while(placed < trapCount && attempts < 200){
        attempts++;
        const x = randRange(1, COLS-2);
        const y = randRange(1, ROWS-2);
        if(g[y][x]===TILE_FLOOR && dist(x,y,1,1)>2){
          g[y][x] = TILE_TRAP;
          placed++;
        }
      }

      let stairsPos = null;
      attempts=0;
      while(!stairsPos && attempts<300){
        attempts++;
        const x = randRange(1, COLS-2);
        const y = randRange(1, ROWS-2);
        if(g[y][x]===TILE_FLOOR && dist(x,y,1,1) >= 8){
          stairsPos = {x,y};
        }
      }
      if(!stairsPos) stairsPos = {x:COLS-2, y:ROWS-2};
      g[stairsPos.y][stairsPos.x] = TILE_FLOOR; 
      state.stairsPos = stairsPos;

      let doorPos = null;
      let keyItem = null;
      if(state.floor >= 2 && Math.random() < 0.8){
        const candidates = [];
        for(let dx=-2;dx<=2;dx++){
          for(let dy=-2;dy<=2;dy++){
            const x = stairsPos.x+dx, y = stairsPos.y+dy;
            if(x>0 && y>0 && x<COLS-1 && y<ROWS-1 && g[y] && g[y][x]===TILE_FLOOR && dist(x,y,1,1)>3){
              candidates.push({x,y});
            }
          }
        }
        if(candidates.length){
          doorPos = candidates[rand(candidates.length)];
          g[doorPos.y][doorPos.x] = TILE_DOOR;
        }
        attempts=0;
        while(!keyItem && attempts<200){
          attempts++;
          const x = randRange(1, COLS-2);
          const y = randRange(1, ROWS-2);
          if(g[y][x]===TILE_FLOOR && dist(x,y,1,1)>2 && (!doorPos || dist(x,y,doorPos.x,doorPos.y)>2)){
            keyItem = {x,y};
          }
        }
      }
      state.doorPos = doorPos;
      state.keyItem = keyItem;

      const gold = [];
      const goldCount = randRange(4, 7);
      attempts=0;
      let goldPlaced=0;
      while(goldPlaced<goldCount && attempts<300){
        attempts++;
        const x = randRange(1, COLS-2);
        const y = randRange(1, ROWS-2);
        if(g[y][x]===TILE_FLOOR && dist(x,y,1,1)>1 && !(keyItem && keyItem.x===x && keyItem.y===y)){
          if(!gold.some(c=>c.x===x&&c.y===y)){
            gold.push({x,y, value: Math.random()<0.15 ? 5 : 2, bob:Math.random()*Math.PI*2});
            goldPlaced++;
          }
        }
      }
      state.gold = gold;

      const enemies = [];
      const enemyCount = Math.min(2 + Math.floor(state.floor*0.8), 8);
      attempts=0;
      let enemyPlaced=0;
      while(enemyPlaced<enemyCount && attempts<300){
        attempts++;
        const x = randRange(1, COLS-2);
        const y = randRange(1, ROWS-2);
        if(g[y][x]===TILE_FLOOR && dist(x,y,1,1)>4){
          enemies.push({
            x, y, baseX:x, baseY:y,
            hp: 1 + Math.floor(state.floor/3),
            maxHp: 1 + Math.floor(state.floor/3),
            dir: rand(4),
            moveTimer: Math.random()*1.2,
            type: Math.random()<0.3 ? 'wraith' : 'bat',
            alive:true,
            hitFlash:0
          });
          enemyPlaced++;
        }
      }
      state.enemies = enemies;

      state.grid = g;
      state.player.x = 1;
      state.player.y = 1;
      state.floorCleared = false;
      state.particles = [];

      showBanner(`Tầng ${state.floor}`, 1400);
      log(state.floor===1 ? "Bạn bước vào miệng hang tối..." : `Bạn xuống sâu hơn — tầng ${state.floor}.`);
    }

    let logTimer=null;
    function log(msg){
      logEl.textContent = msg;
      clearTimeout(logTimer);
      logTimer = setTimeout(()=>{ logEl.textContent=''; }, 3200);
    }

    let bannerTimer=null;
    function showBanner(msg, duration){
      bannerEl.textContent = msg;
      bannerEl.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(()=>{ bannerEl.classList.remove('show'); }, duration || 1200);
    }

    function updateHud(){
      hudFloor.textContent = state.floor;
      hudScore.textContent = state.score;
      hudKeys.textContent = state.keys;
      hudHearts.innerHTML = '';
      for(let i=0;i<state.maxHp;i++){
        const h = document.createElement('div');
        h.className = 'golden-cave-heart' + (i < state.hp ? '' : ' lost');
        hudHearts.appendChild(h);
      }
    }

    function resizeCanvas(){
      if (!stageEl || !canvas) return;
      const w = stageEl.offsetWidth;
      const h = stageEl.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      TILE = Math.min(w/COLS, h/ROWS);
    }

    function gridOffset(){
      if (!stageEl) return { ox: 0, oy: 0 };
      const w = stageEl.offsetWidth;
      const h = stageEl.offsetHeight;
      const gw = TILE*COLS, gh = TILE*ROWS;
      return { ox:(w-gw)/2, oy:(h-gh)/2 };
    }

    const handleKeydown = (e) => {
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      keysDown[e.key.toLowerCase()] = true;
      if(e.key===' ') tryAttack();
    };

    const handleKeyup = (e) => {
      keysDown[e.key.toLowerCase()] = false;
    };

    function bindHoldDirection(el, flagName){
      if(!el) return;
      const setOn = (e)=>{ e.preventDefault(); e.stopPropagation(); keysDown[flagName] = true; };
      const setOff = (e)=>{ if(e) e.preventDefault(); keysDown[flagName] = false; };
      el.addEventListener('touchstart', setOn, {passive:false});
      el.addEventListener('touchend', setOff, {passive:false});
      el.addEventListener('touchcancel', setOff, {passive:false});
      el.addEventListener('mousedown', setOn);
      el.addEventListener('mouseup', setOff);
      el.addEventListener('mouseleave', setOff);
    }
    function bindTap(el, fn){
      if(!el) return;
      const trigger = (e)=>{ e.preventDefault(); e.stopPropagation(); fn(); };
      el.addEventListener('touchstart', trigger, {passive:false});
      el.addEventListener('mousedown', trigger);
    }

    bindHoldDirection(document.getElementById('golden-cave-btn-up'), 'arrowup');
    bindHoldDirection(document.getElementById('golden-cave-btn-down'), 'arrowdown');
    bindHoldDirection(document.getElementById('golden-cave-btn-left'), 'arrowleft');
    bindHoldDirection(document.getElementById('golden-cave-btn-right'), 'arrowright');
    bindTap(document.getElementById('golden-cave-btn-action'), tryAttack);

    const preventDef = (e) => e.preventDefault();
    let lastTapTime = 0;
    const preventDoubleTap = (e) => {
      const now = Date.now();
      if(now - lastTapTime < 300) e.preventDefault(); 
      lastTapTime = now;
    };

    const MOVE_INTERVAL = 0.14; 

    function tileAt(x,y){
      if(y<0||y>=ROWS||x<0||x>=COLS) return TILE_WALL;
      return state.grid[y][x];
    }

    function isWalkable(x,y){
      const t = tileAt(x,y);
      if(t===TILE_WALL) return false;
      if(t===TILE_DOOR) return false; 
      return true;
    }

    function tryMove(dx,dy){
      if(!state.running) return;
      const p = state.player;
      if(dx>0) p.facing='right';
      else if(dx<0) p.facing='left';
      else if(dy>0) p.facing='down';
      else if(dy<0) p.facing='up';

      const nx = p.x+dx, ny=p.y+dy;
      const t = tileAt(nx,ny);

      if(t===TILE_DOOR){
        if(state.keys>0){
          state.keys--;
          state.grid[ny][nx] = TILE_FLOOR;
          log("Bạn dùng chìa khóa mở cánh cửa đá nặng nề.");
          spawnParticles(nx,ny,'#caa84a');
          updateHud();
        } else {
          log("Cánh cửa khóa chặt. Cần tìm chìa khóa.");
          return;
        }
      }

      if(!isWalkable(nx,ny)) return;

      p.x = nx; p.y = ny;

      handleTileEffects();
    }

    function handleTileEffects(){
      const p = state.player;
      const t = tileAt(p.x,p.y);

      if(t===TILE_TRAP && state.invuln<=0){
        damagePlayer(1, "Một mũi gai đâm xuyên qua chân bạn!");
        spawnParticles(p.x,p.y,'#a8362f');
      }

      const gi = state.gold.findIndex(g=>g.x===p.x && g.y===p.y);
      if(gi>=0){
        const g = state.gold[gi];
        state.score += g.value;
        spawnParticles(p.x,p.y, g.value>2 ? '#fff1b0' : '#e8b94a');
        log(g.value>2 ? `Một viên ngọc quý! +${g.value} Xu` : `Bạn nhặt vàng. +${g.value} Xu`);
        state.gold.splice(gi,1);
        updateHud();
      }

      if(state.keyItem && state.keyItem.x===p.x && state.keyItem.y===p.y){
        state.keys++;
        state.keyItem=null;
        spawnParticles(p.x,p.y,'#caa84a');
        log("Bạn tìm thấy một chiếc chìa khóa cổ!");
        updateHud();
      }

      if(state.stairsPos && p.x===state.stairsPos.x && p.y===state.stairsPos.y){
        goNextFloor();
      }
    }

    function tryAttack(){
      if(!state.running || state.attackCooldown>0) return;
      state.attackCooldown = 0.32;
      const p = state.player;
      let tx=p.x, ty=p.y;
      if(p.facing==='up') ty--;
      else if(p.facing==='down') ty++;
      else if(p.facing==='left') tx--;
      else if(p.facing==='right') tx++;

      state.attackFlashTiles = [{x:tx,y:ty,t:0.18}];

      const enemy = state.enemies.find(e=>e.alive && e.x===tx && e.y===ty);
      if(enemy){
        enemy.hp--;
        enemy.hitFlash = 0.2;
        spawnParticles(tx,ty,'#9fd1ff');
        if(enemy.hp<=0){
          enemy.alive=false;
          state.score += 2;
          log("Hạ gục quái vật! +2 Xu");
          spawnParticles(tx,ty,'#ffffff');
          updateHud();
        } else {
          log("Đòn đánh trúng đích!");
        }
      }
    }

    function damagePlayer(amount, msg){
      state.hp -= amount;
      state.invuln = 0.9;
      if(msg) log(msg);
      flashScreenDamage();
      if(state.hp<=0){
        state.hp=0;
        endGame(false);
      }
      updateHud();
    }

    let damageFlash=0;
    function flashScreenDamage(){ damageFlash = 0.35; }

    function goNextFloor(){
      if(!state.running) return;
      state.deepestFloor = Math.max(state.deepestFloor, state.floor);
      state.score += 5;
      state.floor++;
      if(state.hp < state.maxHp) state.hp = Math.min(state.maxHp, state.hp+1); 
      showBanner(`Xuống tầng ${state.floor}...`, 1100);
      generateFloor();
      updateHud();
    }

    function spawnParticles(gx,gy,color){
      const {ox,oy} = gridOffset();
      const cx = ox + gx*TILE + TILE/2;
      const cy = oy + gy*TILE + TILE/2;
      for(let i=0;i<8;i++){
        const ang = Math.random()*Math.PI*2;
        const spd = 40+Math.random()*60;
        state.particles.push({
          x:cx, y:cy,
          vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
          life: 0.4+Math.random()*0.3,
          maxLife: 0.4+Math.random()*0.3,
          color
        });
      }
    }

    function updateEnemies(dt){
      const p = state.player;
      for(const e of state.enemies){
        if(!e.alive) continue;
        if(e.hitFlash>0) e.hitFlash -= dt;
        e.moveTimer -= dt;
        if(e.moveTimer<=0){
          e.moveTimer = e.type==='bat' ? 0.5 : 0.8;
          const d = dist(e.x,e.y,p.x,p.y);
          let dx=0, dy=0;
          if(d<=4){
            if(Math.abs(e.x-p.x) > Math.abs(e.y-p.y)){
              dx = e.x < p.x ? 1 : -1;
            } else {
              dy = e.y < p.y ? 1 : -1;
            }
          } else if(Math.random()<0.6){
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            const choice = dirs[rand(dirs.length)];
            dx=choice[0]; dy=choice[1];
          }
          const nx=e.x+dx, ny=e.y+dy;
          if(dx!==0||dy!==0){
            const t = tileAt(nx,ny);
            const occupied = state.enemies.some(o=>o!==e && o.alive && o.x===nx && o.y===ny);
            if(t===TILE_FLOOR && !occupied){
              e.x=nx; e.y=ny;
            }
          }
        }
        if(e.x===p.x && e.y===p.y && state.invuln<=0){
          damagePlayer(1, e.type==='wraith' ? "Bóng ma đá lướt qua, lạnh thấu xương!" : "Con dơi cắn bạn!");
        }
      }
    }

    function update(dt){
      if(!state.running) return;

      if(state.attackCooldown>0) state.attackCooldown -= dt;
      if(state.invuln>0) state.invuln -= dt;
      if(damageFlash>0) damageFlash -= dt;
      state.torchPulse += dt;

      state.player.moveT -= dt;
      if(state.player.moveT<=0){
        let dx=0,dy=0;
        if(keysDown['arrowup']||keysDown['w']) dy=-1;
        else if(keysDown['arrowdown']||keysDown['s']) dy=1;
        else if(keysDown['arrowleft']||keysDown['a']) dx=-1;
        else if(keysDown['arrowright']||keysDown['d']) dx=1;
        if(dx!==0||dy!==0){
          tryMove(dx,dy);
          state.player.moveT = MOVE_INTERVAL;
        }
      }

      updateEnemies(dt);

      state.attackFlashTiles = state.attackFlashTiles.filter(f=>{
        f.t -= dt; return f.t>0;
      });

      for(const pt of state.particles){
        pt.x += pt.vx*dt;
        pt.y += pt.vy*dt;
        pt.vx *= 0.92; pt.vy *= 0.92;
        pt.life -= dt;
      }
      state.particles = state.particles.filter(pt=>pt.life>0);

      for(const g of state.gold) g.bob += dt*4;
    }

    function draw(){
      if(!stageEl || !ctx) return;
      const rect = stageEl.getBoundingClientRect();
      ctx.clearRect(0,0,rect.width, rect.height);

      const {ox,oy} = gridOffset();

      for(let y=0;y<ROWS;y++){
        for(let x=0;x<COLS;x++){
          const t = state.grid[y][x];
          const px = ox+x*TILE, py = oy+y*TILE;
          drawTile(px,py,t,x,y);
        }
      }

      if(state.stairsPos){
        drawStairs(ox+state.stairsPos.x*TILE, oy+state.stairsPos.y*TILE);
      }

      if(state.keyItem){
        drawKeyItem(ox+state.keyItem.x*TILE, oy+state.keyItem.y*TILE);
      }

      for(const g of state.gold){
        drawGold(ox+g.x*TILE, oy+g.y*TILE, g);
      }

      for(const f of state.attackFlashTiles){
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.t/0.18)*0.7;
        ctx.fillStyle = '#fff1b0';
        ctx.beginPath();
        ctx.arc(ox+f.x*TILE+TILE/2, oy+f.y*TILE+TILE/2, TILE*0.38, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      for(const e of state.enemies){
        if(!e.alive) continue;
        drawEnemy(ox+e.x*TILE, oy+e.y*TILE, e);
      }

      drawPlayer(ox+state.player.x*TILE, oy+state.player.y*TILE, state.player);

      for(const pt of state.particles){
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life/pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      if(damageFlash>0){
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, damageFlash);
        ctx.fillStyle = '#a8362f';
        ctx.fillRect(0,0,rect.width,rect.height);
        ctx.restore();
      }
    }

    function drawTile(px,py,t,gx,gy){
      if(t===TILE_WALL){
        ctx.fillStyle = '#150d07';
        ctx.fillRect(px,py,TILE,TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth=1;
        ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        const seed = (gx*7+gy*13)%5;
        ctx.fillRect(px+5+seed, py+8, 3,3);
        return;
      }
      ctx.fillStyle = ((gx+gy)%2===0) ? '#2b1d12' : '#2f2014';
      ctx.fillRect(px,py,TILE,TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);

      if(t===TILE_TRAP){
        ctx.fillStyle = '#1c130a';
        ctx.beginPath();
        ctx.arc(px+TILE/2, py+TILE/2, TILE*0.32, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#a8362f';
        ctx.lineWidth=2;
        for(let i=0;i<6;i++){
          const ang = (i/6)*Math.PI*2;
          ctx.beginPath();
          ctx.moveTo(px+TILE/2, py+TILE/2);
          ctx.lineTo(px+TILE/2+Math.cos(ang)*TILE*0.3, py+TILE/2+Math.sin(ang)*TILE*0.3);
          ctx.stroke();
        }
      } else if(t===TILE_DOOR){
        ctx.fillStyle = '#3b2a13';
        ctx.fillRect(px+4,py+2,TILE-8,TILE-4);
        ctx.strokeStyle = '#caa84a';
        ctx.lineWidth=2;
        ctx.strokeRect(px+4,py+2,TILE-8,TILE-4);
        ctx.fillStyle='#caa84a';
        ctx.beginPath();
        ctx.arc(px+TILE/2, py+TILE/2, 3,0,Math.PI*2);
        ctx.fill();
      }
    }

    function drawStairs(px,py){
      ctx.save();
      ctx.fillStyle = '#0d0905';
      for(let i=0;i<4;i++){
        const inset = i*5;
        ctx.globalAlpha = 0.85 - i*0.12;
        ctx.fillRect(px+inset, py+inset, TILE-inset*2, TILE-inset*2);
      }
      ctx.globalAlpha=1;
      ctx.fillStyle = '#ffd27a';
      ctx.font = `${TILE*0.5}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('▼', px+TILE/2, py+TILE/2);
      ctx.restore();
    }

    function drawKeyItem(px,py){
      const bob = Math.sin(state.torchPulse*4)*3;
      ctx.save();
      ctx.translate(px+TILE/2, py+TILE/2+bob);
      ctx.fillStyle='#f3d27a';
      ctx.strokeStyle='#7a5a1c';
      ctx.lineWidth=1.5;
      ctx.font = `${TILE*0.5}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='#f3d27a'; ctx.shadowBlur=10;
      ctx.fillText('🔑', 0, 0);
      ctx.restore();
    }

    function drawGold(px,py,g){
      const bob = Math.sin(g.bob)*2;
      ctx.save();
      ctx.translate(px+TILE/2, py+TILE/2+bob);
      const big = g.value>=50;
      ctx.shadowColor = big? '#fff1b0':'#e8b94a';
      ctx.shadowBlur = big? 12:6;
      ctx.fillStyle = big? '#fff1b0' : '#e8b94a';
      ctx.beginPath();
      ctx.arc(0,0, big? TILE*0.18:TILE*0.13, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#7a5a1c';
      ctx.lineWidth=1;
      ctx.stroke();
      ctx.restore();
    }

    function drawEnemy(px,py,e){
      ctx.save();
      const cx = px+TILE/2, cy=py+TILE/2;
      const flash = e.hitFlash>0;
      if(e.type==='bat'){
        ctx.fillStyle = flash ? '#ffffff' : '#5c4a6e';
        ctx.beginPath();
        ctx.ellipse(cx,cy, TILE*0.22, TILE*0.16, 0,0,Math.PI*2);
        ctx.fill();
        const flap = Math.sin(state.torchPulse*10+e.x+e.y)*0.3;
        ctx.fillStyle = flash ? '#eeeeee' : '#43355a';
        ctx.beginPath();
        ctx.moveTo(cx-TILE*0.2, cy);
        ctx.quadraticCurveTo(cx-TILE*0.42, cy-TILE*0.25+flap*10, cx-TILE*0.12, cy-TILE*0.05);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx+TILE*0.2, cy);
        ctx.quadraticCurveTo(cx+TILE*0.42, cy-TILE*0.25-flap*10, cx+TILE*0.12, cy-TILE*0.05);
        ctx.fill();
        ctx.fillStyle='#ff5c5c';
        ctx.beginPath(); ctx.arc(cx-4,cy-2,1.6,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+4,cy-2,1.6,0,Math.PI*2); ctx.fill();
      } else {
        ctx.globalAlpha = flash ? 1 : 0.78;
        ctx.fillStyle = flash ? '#ffffff' : '#9fc9d9';
        ctx.beginPath();
        ctx.moveTo(cx, cy-TILE*0.3);
        ctx.quadraticCurveTo(cx+TILE*0.26, cy-TILE*0.1, cx+TILE*0.2, cy+TILE*0.28);
        ctx.lineTo(cx+TILE*0.1, cy+TILE*0.18);
        ctx.lineTo(cx, cy+TILE*0.3);
        ctx.lineTo(cx-TILE*0.1, cy+TILE*0.18);
        ctx.lineTo(cx-TILE*0.2, cy+TILE*0.28);
        ctx.quadraticCurveTo(cx-TILE*0.26, cy-TILE*0.1, cx, cy-TILE*0.3);
        ctx.fill();
        ctx.globalAlpha=1;
        ctx.fillStyle='#1c2b30';
        ctx.beginPath(); ctx.arc(cx-4,cy-6,1.8,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+4,cy-6,1.8,0,Math.PI*2); ctx.fill();
      }
      if(e.maxHp>1){
        for(let i=0;i<e.maxHp;i++){
          ctx.fillStyle = i<e.hp ? '#ff8c8c' : 'rgba(255,255,255,0.15)';
          ctx.fillRect(cx-e.maxHp*3+i*6, py+2, 4,3);
        }
      }
      ctx.restore();
    }

    function drawPlayer(px,py,p){
      ctx.save();
      const cx=px+TILE/2, cy=py+TILE/2;
      const blink = state.invuln>0 && Math.floor(state.torchPulse*14)%2===0;
      ctx.globalAlpha = blink ? 0.4 : 1;

      ctx.fillStyle = '#3a6e4f';
      ctx.beginPath();
      ctx.moveTo(cx, cy-TILE*0.28);
      ctx.lineTo(cx+TILE*0.22, cy+TILE*0.3);
      ctx.lineTo(cx-TILE*0.22, cy+TILE*0.3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e3b98a';
      ctx.beginPath();
      ctx.arc(cx, cy-TILE*0.22, TILE*0.15, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = '#caa84a';
      let dx=0, dy=0;
      if(p.facing==='up'){dy=-1;} else if(p.facing==='down'){dy=1;} else if(p.facing==='left'){dx=-1;} else {dx=1;}
      ctx.beginPath();
      ctx.arc(cx+dx*TILE*0.26, cy+dy*TILE*0.26, 3.4, 0, Math.PI*2);
      ctx.fill();

      ctx.shadowColor = 'rgba(255,160,60,0.6)';
      ctx.shadowBlur = 14;
      ctx.fillStyle='rgba(255,200,120,0.0)';
      ctx.fillRect(cx-1,cy-1,2,2);

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
      lastTime=0;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    function startGame(){
      titleScreen.classList.add('golden-cave-hidden');
      endScreen.classList.add('golden-cave-hidden');
      hud.classList.remove('golden-cave-hidden');
      resizeCanvas();
      resetGame();
      startLoop();
    }

    async function endGame(won){
      state.running = false;
      cancelAnimationFrame(rafId);
      hud.classList.add('golden-cave-hidden');
      endScreen.classList.remove('golden-cave-hidden');
      endTitle.textContent = "Đuốc đã tắt...";
      endSub.textContent = "Bạn gục ngã trong bóng tối sâu thẳm của hang động.";
      endIcon.textContent = "💀";
      endScore.textContent = state.score;
      endFloor.textContent = Math.max(state.deepestFloor, state.floor);

      // --- ADD REWARD TO THESTORY BACKEND ---
      const reward = state.score;
      if (reward > 0) {
        try {
          await treeService.addReward(reward);
        } catch (e) {
          console.error('Failed to claim reward:', e);
        }
      }
    }

    btnStart.addEventListener('click', startGame);
    btnRestart.addEventListener('click', startGame);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', ()=>{
      setTimeout(resizeCanvas, 120);
      setTimeout(resizeCanvas, 400);
    });
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', resizeCanvas);
    }

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    document.addEventListener('touchmove', preventDef, {passive:false});
    document.addEventListener('gesturestart', preventDef);
    document.addEventListener('contextmenu', preventDef);
    document.addEventListener('touchend', preventDoubleTap, {passive:false});

    // Initial resize
    resizeCanvas();

    return () => {
      cancelAnimationFrame(rafId);
      btnStart.removeEventListener('click', startGame);
      btnRestart.removeEventListener('click', startGame);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      document.removeEventListener('touchmove', preventDef);
      document.removeEventListener('gesturestart', preventDef);
      document.removeEventListener('contextmenu', preventDef);
      document.removeEventListener('touchend', preventDoubleTap);
      if(window.visualViewport){
        window.visualViewport.removeEventListener('resize', resizeCanvas);
      }
    };
  }, []);

  return (
    <div className="golden-cave-wrapper">
      <div className="golden-cave-back-btn" onClick={() => navigate('/games')}>
        <ArrowLeft size={24} />
      </div>

      <div id="golden-cave-wrap">
        <div id="golden-cave-stage">
          <div id="golden-cave-torchlight"></div>

          {/* TITLE SCREEN */}
          <div id="golden-cave-title-screen">
            <div className="golden-cave-torch-icon">🔥</div>
            <h1>HANG ĐỘNG VỌNG VÀNG</h1>
            <p className="sub">Lạc vào hang sâu, người thợ mỏ phải thu vàng, né bẫy gai, và đánh bại những bóng ma đá trước khi đuốc tàn lụi. Mỗi tầng càng sâu, kho báu càng nhiều — nhưng hiểm nguy cũng vậy.</p>
            <button className="golden-cave-primary" id="golden-cave-btn-start">Bắt đầu xuống hang</button>
            <div className="golden-cave-keys-hint golden-cave-kbd-hint">
              <span className="golden-cave-key-pill"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> hoặc <kbd>WASD</kbd> để di chuyển</span>
              <span className="golden-cave-key-pill"><kbd>Space</kbd> để tấn công</span>
            </div>
            <div className="golden-cave-keys-hint golden-cave-touch-hint">
              <span className="golden-cave-key-pill">👆 Vuốt D-pad bên trái để di chuyển</span>
              <span className="golden-cave-key-pill">⚔ Chạm nút bên phải để tấn công</span>
            </div>
          </div>

          {/* END SCREEN */}
          <div id="golden-cave-end-screen" className="golden-cave-hidden">
            <div className="golden-cave-torch-icon" id="golden-cave-end-icon">💀</div>
            <h1 id="golden-cave-end-title">Đuốc đã tắt...</h1>
            <p className="sub" id="golden-cave-end-sub">Bạn đã gục ngã trong bóng tối.</p>
            <div className="golden-cave-hud-block" style={{ marginBottom: '22px' }}>
              <div className="golden-cave-stat">Tổng Xu: <b id="golden-cave-end-score">0</b></div>
              <div className="golden-cave-stat">Tầng sâu nhất: <b id="golden-cave-end-floor">1</b></div>
            </div>
            <button className="golden-cave-primary" id="golden-cave-btn-restart">Thử lại</button>
          </div>

          {/* HUD */}
          <header className="golden-cave-hud golden-cave-hidden" id="golden-cave-hud">
            <div className="golden-cave-hud-block">
              <div className="golden-cave-stat">⛏ Tầng <b id="golden-cave-hud-floor">1</b></div>
              <div className="golden-cave-stat">✦ Xu <b id="golden-cave-hud-score">0</b></div>
            </div>
            <div className="golden-cave-hud-block">
              <div className="golden-cave-stat">🔑 <b id="golden-cave-hud-keys">0</b></div>
              <div className="golden-cave-hearts" id="golden-cave-hud-hearts"></div>
            </div>
          </header>

          <div id="golden-cave-game-area">
            <canvas id="golden-cave-game-canvas"></canvas>
          </div>

          <div id="golden-cave-message-banner"></div>
          <div id="golden-cave-log"></div>

          <footer className="golden-cave-credit">Hang Động Vọng Vàng — phiêu lưu thu thập vàng, sinh tồn nhiều tầng</footer>
        </div>
      </div>

      <div className="golden-cave-mobile-controls">
        <div className="golden-cave-dpad">
          <button id="golden-cave-btn-up" aria-label="Lên">↑</button>
          <button id="golden-cave-btn-left" aria-label="Trái">←</button>
          <div id="golden-cave-btn-center"></div>
          <button id="golden-cave-btn-right" aria-label="Phải">→</button>
          <button id="golden-cave-btn-down" aria-label="Xuống">↓</button>
        </div>
        <div className="golden-cave-action-pad">
          <button id="golden-cave-btn-action" aria-label="Tấn công">⚔</button>
        </div>
      </div>
    </div>
  );
};

export default GoldenCaveGame;
