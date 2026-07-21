import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Flame } from 'lucide-react';
import { showToast } from '../components/Toast';
import {
  playDrawSound,
  playCardSound,
  playStealSound,
  playNopeSound,
  playDefuseSound,
  playExplosionSound,
  playShuffleSound,
  playSelectSound
} from '../utils/audioUtils';
import './ExplodingKittensGame.css';

const CARD_IMAGES = {};
const PRELOAD_IMAGES = {
  EXPLODING_KITTEN: '/cards/exploding_kitten.png',
  DEFUSE: '/cards/defuse.png',
  ATTACK: '/cards/attack.png',
  SKIP: '/cards/skip.png',
  FAVOR: '/cards/favor.png',
  NOPE: '/cards/nope.png',
  SHUFFLE: '/cards/shuffle.png',
  SEE_THE_FUTURE: '/cards/see_the_future.png',
  NORMAL_CAT_1: '/cards/normal_cat_1.png',
  NORMAL_CAT_2: '/cards/normal_cat_2.png',
  NORMAL_CAT_3: '/cards/normal_cat_3.png',
  NORMAL_CAT_4: '/cards/normal_cat_4.png',
  NORMAL_CAT_5: '/cards/normal_cat_5.png',
  CARD_BACK: '/cards/1.png',
  MIRROR: '/cards/mirror.png',
  DESPAIR: '/cards/despair.png',
  ALTER_THE_FUTURE: '/cards/alter_the_future.png',
  BTN_DRAW: '/cards/button/1.png',
  BTN_PLAY: '/cards/button/2.png',
  BTN_END: '/cards/button/3.png',
  BTN_CANCEL: '/cards/button/4.png'
};

if (typeof window !== 'undefined') {
  Object.entries(PRELOAD_IMAGES).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    CARD_IMAGES[key] = img;
  });
}

const CARD_COLORS = {
  EXPLODING_KITTEN: { theme: '#ff4757', text: '#611212', name: 'CƠN GHEN', desc: 'Bốc trúng là toang!', iconType: 'paw' },
  DEFUSE: { theme: '#2ed573', text: '#154715', name: 'DỖ DÀNH', desc: 'Xoa dịu Cơn Ghen', iconType: 'scissors' },
  ATTACK: { theme: '#ff6348', text: '#611212', name: 'BẮT ĐỀN', desc: 'Người kia đi 2 lượt', iconType: 'bow' },
  SKIP: { theme: '#9b59b6', text: '#3c1261', name: 'BƠ ĐI', desc: 'Kết thúc lượt ngay', iconType: 'zzz' },
  FAVOR: { theme: '#1e90ff', text: '#123761', name: 'LÀM NŨNG', desc: 'Đòi 1 lá ngẫu nhiên', iconType: 'hand' },
  NOPE: { theme: '#eccc68', text: '#614d12', name: 'CHÊ!', desc: 'Từ chối hành động', iconType: 'shield' },
  SHUFFLE: { theme: '#ffa502', text: '#613412', name: 'ĐỔI GIÓ', desc: 'Trộn lại bộ bài', iconType: 'shuffle' },
  SEE_THE_FUTURE: { theme: '#ff7f50', text: '#612012', name: 'ĐỌC TÂM TRÍ', desc: 'Nhìn trộm 3 lá', iconType: 'eye' },
  NORMAL_CAT_1: { theme: '#ff7eb3', text: '#611239', name: 'MÈO THƠM MÁ', desc: 'Vô hại', iconType: 'heart' },
  NORMAL_CAT_2: { theme: '#ff9a9e', text: '#5c162e', name: 'MÈO ÔM ẤP', desc: 'Vô hại', iconType: 'heart' },
  NORMAL_CAT_3: { theme: '#fecfef', text: '#5e2343', name: 'MÈO LÀM NŨNG', desc: 'Vô hại', iconType: 'heart' },
  NORMAL_CAT_4: { theme: '#a18cd1', text: '#2a1a4a', name: 'MÈO DỖI HỜN', desc: 'Vô hại', iconType: 'heart' },
  NORMAL_CAT_5: { theme: '#fdcbf1', text: '#611e43', name: 'MÈO NẮM TAY', desc: 'Vô hại', iconType: 'heart' },
  MIRROR: { theme: '#00d2d3', text: '#004747', name: 'PHẢN ĐÒN', desc: 'Bật lại chiêu', iconType: 'shield' },
  DESPAIR: { theme: '#222f3e', text: '#c8d6e5', name: 'TUYỆT VỌNG', desc: 'Khóa Dỗ Dành', iconType: 'skull' },
  ALTER_THE_FUTURE: { theme: '#feca57', text: '#5f4b16', name: 'ĐỔI VẬN', desc: 'Sắp xếp 3 lá', iconType: 'eye' }
};

