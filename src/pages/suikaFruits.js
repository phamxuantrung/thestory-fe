export const FRUITS = [
  { level: 0, name: 'Cherry', radius: 15, color: '#ff4757', emoji: '🍒' },
  { level: 1, name: 'Strawberry', radius: 22, color: '#ff6b81', emoji: '🍓' },
  { level: 2, name: 'Grape', radius: 30, color: '#a29bfe', emoji: '🍇' },
  { level: 3, name: 'Dekopon', radius: 38, color: '#ff9f43', emoji: '🍊' },
  { level: 4, name: 'Orange', radius: 48, color: '#ffa502', emoji: '🍊' },
  { level: 5, name: 'Apple', radius: 60, color: '#ff4d4d', emoji: '🍎' },
  { level: 6, name: 'Pear', radius: 72, color: '#badc58', emoji: '🍐' },
  { level: 7, name: 'Peach', radius: 85, color: '#ff9ff3', emoji: '🍑' },
  { level: 8, name: 'Pineapple', radius: 100, color: '#feca57', emoji: '🍍' },
  { level: 9, name: 'Melon', radius: 115, color: '#78e08f', emoji: '🍈' },
  { level: 10, name: 'Watermelon', radius: 135, color: '#2ed573', emoji: '🍉' },
];

// Helper to get fruit by level
export const getFruit = (level) => {
  if (level < 0) return FRUITS[0];
  if (level >= FRUITS.length) return FRUITS[FRUITS.length - 1];
  return FRUITS[level];
};

const drawKawaiiFace = (ctx, x, y, radius) => {
  ctx.save();
  ctx.translate(x, y);
  
  const eyeOffset = radius * 0.3;
  const eyeSize = radius * 0.1;
  
  // Eyes
  ctx.fillStyle = '#2d3436';
  ctx.beginPath(); ctx.arc(-eyeOffset, 0, eyeSize, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(eyeOffset, 0, eyeSize, 0, Math.PI*2); ctx.fill();
  
  // Eye highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-eyeOffset - eyeSize*0.3, -eyeSize*0.3, eyeSize*0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(eyeOffset - eyeSize*0.3, -eyeSize*0.3, eyeSize*0.4, 0, Math.PI*2); ctx.fill();

  // Blush
  ctx.fillStyle = 'rgba(255, 105, 180, 0.5)';
  ctx.beginPath(); ctx.arc(-eyeOffset - eyeSize*1.5, eyeSize*0.5, eyeSize*0.8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(eyeOffset + eyeSize*1.5, eyeSize*0.5, eyeSize*0.8, 0, Math.PI*2); ctx.fill();

  // Smile
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = Math.max(1, radius * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, eyeSize*0.5, eyeSize*1.2, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
};

export const drawFruit = (ctx, fruit, radius, x = 0, y = 0, angle = 0, shadow = true) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Drop shadow
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
  }

  // Base circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = fruit.color;
  ctx.fill();
  
  ctx.shadowColor = 'transparent'; // Reset shadow for inner details

  // Inner glow
  const grad = ctx.createRadialGradient(-radius*0.3, -radius*0.3, radius*0.1, 0, 0, radius);
  grad.addColorStop(0, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Watermelon stripes
  if (fruit.name === 'Watermelon') {
      ctx.strokeStyle = '#218c53';
      ctx.lineWidth = radius * 0.15;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          const a = (Math.PI / 4) * i - Math.PI / 8;
          ctx.arc(0, 0, radius * 0.9, a, a + Math.PI/12);
          ctx.stroke();
      }
  }
  
  // Stem and Leaf
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.ellipse(0, -radius, radius*0.15, radius*0.05, 0, 0, Math.PI*2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(radius*0.15, -radius*0.95, radius*0.2, radius*0.1, Math.PI/6, 0, Math.PI*2);
  ctx.fill();

  drawKawaiiFace(ctx, 0, 0, radius);

  ctx.restore();
};
