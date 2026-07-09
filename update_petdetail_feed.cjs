const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add `detailMode` state right after `detailPetId`
if (!content.includes('const [detailMode, setDetailMode]')) {
    content = content.replace('const [detailPetId, setDetailPetId] = useState(null);', 
                              'const [detailPetId, setDetailPetId] = useState(null);\n  const [detailMode, setDetailMode] = useState("normal");');
}

// 2. We need to extract the entire `petDetailCode` block to modify it
const startMarker = '{/* Pet Detail Full Page View */}';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.error("Could not find start marker");
    process.exit(1);
}

const endMarker = '{/* Modals (BottomSheet style) */}';
const endIdx = content.indexOf(endMarker);
if (endIdx === -1) {
    console.error("Could not find end marker");
    process.exit(1);
}

let petDetailSection = content.substring(startIdx + startMarker.length, endIdx);

// Modify the "Vườn" (Back) button to also reset detailMode
petDetailSection = petDetailSection.replace('setDetailPetId(null)', 'setDetailPetId(null); setDetailMode("normal");');

// Modify the Vui vẻ (Smile) button:
// Current: onClick={() => handleCare(pet._id, "play")}
// New: onClick={() => setDetailMode("normal")}
petDetailSection = petDetailSection.replace(/onClick=\{\(\) => handleCare\(pet\._id, "play"\)\}/g, 'onClick={() => setDetailMode("normal")}');

// Optionally remove disabled={playCooldown > 0} and the opacity logic, because it's no longer an action with cooldown.
petDetailSection = petDetailSection.replace(/disabled=\{playCooldown > 0\}/g, '');
petDetailSection = petDetailSection.replace(/opacity: playCooldown > 0 \? 0\.7 : 1/g, 'opacity: detailMode === "normal" ? 1 : 0.5'); // dim if not selected maybe? Or just 1.
petDetailSection = petDetailSection.replace(/\{playCooldown > 0 && <span.*?<\/span>\}/g, '');

// Modify the Cho ăn (Utensils) button:
// Current: onClick={() => setModal({ type: "feed", petId: pet._id })}
// New: onClick={() => setDetailMode("feed")}
petDetailSection = petDetailSection.replace(/onClick=\{\(\) => setModal\(\{ type: "feed", petId: pet\._id \}\)\}/g, 'onClick={() => setDetailMode("feed")}');

// Change the Pet Image transform based on detailMode
// Current: transform: "translateY(80px)"
// New: transform: detailMode === "feed" ? "translateY(10px)" : "translateY(80px)", transition: "transform 0.4s"
petDetailSection = petDetailSection.replace(/transform: "translateY\(80px\)"/g, 'transform: detailMode === "feed" ? "translateY(10px)" : "translateY(80px)", transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"');

// Add the Feeding Table right before the closing </motion.div> of the petDetailView.
// First, find the `</motion.div>` that closes the main return of this section.
const tableJSX = `
                      {/* Feeding Table */}
                      <AnimatePresence>
                        {detailMode === "feed" && (
                          <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            style={{
                              position: "absolute",
                              bottom: "120px", // Just above the bottom buttons
                              left: 0, right: 0,
                              height: "180px",
                              background: "linear-gradient(to bottom, #f1c40f, #f39c12)",
                              borderTop: "8px solid #e67e22",
                              boxShadow: "0 -10px 20px rgba(0,0,0,0.2)",
                              display: "flex",
                              alignItems: "center",
                              overflowX: "auto",
                              padding: "0 20px",
                              gap: "24px",
                              zIndex: 10
                            }}
                          >
                            {(() => {
                              const availableFoods = FOODS.map(f => ({ ...f, qty: user?.petFoods?.find(x => x.foodId === f.id)?.quantity || 0 })).filter(f => f.qty > 0 && !f.id.startsWith("med_"));
                              if (availableFoods.length === 0) {
                                return (
                                  <div style={{ textAlign: "center", width: "100%", color: "#d35400", fontWeight: "bold" }}>
                                    Hết thức ăn rồi! Bạn hãy vào Cửa hàng để mua thêm nhé.
                                  </div>
                                );
                              }
                              return availableFoods.map(f => (
                                <div key={f.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "100px" }}>
                                  {/* Plate */}
                                  <div style={{
                                    position: "absolute", bottom: "-10px",
                                    width: "100px", height: "30px",
                                    background: "#ecf0f1",
                                    borderRadius: "50%",
                                    boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)",
                                    zIndex: 1
                                  }}></div>
                                  
                                  {/* Food Image with Drag */}
                                  <motion.div
                                    drag
                                    dragSnapToOrigin
                                    onDragEnd={(event, info) => {
                                      // If dragged upwards significantly (towards the pet)
                                      if (info.offset.y < -80) {
                                        handleCare(pet._id, "feed", f.id);
                                      }
                                    }}
                                    whileDrag={{ scale: 1.2, zIndex: 50 }}
                                    style={{ position: "relative", zIndex: 2, cursor: "grab", touchAction: "none" }}
                                  >
                                    <LazyImage
                                      src={\`/foods/\${f.id}.webp\`}
                                      alt={f.name}
                                      style={{ width: "70px", height: "70px", objectFit: "contain", filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.3))" }}
                                      fallback={<div style={{fontSize: "3rem"}}>{f.emoji}</div>}
                                    />
                                  </motion.div>

                                  {/* Quantity Badge */}
                                  <div style={{
                                    position: "absolute", bottom: "-15px",
                                    background: "white", color: "black",
                                    border: "2px solid black", borderRadius: "8px",
                                    padding: "2px 8px", fontSize: "0.9rem", fontWeight: "bold",
                                    zIndex: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                  }}>
                                    {f.qty}
                                  </div>
                                </div>
                              ));
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>
`;

// Insert the tableJSX just before the closing </motion.div> of the pet detail container.
// The easiest way is to look for the last `</motion.div>` in petDetailSection.
const lastMotionDivIdx = petDetailSection.lastIndexOf('</motion.div>');
if (lastMotionDivIdx !== -1) {
    petDetailSection = petDetailSection.slice(0, lastMotionDivIdx) + tableJSX + petDetailSection.slice(lastMotionDivIdx);
}

// Replace in content
content = content.substring(0, startIdx + startMarker.length) + petDetailSection + content.substring(endIdx);

fs.writeFileSync(file, content);
console.log("Updated pet detail UI for feed table");
