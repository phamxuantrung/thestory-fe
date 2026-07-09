const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetExport = 'export default function PetSanctuaryPage() {';
const replacementExport = `const ASSETS_TO_PRELOAD = [
  '/garden-bg.webp',
  '/arena-bg-dark.webp',
  ...SPECIES.map(s => \`/pets/\${s.id}.webp\`),
  ...FOODS.map(f => \`/foods/\${f.id}.webp\`),
  ...ITEMS.map(i => \`/items/\${i.id}.webp\`),
  ...PET_SKINS.map(s => \`/pets/skins/\${s.id}.webp\`)
];

export default function PetSanctuaryPage() {`;

content = content.replace(targetExport, replacementExport);

const targetState = `  const [isCombating, setIsCombating] = useState(false);`;
const replacementState = `  const [isCombating, setIsCombating] = useState(false);
  const [preloadingState, setPreloadingState] = useState({ isPreloading: true, progress: 0 });

  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = ASSETS_TO_PRELOAD.length;
    
    if (totalAssets === 0) {
      setPreloadingState({ isPreloading: false, progress: 100 });
      return;
    }

    const loadImages = () => {
      ASSETS_TO_PRELOAD.forEach(src => {
        const img = new window.Image();
        const onLoadOrError = () => {
          loadedCount++;
          setPreloadingState(prev => ({ ...prev, progress: (loadedCount / totalAssets) * 100 }));
          if (loadedCount === totalAssets) {
            setTimeout(() => setPreloadingState(prev => ({ ...prev, isPreloading: false })), 400);
          }
        };
        img.onload = onLoadOrError;
        img.onerror = onLoadOrError;
        img.src = src;
      });
    };
    loadImages();
  }, []);`;

content = content.replace(targetState, replacementState);

const targetRender = `  if (!loaded) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--gradient-main)' }}>
        <div className="spinner"></div>
      </div>
    );
  }`;
const replacementRender = `  if (!loaded || preloadingState.isPreloading) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--gradient-main)', color: 'var(--text-primary)' }}>
        <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)", marginBottom: "30px", fontSize: "2rem" }}>Đang tải Vườn thú...</h2>
        <div style={{ width: "80%", maxWidth: "300px", background: "rgba(0,0,0,0.1)", borderRadius: "20px", height: "24px", overflow: "hidden", position: "relative", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ width: \`\${preloadingState.progress}%\`, height: "100%", background: "var(--color-primary)", transition: "width 0.3s ease-out", borderRadius: "20px" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "bold", color: preloadingState.progress > 50 ? "white" : "var(--color-primary)", transition: "color 0.3s" }}>
            {Math.round(preloadingState.progress)}%
          </div>
        </div>
        <p style={{ marginTop: "16px", fontSize: "0.95rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Sẵn sàng gặp lại các bé cưng...</p>
      </div>
    );
  }`;

content = content.replace(targetRender, replacementRender);

fs.writeFileSync(file, content);
console.log('Update successful!');