const ExplodingKittensGame = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [gameState, setGameState] = useState('CONNECTING');
  const [modalData, setModalData] = useState(null);
  const [defusePos, setDefusePos] = useState(0);
  const [nopeChallenge, setNopeChallenge] = useState(null);
  const [nopeTimeLeft, setNopeTimeLeft] = useState(0);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [demandMessage, setDemandMessage] = useState(null);
  const [selectedDemandType, setSelectedDemandType] = useState(null);
  const [showExpansionProposal, setShowExpansionProposal] = useState(false);
  const [isWaitingExpansion, setIsWaitingExpansion] = useState(false);
  const [showExpansionList, setShowExpansionList] = useState(false);
  const [showAlterFuture, setShowAlterFuture] = useState(false);
  const [alterFutureCards, setAlterFutureCards] = useState([]);
  const [selectedAlterIdx, setSelectedAlterIdx] = useState(null);
  const isDraggingDefuseRef = useRef(false);
  const recentlyPlayedCardIdsRef = useRef(new Set());

  // Global Socket and User
  const socket = useSocket();
  const { user } = useAuth();

  // Engine State
  const engineRef = useRef({
    state: null,
    cardsInHand: [],
    discardPile: [],
    deckPos: { x: 0, y: 0 },
    discardPos: { x: 0, y: 0 },
    mouseX: 0, mouseY: 0,
    isDragging: false,
    draggedCardId: null,
    selectedCardIds: [],
    animations: [],
    width: 0, height: 0,
    nopeTimeLeft: 0
  });

  const animFrameId = useRef(null);

  useEffect(() => {
    let interval;
    if (gameState === 'CHALLENGE_NOPE') {
      engineRef.current.nopeTimeLeft = 5000;
      setNopeTimeLeft(5000);
      interval = setInterval(() => {
        engineRef.current.nopeTimeLeft = Math.max(0, engineRef.current.nopeTimeLeft - 50);
        setNopeTimeLeft(engineRef.current.nopeTimeLeft);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('ek:join_queue', {
      id: user._id,
      name: user.displayName || 'Player',
      avatar: user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user._id
    });

    const onWaiting = () => setGameState('WAITING');
    const onMatchFound = () => {
      showToast('Người yêu đã vào phòng!', 'success');
      setGameState('PLAYING');
    };

    const onGameState = (state) => {
      if (engineRef.current.state === 'CONNECTING') {
        engineRef.current.state = 'PLAYING';
      }
      // Hide expansion proposal if game resets
      setShowExpansionProposal(false);
      setIsWaitingExpansion(false);
      
      const oldState = engineRef.current.state;
      const oldHand = oldState?.me?.hand || [];

      engineRef.current.state = state;

      const newHand = state.me?.hand || [];
      if (oldState?.state === 'ACTION_STEAL' && state.state === 'PLAYING') {
        const oldIds = new Set(oldHand.map(c => c.id));
        const newCards = newHand.filter(c => !oldIds.has(c.id));
        if (newCards.length === 1) {
          engineRef.current.selectedCardIds = [newCards[0].id];
        }
      }

      if (state.state === 'DEFUSING' && state.turnId === socket?.id && oldState?.state !== 'DEFUSING') {
        playExplosionSound();
      }

      if (state.state === 'DEFUSING' && state.turnId === socket?.id) {
        setDefusePos(0); // Mặc định: trên cùng (top of deck = index 0)
        setGameState('DEFUSING');
      } else if (state.state === 'CHALLENGE_NOPE') {
        setGameState('CHALLENGE_NOPE');
      } else if (state.state === 'ACTION_STEAL') {
        setGameState('ACTION_STEAL');
      } else if (state.state === 'ACTION_3_CATS') {
        setGameState('ACTION_3_CATS');
      } else if (state.state === 'GAME_OVER') {
        // Do nothing
      } else {
        setGameState('PLAYING');
        setNopeChallenge(null);
      }
      syncHandCards();
    };

    const onCardPlayed = ({ socketId, card }) => {
      if (card.type === 'NOPE') playNopeSound();
      else if (card.type === 'DEFUSE') playDefuseSound();
      else playCardSound();
      // Ưu tiên dùng recentlyPlayedCardIds để xác định isMe
      // vì socket.id có thể thay đổi khi reconnect/polling trên môi trường deploy
      let isMe = recentlyPlayedCardIdsRef.current.has(card.id);
      if (isMe) {
        recentlyPlayedCardIdsRef.current.delete(card.id);
      } else {
        // Fallback: so sánh socketId (chỉ đúng trên local/single instance)
        isMe = socketId === socket?.id;
      }
      playDiscardAnimation(card, isMe);
    };
    const onShuffled = () => {
      playShuffleSound();
      engineRef.current.shuffleAnim = { active: true, startTime: Date.now() };
    };
    const onPlayerDrew = ({ socketId }) => {
      playDrawSound();
      playDrawAnimation(socketId === socket?.id);
    };
    const onSeeFuture = (cards) => setModalData({ type: 'future', cards });
    const onNopeChallenge = (data) => {
      engineRef.current.nopeChallenge = data;
      setNopeChallenge(data);
      if (data.targetId === socket?.id) {
        const engine = engineRef.current;
        const hand = engine.state?.me?.hand || [];
        const nopeCard = hand.find(c => c.type === 'NOPE');
        if (nopeCard) {
          engine.selectedCardIds = [nopeCard.id];
        }
      }
    };
    const onGameOver = ({ reason, winner, loser }) => {
      setGameState('GAME_OVER');
      setModalData({ type: 'game_over', reason, loser, winner, isWin: winner === socket.id });
      setNopeChallenge(null);
      engineRef.current.nopeChallenge = null;
    };

    const onDemandResult = ({ success, type, sourceId }) => {
      const isMe = sourceId === socket.id;
      const cardName = CARD_COLORS[type]?.name || type;
      if (success) {
        setDemandMessage(isMe ? `Bạn đã lấy được thẻ ${cardName}!` : `Bị cướp mất 1 thẻ ${cardName}!`);
      } else {
        setDemandMessage(isMe ? `Đối phương không có thẻ ${cardName}!` : `Đối phương định cướp ${cardName} nhưng bạn không có!`);
      }
      setTimeout(() => setDemandMessage(null), 4000);
    };

    socket.on('ek:waiting_in_queue', onWaiting);
    socket.on('ek:match_found', onMatchFound);
    socket.on('ek:game_state', onGameState);
    socket.on('ek:card_played', onCardPlayed);
    socket.on('ek:shuffled', onShuffled);
    socket.on('ek:player_drew', onPlayerDrew);
    socket.on('ek:see_future', onSeeFuture);
    socket.on('ek:alter_future', (cards) => {
      setAlterFutureCards(cards);
      setShowAlterFuture(true);
    });
    socket.on('ek:nope_challenge', onNopeChallenge);
    socket.on('ek:game_over', onGameOver);
    socket.on('ek:demand_result', onDemandResult);
    socket.on('ek:expansion_proposed', () => setShowExpansionProposal(true));
    socket.on('ek:expansion_rejected', () => {
      setIsWaitingExpansion(false);
      showToast('ĐốI phương đã từ chối Bản Mở Rộng!', 'error');
    });

    return () => {
      socket.off('ek:waiting_in_queue', onWaiting);
      socket.off('ek:match_found', onMatchFound);
      socket.off('ek:game_state', onGameState);
      socket.off('ek:card_played', onCardPlayed);
      socket.off('ek:shuffled', onShuffled);
      socket.off('ek:player_drew', onPlayerDrew);
      socket.off('ek:see_future', onSeeFuture);
      socket.off('ek:alter_future');
      socket.off('ek:nope_challenge', onNopeChallenge);
      socket.off('ek:game_over', onGameOver);
      socket.off('ek:demand_result', onDemandResult);
      socket.off('ek:expansion_proposed');
      socket.off('ek:expansion_rejected');
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [socket, user]);

  function syncHandCards() {
    const engine = engineRef.current;
    if (!engine.state || !engine.state.me) return;

    const serverHand = engine.state.me.hand || [];

    // 1. Giữ nguyên thứ tự các lá bài hiện có (nếu vẫn còn trên server) và cập nhật data mới
    const preservedCards = engine.cardsInHand
      .filter(localCard => serverHand.some(sc => sc.id === localCard.id))
      .map(localCard => {
        const sc = serverHand.find(c => c.id === localCard.id);
        return { ...localCard, ...sc };
      });

    // 2. Thêm các lá bài mới rút vào cuối mảng
    const newCards = serverHand
      .filter(sc => !engine.cardsInHand.some(localCard => localCard.id === sc.id))
      .map(c => ({
        ...c,
        x: engine.deckPos.x,
        y: engine.deckPos.y,
        targetX: 0, targetY: 0
      }));

    engine.cardsInHand = [...preservedCards, ...newCards];
    updateTargetPositions();
  }

  function updateTargetPositions() {
    const engine = engineRef.current;
    const cards = engine.cardsInHand;
    const w = engine.width;
    const h = engine.height;

    const cardW = Math.max(50, Math.min(80, w / (cards.length + 1)));
    const cardH = cardW * 1.609;

    // Ít thẻ → thẻ chồng nhau nhiều hơn (overlap 40%) → nhìn như cầm bài thật, không rời rạc.
    // Nhiều thẻ → về lại 18% overlap để vừa màn hình.
    const overlapProgress = Math.min(1, (cards.length - 1) / 10); // 0→1 khi đi từ 1→11 thẻ
    const spacingRatio = 0.5 + overlapProgress * 0.32; // 0.5 (ít thẻ) → 0.82 (nhiều thẻ)
    const spacing = cardW * spacingRatio;

    const totalW = spacing * (cards.length - 1);
    // Optical adjustment: shift left slightly to balance overlapping visual weight
    const startX = w / 2 - totalW / 2 - (cardW - spacing) / 2;
    // Move the cards down closer to the buttons
    const baseY = h - cardH / 2 - 55;

    const maxAngleSpread = Math.PI / 12; // 15 degrees spread (reduced)
    const angleStep = cards.length > 1 ? Math.min(Math.PI / 24, maxAngleSpread / (cards.length - 1)) : 0;
    const startAngle = -((cards.length - 1) * angleStep) / 2;

    cards.forEach((c, i) => {
      const angle = startAngle + i * angleStep;

      // Distance from center normalized to [-1, 1]
      const distFromCenter = cards.length > 1 ? (i - (cards.length - 1) / 2) / ((cards.length - 1) / 2) : 0;
      const arcYOffset = distFromCenter * distFromCenter * 8; // 8px drop at edges (reduced)

      c.targetX = startX + i * spacing;
      c.targetY = baseY + arcYOffset;
      c.targetAngle = angle;
      c.w = cardW;
      c.h = cardH;
      if (c.angle === undefined) c.angle = c.targetAngle;
    });
  }

  function playDiscardAnimation(card, isMe) {
    const engine = engineRef.current;
    if (!engine.animations) engine.animations = [];
    
    const activeDiscards = engine.animations.filter(a => a.type === 'DISCARD' && Date.now() < a.startTime + a.duration).length;
    const delay = activeDiscards * 150;
    
    const jitterX = (Math.random() - 0.5) * 60;
    const jitterY = (Math.random() - 0.5) * 60;

    const startX = engine.width / 2 + jitterX;
    const startY = isMe ? engine.height + 100 + jitterY : -100 - Math.abs(jitterY);

    engine.animations.push({
      type: 'DISCARD',
      card: card,
      isMe: isMe,
      startX, startY,
      endX: engine.discardPos?.x || startX,
      endY: engine.discardPos?.y || startY,
      startTime: Date.now() + delay,
      duration: 400
    });
  }

  function playDrawAnimation(isMe) {
    const engine = engineRef.current;
    if (!engine.animations) engine.animations = [];

    const startX = engine.deckPos?.x || engine.width / 2;
    const startY = engine.deckPos?.y || 100;
    
    let endX = engine.width / 2;
    let endY = isMe ? engine.height + 100 : -100;
    let targetAngle = 0;

    if (isMe) {
      const N = Math.max(1, (engine.cardsInHand || []).length);
      const cardW = Math.min(100, (engine.width - 40) / Math.max(5, N));
      const cardH = cardW * 1.609;
      const spacing = cardW * 0.82;
      const totalW = spacing * (N - 1);
      const handStartX = engine.width / 2 - totalW / 2 - (cardW - spacing) / 2;
      const baseY = engine.height - cardH / 2 - 55;
      
      const lastIndex = N - 1;
      endX = handStartX + lastIndex * spacing;
      
      const distFromCenter = N > 1 ? (lastIndex - (N - 1) / 2) / ((N - 1) / 2) : 0;
      const arcYOffset = distFromCenter * distFromCenter * 8;
      endY = baseY + arcYOffset;

      const maxAngleSpread = Math.PI / 12;
      const angleStep = N > 1 ? Math.min(Math.PI / 24, maxAngleSpread / (N - 1)) : 0;
      const startAngle = -((N - 1) * angleStep) / 2;
      targetAngle = startAngle + lastIndex * angleStep;
    } else {
      const oppHandCount = engine.state?.opponent?.handCount || 1;
      const oppCardW = 45;
      const oppCardH = oppCardW * 1.609;
      const oppSpacing = oppCardW * 0.4;
      const oppTotalW = oppSpacing * (Math.max(1, oppHandCount) - 1);
      const oppStartX = engine.width / 2 - oppTotalW / 2 - (oppCardW - oppSpacing) / 2;
      const oppY = 15 + oppCardH / 2;
      
      endX = oppStartX + (oppHandCount - 1) * oppSpacing;
      endY = oppY;
      targetAngle = 0;
    }

    engine.animations.push({
      type: 'DRAW',
      card: null,
      isMe: isMe,
      startX, startY,
      endX, endY,
      targetAngle,
      startTime: Date.now(),
      duration: 400
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const logicalWidth = window.innerWidth;
      const logicalHeight = window.innerHeight;

      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;

      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;

      engineRef.current.width = logicalWidth;
      engineRef.current.height = logicalHeight;
      // Center the deck vertically in the exact middle of the available space between the two hands
      const deckY = Math.max(135, logicalHeight / 2 - 50);
      engineRef.current.deckPos = { x: logicalWidth / 2 - 70, y: deckY };
      engineRef.current.discardPos = { x: logicalWidth / 2 + 70, y: deckY };
      updateTargetPositions();
    };
    window.addEventListener('resize', resize);
    resize();

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const drawCard = (ctx, x, y, w, h, cardData, isFaceDown = false, isDeck = false, inHand = false) => {
      ctx.save();
      ctx.translate(x, y);
      if (cardData && cardData.angle) ctx.rotate(cardData.angle);

      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      if (isFaceDown) {
        if (isDeck) {
          // Draw 3D stack base (multiple cards)
          ctx.shadowColor = 'transparent';
          const stackLayers = 6;
          for (let i = stackLayers; i >= 1; i--) {
            const offset = i * 2;
            drawRoundedRect(ctx, -w / 2, -h / 2 + offset, w, h, 8);
            ctx.fillStyle = i % 2 === 0 ? '#ffb8b8' : '#ffffff';
            ctx.fill();
          }
        }

        // Draw base for shadow and background
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fillStyle = '#ff4757';
        ctx.fill();

        const img = CARD_IMAGES['CARD_BACK'];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.shadowColor = 'transparent';
          drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
          ctx.clip();
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        }
      } else {
        let actualType = cardData.type;
        if (actualType && actualType.startsWith('NORMAL_CAT')) {
          let hash = 0;
          const idStr = String(cardData?.id || cardData?.type || 'cat');
          for (let i = 0; i < idStr.length; i++) hash += idStr.charCodeAt(i);
          actualType = 'NORMAL_CAT_' + ((hash % 3) + 1); // Only 3 cat types available
        }

        // Draw base for shadow and background
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        const img = CARD_IMAGES[actualType];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.shadowColor = 'transparent';
          drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
          ctx.clip();
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        }

        // Check if despair is active and this is a DEFUSE card in hand
        const isDespairActive = engineRef.current.state?.me?.despairTurns > 0;
        if (inHand && actualType === 'DEFUSE' && isDespairActive) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
          ctx.fill();
          
          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 50px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 4;
          ctx.rotate(-20 * Math.PI / 180);
          ctx.fillText('X', 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    };

    const render = () => {
      const engine = engineRef.current;
      const { state, width, height, cardsInHand, deckPos, discardPos } = engine;

      ctx.clearRect(0, 0, width, height);

      // Luôn cập nhật target positions mỗi frame để đảm bảo công thức mới nhất được áp dụng
      if (!engine.isDragging && !engine.isDraggingOpponentCard) {
        updateTargetPositions();
      }

      // Interpolate hand cards positions
      cardsInHand.forEach(c => {
        if (!engine.isDragging || engine.draggedCardId !== c.id) {
          c.x += (c.targetX - c.x) * 0.15;
          c.y += (c.targetY - c.y) * 0.15;
          c.angle += (c.targetAngle - (c.angle || 0)) * 0.15;
        } else {
          c.angle += (0 - (c.angle || 0)) * 0.2; // Straighten up when dragged
        }
      });


      if (!state) {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // 1. Draw Opponent
      const opp = state.opponent || {};
      const oppHandCount = opp.handCount || 0;

      // Draw opponent hand cards
      const oppCardW = 45;
      const oppCardH = oppCardW * 1.609;
      const oppSpacing = oppCardW * 0.4;
      const oppTotalW = oppSpacing * (Math.max(1, oppHandCount) - 1);
      // Optical adjustment: shift left to visually center the overlapping card mass
      const oppStartX = width / 2 - oppTotalW / 2 - (oppCardW - oppSpacing) / 2;
      const oppY = 15 + oppCardH / 2; // Shifted up even higher since name is removed

      // Active turn indicator
      if (state.turnId === opp.socketId) {
        ctx.strokeStyle = '#f39c12'; // Orange for better contrast on pink background
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        drawRoundedRect(ctx, oppStartX - oppCardW / 2 - 6, oppY - oppCardH / 2 - 6, oppTotalW + oppCardW + 12, oppCardH + 12, 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const isStealing = gameState === 'ACTION_STEAL' && state.pendingAction?.sourceId === socket?.id;

      let hoveredOppIdx = -1;
      if (isStealing && !engine.isDraggingOpponentCard) {
        for (let i = oppHandCount - 1; i >= 0; i--) {
          const cx = oppStartX + i * oppSpacing;
          const cy = oppY;
          if (Math.abs(engine.mouseX - cx) < oppCardW / 2 && Math.abs(engine.mouseY - cy) < oppCardH / 2) {
            hoveredOppIdx = i;
            break;
          }
        }
      }

      for (let i = 0; i < oppHandCount; i++) {
        if (i === hoveredOppIdx) continue;

        const cx = oppStartX + i * oppSpacing;
        const cy = oppY;

        let isDragged = isStealing && engine.isDraggingOpponentCard && engine.draggedOpponentCardIndex === i;
        if (isDragged) continue; // Draw on top later

        if (isStealing) {
          ctx.shadowColor = 'rgba(255, 71, 87, 0.8)';
          ctx.shadowBlur = Math.abs(Math.sin(Date.now() / 300)) * 15;
        }

        drawCard(ctx, cx, cy, oppCardW, oppCardH, null, true, false);
        ctx.shadowBlur = 0;
      }

      if (hoveredOppIdx !== -1) {
        const cx = oppStartX + hoveredOppIdx * oppSpacing;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        drawCard(ctx, cx, oppY - 15, oppCardW, oppCardH, null, true, false);
        ctx.shadowBlur = 0;
      }

      const isMyTurn = state.turnId === socket?.id;

      const drawLockOverlay = (ctx, x, y, w, h) => {
        ctx.save();
        ctx.translate(x, y);
        // Rất nhẹ nhàng, chỉ làm tối đi một chút xíu
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 12);
        ctx.fill();
        ctx.restore();
      };

      // 2. Draw Deck
      if (engine.shuffleAnim && engine.shuffleAnim.active) {
        const elapsed = Date.now() - engine.shuffleAnim.startTime;
        if (elapsed > 1200) {
          engine.shuffleAnim.active = false;
          drawCard(ctx, deckPos.x, deckPos.y, 70, 105, null, true, true);
        } else {
          const t = elapsed / 1200; // 0 to 1
          const t2 = t * 15; // fast oscillations

          ctx.save();
          ctx.translate(deckPos.x, deckPos.y);

          // Draw 5 layers of cards shuffling
          for (let i = -2; i <= 2; i++) {
            // envelope: starts at 0, max at 0.5, ends at 0
            const envelope = Math.sin(t * Math.PI);
            const xOffset = Math.sin(t2 + i * 1.5) * 40 * envelope;
            const yOffset = i * 3;
            const angle = Math.cos(t2 + i) * 0.15 * envelope;

            ctx.save();
            ctx.translate(xOffset, yOffset);
            ctx.rotate(angle);
            drawCard(ctx, 0, 0, 70, 105, null, true, false); // single card back
            ctx.restore();
          }
          ctx.restore();
        }
      } else {
        drawCard(ctx, deckPos.x, deckPos.y, 70, 105, null, true, true);
      }

      if (!isMyTurn) {
        drawLockOverlay(ctx, deckPos.x, deckPos.y, 70, 105);
      }

      // 3. Draw Discard Pile
      const now = Date.now();
      const animatingCardIds = new Set(
        (engine.animations || [])
          .filter(a => a.type === 'DISCARD' && now >= a.startTime && now < a.startTime + a.duration)
          .map(a => a.card?.id)
      );
      const discardPile = (state.discardPile || []).filter(c => !animatingCardIds.has(c.id));

      if (discardPile.length > 0) {
        const cardsToShow = Math.min(discardPile.length, 5);
        for (let i = cardsToShow - 1; i >= 0; i--) {
          const index = discardPile.length - 1 - i;
          const card = discardPile[index];
          
          let offsetX = 0;
          let offsetY = 0;
          let angle = 0;
          
          if (i === 1) { offsetX = -15; offsetY = -10; angle = -12 * Math.PI / 180; }
          else if (i === 2) { offsetX = 15; offsetY = -10; angle = 12 * Math.PI / 180; }
          else if (i === 3) { offsetX = -15; offsetY = 10; angle = 12 * Math.PI / 180; }
          else if (i === 4) { offsetX = 15; offsetY = 10; angle = -12 * Math.PI / 180; }

          ctx.save();
          ctx.translate(discardPos.x + offsetX, discardPos.y + offsetY);
          ctx.rotate(angle);
          drawCard(ctx, 0, 0, 70, 105, card, false);
          ctx.restore();
        }
      } else {
        // Empty discard slot
        ctx.strokeStyle = 'rgba(255, 59, 92, 0.6)'; // Darker pink for better visibility on bright background
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        drawRoundedRect(ctx, discardPos.x - 35, discardPos.y - 52.5, 70, 105, 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw mini count badges directly on the decks
      const drawMiniBadge = (x, y, text) => {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 1);
      };

      // Deck count badge
      drawMiniBadge(deckPos.x + 35, deckPos.y - 52, state.deckCount || 0);

      // Note: Discard count badge was removed per user request

      // 4. Draw Turn Timer (Removed as per user request)

      // 5. Draw Action Area Buttons
      engine.playBtnRect = null;
      engine.drawBtnRect = null;
      engine.endBtnRect = null;
      engine.cancelBtnRect = null;

      const btnW = 100;
      const btnSpacing = 16;
      const totalBtnW = btnW * 3 + btnSpacing * 2;
      const startBtnX = width / 2 - totalBtnW / 2 + btnW / 2;
      const btnY = height - 30;

      const drawImageBtn = (x, imgKey, active, progressRatio = null) => {
        ctx.save();

        const img = CARD_IMAGES[imgKey];
        let w = btnW;
        let h = 40; // fallback

        if (img && img.complete && img.naturalWidth > 0) {
          h = w * (img.naturalHeight / img.naturalWidth);

          if (progressRatio !== null && active) {
            // Background (dimmed)
            ctx.globalAlpha = 0.3;
            ctx.drawImage(img, x - w / 2, btnY - h / 2, w, h);

            // Foreground (clipped and opaque)
            ctx.globalAlpha = 1.0;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - w / 2, btnY - h / 2 - 10, w * progressRatio, h + 20);
            ctx.clip();
            ctx.shadowColor = 'rgba(255, 71, 87, 0.8)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 0;
            ctx.drawImage(img, x - w / 2, btnY - h / 2, w, h);

            // Highlight edge
            if (progressRatio > 0 && progressRatio < 1) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.shadowColor = '#fff';
              ctx.shadowBlur = 10;
              ctx.fillRect(x - w / 2 + w * progressRatio - 3, btnY - h / 2 + 5, 3, h - 10);
            }
            ctx.restore();
          } else {
            ctx.globalAlpha = active ? 1.0 : 0.4;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            ctx.drawImage(img, x - w / 2, btnY - h / 2, w, h);
          }
        } else {
          // Fallback
          ctx.globalAlpha = active ? 1.0 : 0.4;
          ctx.fillStyle = '#666';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x - w / 2, btnY - h / 2, w, h, 16);
            ctx.fill();
          } else {
            ctx.fillRect(x - w / 2, btnY - h / 2, w, h);
          }
        }
        ctx.restore();
        return { x: x - w / 2, y: btnY - h / 2, w, h };
      };

      const isMyTurnActive = state.turnId === socket?.id && gameState === 'PLAYING';

      // 1. Rút bài
      const drawRect = drawImageBtn(startBtnX, 'BTN_DRAW', isMyTurnActive);
      if (isMyTurnActive) {
        engine.drawBtnRect = drawRect;
      }

      // 2. Dùng thẻ (Pink)
      const nopeChallengeData = engine.nopeChallenge;
      const isNopeChallengeTarget = gameState === 'CHALLENGE_NOPE' && nopeChallengeData?.targetId === socket?.id;

      let isValidPlay = false;
      let nopeRatio = null;
      if (isNopeChallengeTarget) {
        isValidPlay = true; // Always valid to click if you are the NOPE target
        const timeLeft = engine.nopeTimeLeft || 0;
        nopeRatio = Math.max(0, Math.min(1, timeLeft / 5000));
      } else if (isMyTurnActive && engine.selectedCardIds && engine.selectedCardIds.length > 0) {
        const selectedCards = engine.selectedCardIds.map(id => cardsInHand.find(c => c.id === id)).filter(Boolean);
        if (selectedCards.length === 1) {
          const unplayableTypes = ['EXPLODING_KITTEN', 'DEFUSE', 'NOPE', 'NORMAL_CAT'];
          if (!unplayableTypes.includes(selectedCards[0].type)) {
            isValidPlay = true;
          }
        } else if (selectedCards.length === 2 || selectedCards.length === 3) {
          if (selectedCards.every(c => c.type === 'NORMAL_CAT')) {
            isValidPlay = true;
          }
        }
      }

      const playRect = drawImageBtn(startBtnX + btnW + btnSpacing, 'BTN_PLAY', isValidPlay, nopeRatio);
      if (isValidPlay) {
        engine.playBtnRect = { ...playRect, cardIds: engine.selectedCardIds.slice() };
      } else if (engine.selectedCardIds && engine.selectedCardIds.length > 0 && isMyTurnActive) {
        // Optionally you could show error text here, but it overlaps cards so we omit it
      }

      // 3. Kết thúc hoặc Huỷ (khi chờ NOPE)
      const isNopeChallengeActive = gameState === 'CHALLENGE_NOPE';
      if (isNopeChallengeActive) {
        // Cả hai người đều thấy nút Huỷ để thoát khỏi cửa sổ NOPE
        const cancelRect = drawImageBtn(startBtnX + (btnW + btnSpacing) * 2, 'BTN_CANCEL', true);
        engine.cancelBtnRect = cancelRect;
      } else {
        const endRect = drawImageBtn(startBtnX + (btnW + btnSpacing) * 2, 'BTN_END', isMyTurnActive);
        if (isMyTurnActive) {
          engine.endBtnRect = endRect;
        }
      }

      // 6. Draw Player Hand
      // Determine popped up cards
      const poppedUpIds = new Set(engine.selectedCardIds || []);
      if (!engine.isDragging && !engine.isDraggingOpponentCard) {
        for (let i = cardsInHand.length - 1; i >= 0; i--) {
          const c = cardsInHand[i];
          if (Math.abs(engine.mouseX - c.x) < c.w / 2 && Math.abs(engine.mouseY - c.y) < c.h / 2) {
            poppedUpIds.add(c.id);
            break; // Only hover the topmost card
          }
        }
      }

      // Draw non-dragged, non-popped-up cards first
      const shouldDimHand = !isMyTurn && gameState !== 'CHALLENGE';
      if (shouldDimHand) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.filter = 'brightness(0.7)';
      }

      cardsInHand.forEach(c => {
        if (engine.draggedCardId !== c.id && !poppedUpIds.has(c.id)) {
          drawCard(ctx, c.x, c.y, c.w, c.h, c, false, false, true);
        }
      });

      if (shouldDimHand) {
        ctx.restore();
      }

      // Draw popped-up cards on top
      cardsInHand.forEach(c => {
        if (engine.draggedCardId !== c.id && poppedUpIds.has(c.id)) {
          const drawY = c.y - 20;

          if (engine.selectedCardIds?.includes(c.id)) {
            ctx.save();
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;
            drawCard(ctx, c.x, drawY, c.w, c.h, c, false, false, true);
            ctx.restore();
          } else {
            drawCard(ctx, c.x, drawY, c.w, c.h, c, false, false, true);
          }
        }
      });

      // Draw dragged card on top of everything
      if (engine.draggedCardId) {
        const c = cardsInHand.find(card => card.id === engine.draggedCardId);
        if (c) {
          drawCard(ctx, c.x, c.y, c.w * 1.1, c.h * 1.1, c, false, false, true);
        }
      }

      // Draw dragged OPPONENT card on top of everything
      if (gameState === 'ACTION_STEAL' && state.pendingAction?.sourceId === socket?.id && engine.isDraggingOpponentCard) {
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        const oppCardW = 45;
        const oppCardH = oppCardW * 1.609;
        drawCard(ctx, engine.mouseX, engine.mouseY, oppCardW * 1.2, oppCardH * 1.2, null, true, false);
        ctx.restore();
      }

      // Draw ACTION_STEAL overlay
      if (gameState === 'ACTION_STEAL' && state.pendingAction?.sourceId === socket?.id) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(width / 2 - 180, height / 2 - 30, 360, 60, 20);
        else ctx.rect(width / 2 - 180, height / 2 - 30, 360, 60);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Vuốt 1 lá bài của đối phương về tay bạn!', width / 2, height / 2);
        ctx.restore();
      }

      // Draw NOPE waiting overlay
      const nopeChallengeDataRender = engine.nopeChallenge;
      if (gameState === 'CHALLENGE_NOPE' && nopeChallengeDataRender && nopeChallengeDataRender.targetId !== socket?.id) {
        const overlayW = 340;
        const overlayH = 80;
        const overlayX = width / 2 - overlayW / 2;
        const overlayY = height / 2 - overlayH / 2 - 40;

        ctx.save();

        ctx.shadowColor = 'rgba(255, 71, 87, 0.4)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(20, 20, 25, 0.85)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(overlayX, overlayY, overlayW, overlayH, 16);
        else ctx.rect(overlayX, overlayY, overlayW, overlayH);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 71, 87, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const dots = '.'.repeat(Math.floor((Date.now() / 400) % 4));
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.font = '600 16px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Đối phương đang cân nhắc NOPE${dots}`, width / 2, overlayY + 28);

        const timeLeft = engine.nopeTimeLeft || 0;
        const ratio = Math.max(0, Math.min(1, timeLeft / 5000));
        const barW = 280;
        const barH = 8;
        const barX = width / 2 - barW / 2;
        const barY = overlayY + 52;

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 4);
        else ctx.rect(barX, barY, barW, barH);
        ctx.fill();

        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 12;
        const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        gradient.addColorStop(0, '#ff4757');
        gradient.addColorStop(1, '#ff6b81');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(barX, barY, Math.max(0, barW * ratio), barH, 4);
        else ctx.rect(barX, barY, Math.max(0, barW * ratio), barH);
        ctx.fill();

        ctx.restore();
      }
      // Draw Animations
      if (engine.animations && engine.animations.length > 0) {
        const now = Date.now();
        engine.animations = engine.animations.filter(anim => {
          const elapsedAnim = now - anim.startTime;
          if (elapsedAnim >= anim.duration) return false; // Animation complete

          const t = elapsedAnim / anim.duration;
          const easeOut = 1 - Math.pow(1 - t, 3); // Cubic ease-out
          
          let currentX = anim.startX + (anim.endX - anim.startX) * easeOut;
          let currentY = anim.startY + (anim.endY - anim.startY) * easeOut;
          
          let scale = 1;
          let rotation = 0;

          if (anim.type === 'DRAW') {
            // Rút bài mượt mà: vòng cung nhe, nghiêng nhẹ theo quán tính và về đúng góc của lá bài trên tay
            currentY -= Math.sin(t * Math.PI) * 80;
            scale = 1 + Math.sin(t * Math.PI) * 0.4;
            // Xoay nhẹ 1 chút lúc đang bay và mượt mà về đúng góc
            rotation = (anim.targetAngle || 0) * easeOut + Math.sin(t * Math.PI) * 0.15 * (anim.isMe ? -1 : 1); 
          } else if (anim.type === 'DISCARD') {
            // Đánh bài: ném ra giữa bàn, nghiêng tự nhiên theo hướng vung tay và nằm thẳng lại
            const dx = anim.endX - anim.startX;
            currentY -= Math.sin(t * Math.PI) * 60;
            scale = 1 + Math.sin(t * Math.PI) * 0.3;
            rotation = Math.sin(t * Math.PI) * 0.3 * (dx > 0 ? 1 : -1);
          }

          ctx.save();
          ctx.translate(currentX, currentY);
          ctx.rotate(rotation);
          ctx.scale(scale, scale);
          
          if (anim.card) {
            // Draw actual card
            drawCard(ctx, 0, 0, 70, 105, anim.card, false);
          } else {
            // Draw card back
            drawCard(ctx, 0, 0, 70, 105, null, true, true);
          }
          
          ctx.restore();
          return true; // Keep animation
        });
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [gameState]); // Restart loop if state changes (mostly for closures, though we use refs)

  const handlePointerDown = (e) => {
    const engine = engineRef.current;

    updateMousePos(e);
    engine.dragStartX = engine.mouseX;
    engine.dragStartY = engine.mouseY;

    // Check deck tap (Only allow drawing if it's their turn and playing)
    const deckDist = Math.hypot(engine.mouseX - engine.deckPos.x, engine.mouseY - engine.deckPos.y);
    if (deckDist < 40) {
      if (gameState === 'PLAYING' && engine.state.turnId === socket?.id) {
        socket?.emit('ek:draw_card', { roomId: engine.state.roomId });
      }
      return;
    }

    // Check Play Button
    if (engine.playBtnRect) {
      const { x, y, w, h, cardIds } = engine.playBtnRect;
      if (engine.mouseX >= x && engine.mouseX <= x + w && engine.mouseY >= y && engine.mouseY <= y + h) {
        if (engine.state.state === 'CHALLENGE_NOPE') {
          handlePlayNope();
          const nopeIndex = engine.cardsInHand.findIndex(c => c.type === 'NOPE');
          if (nopeIndex > -1) engine.cardsInHand.splice(nopeIndex, 1);
        } else {
          // Lưu lại các card IDs vừa đánh để xác định isMe trong onCardPlayed
          cardIds.forEach(id => recentlyPlayedCardIdsRef.current.add(id));
          socket.emit('ek:play_cards', { roomId: engine.state.roomId, cardIds });
          engine.cardsInHand = engine.cardsInHand.filter(card => !cardIds.includes(card.id));
        }
        engine.selectedCardIds = [];
        engine.playBtnRect = null;
        engine.mouseX = -1000;
        engine.mouseY = -1000;
        updateTargetPositions();
        return;
      }
    }

    // Check Draw Button
    if (engine.drawBtnRect) {
      const { x, y, w, h } = engine.drawBtnRect;
      if (engine.mouseX >= x && engine.mouseX <= x + w && engine.mouseY >= y && engine.mouseY <= y + h) {
        socket.emit('ek:draw_card', { roomId: engine.state.roomId });
        engine.mouseX = -1000;
        engine.mouseY = -1000;
        return;
      }
    }

    // Check Cancel Button (Huỷ - khi đang chờ NOPE)
    if (engine.cancelBtnRect) {
      const { x, y, w, h } = engine.cancelBtnRect;
      if (engine.mouseX >= x && engine.mouseX <= x + w && engine.mouseY >= y && engine.mouseY <= y + h) {
        handleSkipNope();
        engine.mouseX = -1000;
        engine.mouseY = -1000;
        return;
      }
    }

    // Check End Button (Surrender)
    if (engine.endBtnRect) {
      const { x, y, w, h } = engine.endBtnRect;
      if (engine.mouseX >= x && engine.mouseX <= x + w && engine.mouseY >= y && engine.mouseY <= y + h) {
        setShowSurrenderConfirm(true);
        engine.mouseX = -1000;
        engine.mouseY = -1000;
        return;
      }
    }

    // Check opponent hand drag (only when ACTION_STEAL)
    const isStealing = gameState === 'ACTION_STEAL' && engine.state?.pendingAction?.sourceId === socket?.id;
    if (isStealing) {
      const opp = engine.state.opponent || {};
      const oppHandCount = opp.handCount || 0;
      const oppCardW = 45;
      const oppCardH = oppCardW * 1.609;
      const oppSpacing = oppCardW * 0.4;
      const oppTotalW = oppSpacing * (Math.max(1, oppHandCount) - 1);
      const oppStartX = engine.width / 2 - oppTotalW / 2 - (oppCardW - oppSpacing) / 2;
      const oppY = 15 + oppCardH / 2;

      for (let i = oppHandCount - 1; i >= 0; i--) {
        const cx = oppStartX + i * oppSpacing;
        const cy = oppY;
        if (Math.abs(engine.mouseX - cx) < oppCardW / 2 && Math.abs(engine.mouseY - cy) < oppCardH / 2) {
          engine.isDraggingOpponentCard = true;
          engine.draggedOpponentCardIndex = i;
          return;
        }
      }
    }

    // Check hand drag - ALLOWED FOR EVERYONE ANYTIME for fun interactions
    // Iterate backwards to pick top card
    for (let i = engine.cardsInHand.length - 1; i >= 0; i--) {
      const c = engine.cardsInHand[i];
      if (Math.abs(engine.mouseX - c.x) < c.w / 2 && Math.abs(engine.mouseY - c.y) < c.h / 2) {
        engine.isDragging = true;
        engine.draggedCardId = c.id;
        break;
      }
    }
  };

  const handlePointerMove = (e) => {
    const engine = engineRef.current;
    updateMousePos(e);
    if (engine.isDraggingOpponentCard) {
      return;
    }
    if (engine.isDragging && engine.draggedCardId) {
      const draggedCard = engine.cardsInHand.find(card => card.id === engine.draggedCardId);
      if (draggedCard) {
        draggedCard.x = engine.mouseX;
        draggedCard.y = engine.mouseY;

        // Cho phép drag để xếp bài (Interactive Sorting)
        let newCardsInHand = [...engine.cardsInHand];
        newCardsInHand.forEach(c => {
          if (c.id === engine.draggedCardId) {
            c.sortValue = engine.mouseX;
          } else {
            c.sortValue = c.targetX;
          }
        });

        newCardsInHand.sort((a, b) => a.sortValue - b.sortValue);

        const orderChanged = newCardsInHand.some((c, i) => c.id !== engine.cardsInHand[i].id);
        if (orderChanged) {
          engine.cardsInHand = newCardsInHand;
          updateTargetPositions(); // Tự động tween các lá bài khác dạt ra để nhường chỗ
        }
      }
    }
  };

  const handlePointerUp = () => {
    const engine = engineRef.current;
    if (engine.isDraggingOpponentCard) {
      if (engine.mouseY > engine.height / 2) {
        playStealSound();
        socket.emit('ek:execute_steal', {
          roomId: engine.state.roomId,
          targetId: engine.state.pendingAction.targetId,
          cardIndex: engine.draggedOpponentCardIndex
        });
      }
      engine.isDraggingOpponentCard = false;
      engine.draggedOpponentCardIndex = -1;
      // Move mouse away to prevent accidentally hovering player's hand immediately after drop
      engine.mouseX = -1000;
      engine.mouseY = -1000;
      return;
    }
    if (engine.isDragging && engine.draggedCardId) {
      const c = engine.cardsInHand.find(card => card.id === engine.draggedCardId);
      if (c) {
        const isClick = Math.hypot(engine.mouseX - engine.dragStartX, engine.mouseY - engine.dragStartY) < 10;

        if (isClick) {
          engine.selectedCardIds = engine.selectedCardIds || [];
          const idx = engine.selectedCardIds.indexOf(c.id);
          if (idx > -1) {
            // Clicked an already selected card, so deselect it
            engine.selectedCardIds.splice(idx, 1);
            // Move mouse away so it doesn't immediately re-hover if we want to fully dismiss it
            engine.mouseX = -1000;
            engine.mouseY = -1000;
          } else {
            // Add to selection
            playSelectSound();
            engine.selectedCardIds.push(c.id);
          }
          updateTargetPositions();
        } else {
          // Dragging is now purely for sorting. ALWAYS return back down.
          engine.mouseX = -1000;
          engine.mouseY = -1000;
          updateTargetPositions();
        }
      }
      engine.isDragging = false;
      engine.draggedCardId = null;
    }
  };

  const updateMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    engineRef.current.mouseX = clientX - rect.left;
    engineRef.current.mouseY = clientY - rect.top;
  };

  const getCardImageSrc = (cardData) => {
    let actualType = cardData.type;
    if (actualType && actualType.startsWith('NORMAL_CAT')) {
      let hash = 0;
      const idStr = String(cardData?.id || cardData?.type || 'cat');
      for (let i = 0; i < idStr.length; i++) hash += idStr.charCodeAt(i);
      actualType = 'NORMAL_CAT_' + ((hash % 3) + 1);
    }
    return PRELOAD_IMAGES[actualType] || PRELOAD_IMAGES.CARD_BACK;
  };

  const handlePlayNope = () => {
    socket.emit('ek:play_nope', { roomId: engineRef.current.state.roomId });
    setNopeChallenge(null);
  };

  const handleSkipNope = () => {
    socket.emit('ek:skip_nope', { roomId: engineRef.current.state.roomId });
    setNopeChallenge(null);
  };

  const handleDefuse = () => {
    const engine = engineRef.current;
    socket.emit('ek:place_defuse', { roomId: engine.state.roomId, index: defusePos });
    setGameState('PLAYING');
  };

  const CARD_PEEK = 15; // Mỗi thẻ peek ra 15px so với thẻ trước (chồng lên nhau)

  const updateDefusePos = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;  // Vị trí chuột trong container
    const dCount = engineRef.current.state?.deckCount ?? 0;
    if (dCount === 0) { setDefusePos(0); return; }

    let bestPos = 0;
    let minDistance = Infinity;
    // Slot i (vị trí đặt bom) nằm ở pixel x = i * CARD_PEEK
    for (let i = 0; i <= dCount; i++) {
      const slotX = i * CARD_PEEK;
      const dist = Math.abs(x - slotX);
      if (dist < minDistance) {
        minDistance = dist;
        bestPos = i;
      }
    }
    setDefusePos(bestPos);
  };

  const closeFutureModal = () => {
    setModalData(null);
  };

  return (
    <div className="ek-page">
      <div className="ek-rotate-prompt">
        <p>Vui lòng xoay ngang điện thoại để chơi game!</p>
      </div>

      <button className="ek-back-btn" onClick={() => navigate('/games')}>
        <ArrowLeft size={24} />
      </button>

      {demandMessage && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          padding: '15px 30px',
          borderRadius: '10px',
          fontSize: '24px',
          fontWeight: 'bold',
          zIndex: 100,
          animation: 'ek-toast-in 0.3s ease-out, ek-toast-out 0.3s ease-in 3.7s forwards'
        }}>
          {demandMessage}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="ek-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      />

      {/* Background Music: Users can place a bgm.mp3 in the public folder to play it automatically */}
      <audio
        id="bg-music"
        src="/bgm.mp3"
        autoPlay
        loop
        ref={audio => {
          if (audio) audio.volume = 0.05; // Rất nhỏ
        }}
      ></audio>

      {/* Modals */}
      {gameState === 'WAITING' && (
        <div className="ek-modal-backdrop">
          <div className="ek-modal">
            <h2>Đang Chờ Người Yêu...</h2>
            <p>Hãy bảo người yêu của bạn vào game nhé</p>
            <div className="ek-spinner"></div>
          </div>
        </div>
      )}

      {gameState === 'DEFUSING' && (
        <div className="ek-modal-backdrop" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="ek-modal" style={{ maxWidth: '500px', maxHeight: '95vh', overflowY: 'auto', padding: '15px 15px', borderRadius: '24px', border: '3px solid #ff4757', background: 'linear-gradient(145deg, #ffffff, #fff5f5)', boxShadow: '0 15px 35px rgba(255,71,87,0.3)' }}>
            <h2 style={{ color: '#ff4757', fontSize: '20px', margin: '0 0 5px 0', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              BẠN ĐÃ HÀN GẮN YÊU THƯƠNG!
            </h2>
            <p style={{ color: '#666', fontSize: '13px', margin: '0 10px 10px 10px', lineHeight: '1.4' }}>
              Hãy vuốt ngang thẻ vỡ tim để giấu lại vào bộ bài:
            </p>

            <div style={{ background: 'rgba(255, 71, 87, 0.05)', borderRadius: '16px', padding: '10px 0', margin: '0 10px 15px 10px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)' }}>
              {(() => {
                const dCount = engineRef.current.state?.deckCount ?? 0;
                // Width = N thẻ * CARD_PEEK + chiều rộng thẻ cuối + chỗ cho kitten
                const containerW = dCount * CARD_PEEK + 60 + 45;
                return (
                  <div
                    className="ek-defuse-deck-container"
                    style={{ paddingRight: '0', margin: '0 auto', width: `${containerW}px`, maxWidth: '95%', touchAction: 'none', userSelect: 'none', position: 'relative', height: '95px' }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      isDraggingDefuseRef.current = true;
                      updateDefusePos(e.clientX, e.currentTarget);
                    }}
                    onPointerMove={(e) => {
                      if (!isDraggingDefuseRef.current) return;
                      updateDefusePos(e.clientX, e.currentTarget);
                    }}
                    onPointerUp={(e) => {
                      isDraggingDefuseRef.current = false;
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }}
                    onPointerCancel={() => {
                      isDraggingDefuseRef.current = false;
                    }}
                  >
                    {Array.from({ length: dCount }).map((_, i) => {
                      const isShifted = i >= defusePos;
                      return (
                        <img
                          key={i}
                          src={PRELOAD_IMAGES.CARD_BACK}
                          className="ek-defuse-card-back"
                          style={{
                            left: `${i * CARD_PEEK}px`,
                            top: '8px',
                            zIndex: dCount - i,
                            transform: isShifted ? 'translateX(45px)' : 'translateX(0px)',
                            transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            height: '80px', width: 'auto'
                          }}
                          alt="deck-card"
                          draggable="false"
                        />
                      );
                    })}
                    {/* Kitten card at defusePos */}
                    {(() => {
                      const slotX = defusePos * CARD_PEEK;
                      return (
                        <img
                          src={PRELOAD_IMAGES.EXPLODING_KITTEN}
                          className="ek-defuse-kitten-card"
                          style={{
                            left: `${slotX}px`,
                            top: '0px',
                            zIndex: 100,
                            transform: 'translateY(-8px)',
                            transition: 'left 0.15s ease-out',
                            height: '90px', width: 'auto',
                            position: 'absolute'
                          }}
                          alt="Kitten"
                          draggable="false"
                        />
                      );
                    })()}
                  </div>
                );
              })()}

            </div>

            <div style={{ color: '#555', fontSize: '14px', fontWeight: '600', marginBottom: '15px' }}>
              Vị trí: <span style={{ color: '#ff4757', fontWeight: 'bold' }}>{defusePos === 0 && (engineRef.current.state?.deckCount ?? 0) === 0 ? 'Duy nhất' : defusePos === 0 ? 'Trên cùng' : defusePos === (engineRef.current.state?.deckCount ?? 0) ? 'Dưới cùng' : `Thứ ${defusePos + 1}`}</span>
            </div>

            <div style={{ marginTop: '5px' }}>
              <button
                className="ek-btn"
                onClick={handleDefuse}
                style={{ background: 'linear-gradient(45deg, #ff4757, #ff6b81)', border: 'none', padding: '10px 25px', fontSize: '14px', borderRadius: '30px', boxShadow: '0 6px 20px rgba(255, 71, 87, 0.4)' }}
              >
                Xác Nhận & Sống Sót
              </button>
            </div>
          </div>
        </div>
      )}

      {modalData?.type === 'future' && (
        <div className="ek-modal-backdrop" onClick={closeFutureModal}>
          <div className="ek-modal" onClick={e => e.stopPropagation()}>
            <h2>Nhìn Trước Tương Lai</h2>
            <p>3 lá bài tiếp theo sẽ là:</p>
            <div className="ek-future-container">
              {modalData.cards?.map((c, i) => (
                <div key={i} className="ek-future-card-wrapper">
                  <span className="ek-future-card-label">
                    {i === 0 ? 'TRÊN CÙNG' : `THỨ ${i + 1}`}
                  </span>
                  <img
                    src={getCardImageSrc(c)}
                    alt={c?.type || 'UNKNOWN'}
                    className="ek-future-card-img"
                  />
                </div>
              ))}
            </div>
            <button className="ek-btn" onClick={closeFutureModal}>Đóng</button>
          </div>
        </div>
      )}

      {gameState === 'ACTION_3_CATS' && engineRef.current.state?.pendingAction?.sourceId === socket?.id && (
        <div className="ek-modal-backdrop">
          <div className="ek-modal" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2>Đòi Bài (Combo 3 Mèo)</h2>
            <p style={{ fontSize: '14px' }}>Hãy chọn 1 loại bài bạn muốn đòi từ đối phương.</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', height: '110px', position: 'relative' }}>
              {['DEFUSE', 'ATTACK', 'SKIP', 'FAVOR', 'NOPE', 'SHUFFLE', 'SEE_THE_FUTURE'].map((type, index, arr) => {
                const total = arr.length; // 7
                const spreadAngle = 50; // Total spread from left to right (degrees)
                const angleStep = spreadAngle / (total - 1);
                const angle = -(spreadAngle / 2) + index * angleStep;

                const maxDrop = 15; // Max pixels dropped at the edges
                // normalize index to [-1, 1]
                const normalizedX = (index - (total - 1) / 2) / ((total - 1) / 2);
                const yOffset = normalizedX * normalizedX * maxDrop;

                const cardWidth = 55;
                const spacing = 35; // Overlap spacing
                const totalWidth = spacing * (total - 1);
                const startX = -totalWidth / 2;
                const xPos = startX + index * spacing;

                const isSelected = selectedDemandType === type;

                return (
                  <div
                    key={type}
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '50%',
                      transform: isSelected
                        ? `translateX(calc(-50% + ${xPos}px)) translateY(${yOffset - 15}px) rotate(${angle}deg) scale(1.15)`
                        : `translateX(calc(-50% + ${xPos}px)) translateY(${yOffset}px) rotate(${angle}deg)`,
                      transformOrigin: 'bottom center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, z-index 0s',
                      zIndex: isSelected ? 150 : index,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = `translateX(calc(-50% + ${xPos}px)) translateY(${yOffset - 10}px) rotate(${angle}deg) scale(1.15)`;
                        e.currentTarget.style.zIndex = 100;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = `translateX(calc(-50% + ${xPos}px)) translateY(${yOffset}px) rotate(${angle}deg) scale(1)`;
                        e.currentTarget.style.zIndex = index;
                      }
                    }}
                    onClick={() => setSelectedDemandType(type)}
                  >
                    <img
                      src={PRELOAD_IMAGES[type] || PRELOAD_IMAGES.CARD_BACK}
                      alt={type}
                      style={{
                        width: `${cardWidth}px`,
                        height: 'auto',
                        borderRadius: '6px',
                        boxShadow: isSelected ? '0 0 20px 8px rgba(255, 192, 203, 0.8)' : '0 4px 12px rgba(0,0,0,0.4)',
                        border: isSelected ? '2px solid #ffb8c6' : 'none',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                className="ek-btn"
                disabled={!selectedDemandType}
                onClick={() => {
                  if (selectedDemandType) {
                    socket.emit('ek:demand_card', { roomId: engineRef.current.state?.roomId, type: selectedDemandType });
                    setSelectedDemandType(null);
                  }
                }}
                style={{
                  background: selectedDemandType ? CARD_COLORS[selectedDemandType]?.theme : '#ccc',
                  color: selectedDemandType ? CARD_COLORS[selectedDemandType]?.text : '#666',
                  boxShadow: selectedDemandType ? `0 6px 20px ${CARD_COLORS[selectedDemandType]?.theme}80` : 'none',
                  minWidth: '200px'
                }}
              >
                {selectedDemandType ? `Đòi thẻ ${CARD_COLORS[selectedDemandType]?.name}` : 'Chọn một thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'ACTION_3_CATS' && engineRef.current.state?.pendingAction?.targetId === socket?.id && (
        <div className="ek-modal-backdrop">
          <div className="ek-modal">
            <h2>CHỜ CHÚT!</h2>
            <p>Đối phương đang chọn loại bài muốn đòi từ bạn!</p>
          </div>
        </div>
      )}

      {showAlterFuture && (
        <div className="ek-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="ek-modal" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2>ĐỔI VẬN (ALTER THE FUTURE)</h2>
            <p>Nhấn chọn 2 lá để đổi chỗ, hoặc kéo thả (trên máy tính) để sắp xếp (Lá bên trái bốc trước).</p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px', marginBottom: '30px' }}>
              {alterFutureCards.map((card, index) => (
                <div
                  key={card.id || index}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIdx = index;
                    if (fromIdx !== toIdx && !isNaN(fromIdx)) {
                      const newCards = [...alterFutureCards];
                      const [movedCard] = newCards.splice(fromIdx, 1);
                      newCards.splice(toIdx, 0, movedCard);
                      setAlterFutureCards(newCards);
                    }
                  }}
                  onClick={() => {
                    if (selectedAlterIdx === null) {
                      setSelectedAlterIdx(index);
                    } else {
                      if (selectedAlterIdx !== index) {
                        const newCards = [...alterFutureCards];
                        const temp = newCards[selectedAlterIdx];
                        newCards[selectedAlterIdx] = newCards[index];
                        newCards[index] = temp;
                        setAlterFutureCards(newCards);
                      }
                      setSelectedAlterIdx(null);
                    }
                  }}
                  style={{
                    width: '100px',
                    height: '140px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: selectedAlterIdx === index ? '3px solid #f39c12' : '2px dashed rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    background: selectedAlterIdx === index ? 'rgba(243, 156, 18, 0.3)' : 'rgba(0,0,0,0.5)',
                    position: 'relative',
                    transform: selectedAlterIdx === index ? 'translateY(-10px)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img
                    src={getCardImageSrc(card)}
                    alt={card.type}
                    style={{ width: '100%', height: '100%', borderRadius: '6px', pointerEvents: 'none' }}
                  />
                  <div style={{ position: 'absolute', top: '-25px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                    {index === 0 ? 'Bốc Đầu' : index === 1 ? 'Bốc 2' : 'Bốc 3'}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="ek-btn"
              style={{ background: 'linear-gradient(to right, #00b09b, #96c93d)' }}
              onClick={() => {
                setShowAlterFuture(false);
                setSelectedAlterIdx(null);
                socket.emit('ek:submit_alter_future', { roomId: engineRef.current.state?.roomId, rearrangedCards: alterFutureCards });
              }}
            >
              Xác Nhận Tương Lai
            </button>
          </div>
        </div>
      )}

      {/* Expansion Mode Floating Button */}
      {gameState === 'PLAYING' && engineRef.current.state?.mode !== 'expansion' && (
        <button
          onClick={() => setShowExpansionList(true)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(to bottom, #ff7e5f, #feb47b)',
            color: '#fff',
            border: '3px solid #fff',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 0 #d35400, 0 10px 20px rgba(0,0,0,0.3)',
            zIndex: 100,
            transition: 'all 0.1s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(6px)';
            e.currentTarget.style.boxShadow = '0 0px 0 #d35400, 0 4px 10px rgba(0,0,0,0.2)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 0 #d35400, 0 10px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 0 #d35400, 0 10px 20px rgba(0,0,0,0.3)';
          }}
          title="Bản Mở Rộng"
        >
          <Flame size={28} strokeWidth={2.5} fill="#fff" />
        </button>
      )}

      {showExpansionList && (
        <div className="ek-modal-backdrop" style={{ zIndex: 10000 }} onClick={() => setShowExpansionList(false)}>
          <div className="ek-modal" onClick={e => e.stopPropagation()}>
            <h2>CHỌN BẢN MỞ RỘNG</h2>
            <p>Chọn một bản mở rộng để rủ đối phương cùng chơi:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button
                className="ek-btn"
                style={{ background: 'linear-gradient(135deg, #ff4757, #ff6b81)', padding: '15px' }}
                onClick={() => {
                  setShowExpansionList(false);
                  setIsWaitingExpansion(true);
                  socket.emit('ek:propose_expansion', { roomId: engineRef.current.state?.roomId });
                }}
              >
                🔥 Cặp Đôi Gắn Kết
              </button>
              {/* Future expansions can go here */}
              <button
                className="ek-btn"
                style={{ background: '#7f8fa6', marginTop: '10px' }}
                onClick={() => setShowExpansionList(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpansionProposal && (
        <div className="ek-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="ek-modal">
            <h2>BẢN MỞ RỘNG CẶP ĐÔI</h2>
            <p>Đối phương đang rủ bạn chơi Bản Mở Rộng với các thẻ bài mới cực kỳ khốc liệt. Chơi luôn không?</p>
            <p style={{ fontSize: '0.8em', color: '#ff4757' }}>Lưu ý: Ván bài hiện tại sẽ bị khởi động lại.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                className="ek-btn"
                style={{ background: '#2ed573' }}
                onClick={() => {
                  setShowExpansionProposal(false);
                  socket.emit('ek:accept_expansion', { roomId: engineRef.current.state?.roomId });
                }}
              >
                Chơi Luôn
              </button>
              <button
                className="ek-btn"
                style={{ background: '#ff4757' }}
                onClick={() => {
                  setShowExpansionProposal(false);
                  socket.emit('ek:reject_expansion', { roomId: engineRef.current.state?.roomId });
                }}
              >
                Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {isWaitingExpansion && (
        <div className="ek-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="ek-modal">
            <h2>ĐANG CHỜ...</h2>
            <p>Đang chờ đối phương xác nhận...</p>
            <button
              className="ek-btn"
              style={{ background: '#7f8fa6', marginTop: '10px' }}
              onClick={() => setIsWaitingExpansion(false)}
            >
              Hủy / Đóng
            </button>
          </div>
        </div>
      )}

      {showSurrenderConfirm && (
        <div className="ek-modal-backdrop">
          <div className="ek-modal">
            <h2>ĐẦU HÀNG?</h2>
            <p>Bạn có chắc chắn muốn đầu hàng và nhường phần thắng cho đối phương?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                className="ek-btn"
                style={{ background: '#ff4757', boxShadow: '0 6px 20px rgba(255, 71, 87, 0.4)' }}
                onClick={() => {
                  setShowSurrenderConfirm(false);
                  socket.emit('ek:surrender', { roomId: engineRef.current.state?.roomId });
                }}
              >
                Đầu Hàng
              </button>
              <button
                className="ek-btn"
                style={{ background: '#7f8fa6', boxShadow: '0 6px 20px rgba(127, 143, 166, 0.4)' }}
                onClick={() => setShowSurrenderConfirm(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && modalData?.type === 'game_over' && (
        <div className="ek-modal-backdrop">
          <div className="ek-modal">
            <h2>{modalData.isWin ? 'CHIẾN THẮNG' : (modalData.reason === 'surrender' ? 'BẠN ĐÃ ĐẦU HÀNG' : 'BẠN ĐÃ NỔ TUNG')}</h2>
            <p>{
              modalData.reason === 'exploded' ? 'Ai đó đã rút trúng Mèo Nổ mà không có Gỡ Bom!' :
                modalData.reason === 'surrender' ? (modalData.isWin ? 'Đối thủ đã run sợ và xin hàng!' : 'Bạn đã giương cờ trắng đầu hàng.') :
                  'Đối thủ đã mất kết nối.'
            }</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="ek-btn"
                onClick={() => {
                  setGameState('WAITING');
                  setModalData(null);
                  socket.emit('ek:join_queue', {
                    id: user._id,
                    name: user.displayName || 'Player',
                    avatar: user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user._id
                  });
                }}
              >
                Chơi Lại
              </button>
              <button
                className="ek-btn"
                style={{ background: '#7f8fa6', boxShadow: '0 6px 20px rgba(127, 143, 166, 0.4)' }}
                onClick={() => navigate('/games')}
              >
                Thoát Game
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExplodingKittensGame;
