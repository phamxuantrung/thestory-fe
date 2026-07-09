const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement logic
content = content.replace(/maxHeight: modal\.type === "combatPlayback" \? "100vh" : "85vh",/g, 'maxHeight: ["combatPlayback", "petDetail"].includes(modal.type) ? "100vh" : "85vh",');
content = content.replace(/height: modal\.type === "combatPlayback" \? "100vh" : "auto",/g, 'height: ["combatPlayback", "petDetail"].includes(modal.type) ? "100vh" : "auto",');
content = content.replace(/borderTopLeftRadius: modal\.type === "combatPlayback" \? 0 : "28px",/g, 'borderTopLeftRadius: ["combatPlayback", "petDetail"].includes(modal.type) ? 0 : "28px",');
content = content.replace(/borderTopRightRadius: modal\.type === "combatPlayback" \? 0 : "28px",/g, 'borderTopRightRadius: ["combatPlayback", "petDetail"].includes(modal.type) ? 0 : "28px",');
content = content.replace(/\{modal\.type !== "combatPlayback" && \(/g, '{!["combatPlayback", "petDetail"].includes(modal.type) && (');
content = content.replace(/padding: modal\.type === "combatPlayback" \? 0 : "16px 20px 40px",/g, 'padding: ["combatPlayback", "petDetail"].includes(modal.type) ? (modal.type === "petDetail" ? "20px 20px 40px" : 0) : "16px 20px 40px",');

fs.writeFileSync(file, content);
console.log('Update successful!');
