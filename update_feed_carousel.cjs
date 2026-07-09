const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `
                              const validPage = Math.min(foodPage, Math.max(0, totalPages - 1));
                              const visibleFoods = availableFoods.slice(validPage * 3, (validPage + 1) * 3);

                              return (
                                <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
                                  <button 
                                    onClick={() => setFoodPage(Math.max(0, validPage - 1))}
                                    disabled={validPage === 0}
                                    style={{ background: "rgba(255,255,255,0.8)", border: "2px solid #ccc", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", opacity: validPage === 0 ? 0.5 : 1 }}
                                  >
                                    <ChevronRight size={24} style={{ transform: "rotate(180deg)" }} />
                                  </button>
                                  
                                  <div style={{ display: "flex", gap: "24px", justifyContent: "center", flex: 1 }}>
                                    {visibleFoods.map(f => (
`;

// Note: I will replace the part starting from `const visibleFoods` up to `visibleFoods.map`.

const replacementStr = `
                              const validPage = Math.min(foodPage, Math.max(0, totalPages - 1));

                              return (
                                <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between", position: "relative" }}>
                                  <button 
                                    onClick={() => setFoodPage(Math.max(0, validPage - 1))}
                                    disabled={validPage === 0}
                                    style={{ zIndex: 10, background: "rgba(255,255,255,0.8)", border: "2px solid #ccc", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", opacity: validPage === 0 ? 0.5 : 1 }}
                                  >
                                    <ChevronRight size={24} style={{ transform: "rotate(180deg)" }} />
                                  </button>
                                  
                                  <div style={{ flex: 1, overflow: "visible", margin: "0 10px" }}>
                                    <motion.div 
                                      animate={{ x: \`-\${validPage * 100}%\` }}
                                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                      style={{ display: "flex", width: \`\${totalPages * 100}%\` }}
                                    >
                                      {Array.from({ length: totalPages }).map((_, pageIndex) => (
                                        <div key={pageIndex} style={{ width: \`\${100 / totalPages}%\`, display: "flex", gap: "24px", justifyContent: "center", flexShrink: 0 }}>
                                          {availableFoods.slice(pageIndex * 3, (pageIndex + 1) * 3).map(f => (
`;

// Then I need to close the extra tags at the end of the map.
const endTargetStr = `                                      </div>
                                    ))}
                                  </div>

                                  <button 
                                    onClick={() => setFoodPage(Math.min(totalPages - 1, validPage + 1))}
`;

const endReplacementStr = `                                      </div>
                                          ))}
                                        </div>
                                      ))}
                                    </motion.div>
                                  </div>

                                  <button 
                                    onClick={() => setFoodPage(Math.min(totalPages - 1, validPage + 1))}
`;

content = content.replace(targetStr, replacementStr);
content = content.replace(endTargetStr, endReplacementStr);

// Also add zIndex: 10 to right button
content = content.replace(
  'style={{ background: "rgba(255,255,255,0.8)", border: "2px solid #ccc", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", opacity: validPage >= totalPages - 1 ? 0.5 : 1 }}',
  'style={{ zIndex: 10, background: "rgba(255,255,255,0.8)", border: "2px solid #ccc", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", opacity: validPage >= totalPages - 1 ? 0.5 : 1 }}'
);

fs.writeFileSync(file, content);
console.log("Updated pagination to use translating carousel.");
