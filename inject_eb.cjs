const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add ErrorBoundary
const eb = `
class PetDetailErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{background: 'red', color: 'white', padding: 20, zIndex: 999999, position: 'fixed', inset: 0, overflow: 'auto'}}>{this.state.error.stack}</div>;
    return this.props.children;
  }
}
export default function PetSanctuaryPage`;

content = content.replace('export default function PetSanctuaryPage', eb);

const target = `{/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (() => {`;

const replacement = `{/* 1. Modal: Pet Detail */}
                {modal.type === "petDetail" && detailPet && (
                  <PetDetailErrorBoundary>
                    {(() => {`;

const endTarget = `                    </motion.div>
                  );
                })()}`;

const endReplacement = `                    </motion.div>
                  );
                })()}
                  </PetDetailErrorBoundary>
                )}`;

content = content.replace(target, replacement);
content = content.replace(endTarget, endReplacement);
fs.writeFileSync(file, content);
console.log("ErrorBoundary injected!");
