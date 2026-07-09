const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `{/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (() => {`;

const replacement = `{/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (() => {
                  try {`;

const endTarget = `                    </motion.div>
                  );
                })()}`;

const endReplacement = `                    </motion.div>
                  );
                  } catch (err) {
                    return <div style={{background: 'red', color: 'white', padding: 20, zIndex: 999999, position: 'fixed', inset: 0}}>{err.message}</div>;
                  }
                })()}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  content = content.replace(endTarget, endReplacement);
  fs.writeFileSync(file, content);
  console.log("try-catch injected!");
} else {
  console.log("Could not find target to inject try-catch");
}
