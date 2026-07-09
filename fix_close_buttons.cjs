const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/setModal\(\{ type: "petDetail", petId: modal\.petId \}\)/g, 'setModal(null)');

fs.writeFileSync(file, content);
console.log('Fixed close buttons');
