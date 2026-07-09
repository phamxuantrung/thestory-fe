const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('{/* 1. Modal: Pet Detail */}');
const endIdx = content.indexOf('{/* 2. Modal: Cửa Hàng & Siêu Thị */}');

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find start or end index");
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const replacement = `{/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (() => {
                  const pet = detailPet;
                  const exploring = pet.status === "exploring";
                  const endMs = pet.expeditionEnd ? new Date(pet.expeditionEnd).getTime() : 0;
                  const startMs = pet.expeditionStart ? new Date(pet.expeditionStart).getTime() : 0;
                  const exp = user?.exp || 0;
                  const currentLevel = Math.floor(Math.sqrt(exp / 100)) + 1;
                  const currentLevelExp = 100 * Math.pow(currentLevel - 1, 2);
                  const nextLevelExp = 100 * Math.pow(currentLevel, 2);
                  const levelProgress = ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
                  const r = RARITY[pet.rarity] || RARITY.common;
                  const care = getCurrentCare(pet, now);

                  const playCooldown = pet.care?.lastPlayed ? Math.max(0, 3600000 - (now - new Date(pet.care.lastPlayed).getTime())) : 0;
                  const batheCooldown = pet.care?.lastBathed ? Math.max(0, 14400000 - (now - new Date(pet.care.lastBathed).getTime())) : 0;
                  const formatCD = (ms) => {
                    const m = Math.ceil(ms / 60000);
                    if (m >= 60) return \`\${Math.floor(m / 60)}h\${m % 60}m\`;
                    return \`\${m}p\`;
                  };
                  
                  const getStatusColor = (val) => val > 60 ? "#7bed9f" : val > 30 ? "#feca57" : "#ff4757";

                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={{
                        position: "fixed", inset: 0, zIndex: 99999,
                        background: "url('/room-bg.png') center/cover no-repeat",
                        display: "flex", flexDirection: "column"
                      }}
                    >
                      {/* Top Bar */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", marginTop: "env(safe-area-inset-top, 0px)" }}>
                        {/* Currency */}
                        <div style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)", padding: "4px 12px", borderRadius: "99px", display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.3)" }}>
                          <Heart size={18} fill="#ff4757" color="#ff4757" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />
                          <span>{user?.heart || 0}</span>
                          <button style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#7bed9f", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>+</button>
                        </div>

                        {/* Level Progress */}
                        <div style={{ 
                          position: "relative", 
                          width: "140px", 
                          height: "36px", 
                          background: "rgba(0,0,0,0.4)", 
                          borderRadius: "99px", 
                          border: "2px solid rgba(255,255,255,0.8)",
                          overflow: "hidden",
                          boxShadow: "inset 0 4px 8px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)"
                        }}>
                          {/* Fill */}
                          <div style={{ 
                            position: "absolute", 
                            top: 0, left: 0, bottom: 0, 
                            width: \`\${levelProgress}%\`, 
                            background: "linear-gradient(90deg, #feca57, #ff9f43)",
                            borderRadius: "99px"
                          }}></div>
                          
                          {/* Inner Shine */}
                          <div style={{
                            position: "absolute", top: "2px", left: "6px", right: "6px", height: "40%",
                            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
                            borderRadius: "99px", pointerEvents: "none"
                          }}></div>

                          {/* Content */}
                          <div style={{ 
                            position: "absolute", inset: 0, 
                            display: "flex", alignItems: "center", justifyContent: "center", 
                            gap: "6px", color: "white", fontWeight: "bold", fontSize: "1rem",
                            textShadow: "0 2px 4px rgba(0,0,0,0.6)"
                          }}>
                            <Star size={16} fill="#fff" color="#fff" />
                            Lv.{currentLevel}
                          </div>
                        </div>

                        {/* Settings */}
                        <button onClick={() => setModal({ type: "equipSkin", petId: pet._id, speciesId: pet.speciesId })} style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(to bottom, #ff7979, #eb4d4b)", color: "white", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(235, 77, 75, 0.4)" }}>
                          <Shirt size={20} color="#ffffff" strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Stats Bar */}
                      <div style={{ margin: "0 20px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", borderRadius: "20px", padding: "8px", display: "flex", justifyContent: "space-around", alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid rgba(255,255,255,1)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "bold" }}><Sword size={12} color="#ff4757" /> S.Mạnh</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--text-primary)" }}>{pet.stats.str}</div>
                        </div>
                        <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.1)" }}></div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "bold" }}><Wind size={12} color="#4db8ff" /> N.Nhẹn</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--text-primary)" }}>{pet.stats.agi}</div>
                        </div>
                        <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.1)" }}></div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "bold" }}><Brain size={12} color="#8f6fff" /> T.Tuệ</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--text-primary)" }}>{pet.stats.int}</div>
                        </div>
                        <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.1)" }}></div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "bold" }}><Clover size={12} color="#7fd8a6" /> M.Mắn</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "var(--text-primary)" }}>{pet.stats.luk}</div>
                        </div>
                      </div>

                      {/* Main Area */}
                      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* Floating Left Buttons */}
                        <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "16px", zIndex: 10 }}>
                          <button onClick={() => setModal(null)} style={{ background: "rgba(255,255,255,0.95)", border: "3px solid #f1f2f6", borderRadius: "16px", width: "64px", height: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" }}>
                            <Trees size={26} color="#ff4757" strokeWidth={2.5} style={{ marginBottom: "2px" }} />
                            <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>Vườn</span>
                          </button>
                          <button onClick={() => setModal({ type: "shop" })} style={{ background: "rgba(255,255,255,0.95)", border: "3px solid #f1f2f6", borderRadius: "16px", width: "64px", height: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" }}>
                            <Store size={26} color="#1e90ff" strokeWidth={2.5} style={{ marginBottom: "2px" }} />
                            <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>Cửa hàng</span>
                          </button>
                        </div>

                        {/* Floating Right Buttons */}
                        <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "16px", zIndex: 10 }}>
                          <button style={{ background: "rgba(255,255,255,0.95)", border: "3px solid #f1f2f6", borderRadius: "16px", width: "64px", height: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" }}>
                            <Gift size={26} color="#ff7f50" strokeWidth={2.5} style={{ marginBottom: "2px" }} />
                            <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>Quà</span>
                          </button>
                          <button onClick={() => handleSellPet(pet._id)} style={{ background: "rgba(255,255,255,0.95)", border: "3px solid #f1f2f6", borderRadius: "16px", width: "64px", height: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" }}>
                            <Sprout size={26} color="#2ed573" strokeWidth={2.5} style={{ marginBottom: "2px" }} />
                            <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>Thả</span>
                          </button>
                        </div>

                        {/* Pet Image */}
                        <div style={{ position: "relative", transform: "translateY(80px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          {/* Ground Shadow */}
                          <div style={{ position: "absolute", bottom: "16px", width: "140px", height: "20px", background: "rgba(0,0,0,0.35)", borderRadius: "50%", filter: "blur(4px)", zIndex: 0 }}></div>
                          <motion.img 
                            src={getPetImageSrc(pet)} 
                            style={{ width: "240px", height: "240px", objectFit: "contain", position: "relative", zIndex: 1 }}
                          />
                        </div>
                      </div>

                      {/* Bottom Action Buttons (Progress Bubble Style) */}
                      <div style={{ padding: "0 20px 40px", display: "flex", justifyContent: "center", gap: "28px", alignItems: "center" }}>
                        
                        {/* Care Button (Happiness) */}
                        <div style={{ position: "relative" }}>
                          <button 
                            disabled={playCooldown > 0} 
                            onClick={() => handleCare(pet._id, "play")} 
                            style={{ 
                              width: "76px", height: "76px", borderRadius: "50%", 
                              background: \`linear-gradient(to top, \${getStatusColor(care.happiness)} \${care.happiness}%, #f1f2f6 \${care.happiness}%)\`, 
                              border: "4px solid #2f3542", 
                              boxShadow: "0 8px 16px rgba(0,0,0,0.3), inset 0 8px 12px rgba(255,255,255,0.6)", 
                              display: "flex", alignItems: "center", justifyContent: "center", 
                              position: "relative", overflow: "hidden", padding: 0,
                              opacity: playCooldown > 0 ? 0.7 : 1
                            }}
                          >
                            <Smile size={36} color="#2f3542" strokeWidth={2.5} style={{ zIndex: 1, filter: "drop-shadow(0 2px 2px rgba(255,255,255,0.5))" }} />
                            
                            {/* Inner Glass Highlight */}
                            <div style={{ position: "absolute", top: 2, left: 10, right: 10, height: "30%", background: "linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)", borderRadius: "40px 40px 0 0", pointerEvents: "none" }}></div>
                            
                            {playCooldown > 0 && <span style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.6)", color: "white", padding: "2px 8px", borderRadius: "8px", position: "absolute", bottom: "8px", zIndex: 2, fontWeight: "bold" }}>{formatCD(playCooldown)}</span>}
                          </button>
                          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "2px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "bold", color: "#2f3542", border: "2px solid #2f3542", zIndex: 2 }}>
                            {Math.round(care.happiness)}%
                          </div>
                        </div>

                        {/* Feed Button (Fullness) */}
                        <div style={{ position: "relative", transform: "translateY(-16px)" }}>
                          <button 
                            onClick={() => setModal({ type: "feed", petId: pet._id })} 
                            style={{ 
                              width: "84px", height: "84px", borderRadius: "50%", 
                              background: \`linear-gradient(to top, \${getStatusColor(care.fullness)} \${care.fullness}%, #f1f2f6 \${care.fullness}%)\`, 
                              border: "4px solid #2f3542", 
                              boxShadow: "0 8px 16px rgba(0,0,0,0.3), inset 0 8px 12px rgba(255,255,255,0.6)", 
                              display: "flex", alignItems: "center", justifyContent: "center", 
                              position: "relative", overflow: "hidden", padding: 0
                            }}
                          >
                            <Utensils size={40} color="#2f3542" strokeWidth={2.5} style={{ zIndex: 1, filter: "drop-shadow(0 2px 2px rgba(255,255,255,0.5))" }} />
                            
                            {/* Inner Glass Highlight */}
                            <div style={{ position: "absolute", top: 2, left: 10, right: 10, height: "30%", background: "linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)", borderRadius: "40px 40px 0 0", pointerEvents: "none" }}></div>
                          </button>
                          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "2px 8px", borderRadius: "99px", fontSize: "0.8rem", fontWeight: "bold", color: "#2f3542", border: "2px solid #2f3542", zIndex: 2 }}>
                            {Math.round(care.fullness)}%
                          </div>
                        </div>

                        {/* Bathe Button (Cleanliness) */}
                        <div style={{ position: "relative" }}>
                          <button 
                            disabled={batheCooldown > 0} 
                            onClick={() => handleCare(pet._id, "bathe")} 
                            style={{ 
                              width: "76px", height: "76px", borderRadius: "50%", 
                              background: \`linear-gradient(to top, \${getStatusColor(care.cleanliness)} \${care.cleanliness}%, #f1f2f6 \${care.cleanliness}%)\`, 
                              border: "4px solid #2f3542", 
                              boxShadow: "0 8px 16px rgba(0,0,0,0.3), inset 0 8px 12px rgba(255,255,255,0.6)", 
                              display: "flex", alignItems: "center", justifyContent: "center", 
                              position: "relative", overflow: "hidden", padding: 0,
                              opacity: batheCooldown > 0 ? 0.7 : 1
                            }}
                          >
                            <Bath size={36} color="#2f3542" strokeWidth={2.5} style={{ zIndex: 1, filter: "drop-shadow(0 2px 2px rgba(255,255,255,0.5))" }} />
                            
                            {/* Inner Glass Highlight */}
                            <div style={{ position: "absolute", top: 2, left: 10, right: 10, height: "30%", background: "linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)", borderRadius: "40px 40px 0 0", pointerEvents: "none" }}></div>
                            
                            {batheCooldown > 0 && <span style={{ fontSize: "0.7rem", background: "rgba(0,0,0,0.6)", color: "white", padding: "2px 8px", borderRadius: "8px", position: "absolute", bottom: "8px", zIndex: 2, fontWeight: "bold" }}>{formatCD(batheCooldown)}</span>}
                          </button>
                          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "2px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "bold", color: "#2f3542", border: "2px solid #2f3542", zIndex: 2 }}>
                            {Math.round(care.cleanliness)}%
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
                `;

fs.writeFileSync(file, before + replacement + after);
console.log('Update successful!');
