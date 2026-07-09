const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const petDetailStart = content.indexOf('{/* 1. Modal: Pet Detail */}');
const petDetailEnd = content.indexOf('{/* 2. Modal: Cửa Hàng & Siêu Thị */}');

if (petDetailStart === -1 || petDetailEnd === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

let petDetailCode = content.substring(petDetailStart, petDetailEnd);

// Remove from current position
content = content.slice(0, petDetailStart) + content.slice(petDetailEnd);

// Clean up the petDetailCode to be an early return instead of an IIFE
petDetailCode = petDetailCode.replace('{/* 1. Modal: Pet Detail */}', '');
petDetailCode = petDetailCode.replace('{modal.type === "petDetail" && detailPet && (() => {', 'if (modal?.type === "petDetail" && detailPet) {');
// Find the last '})()' and replace with '}'
const lastIifeEnd = petDetailCode.lastIndexOf('})()');
if (lastIifeEnd !== -1) {
    petDetailCode = petDetailCode.slice(0, lastIifeEnd) + '}' + petDetailCode.slice(lastIifeEnd + 4);
}
// Remove the last '}' that closed the expression
const lastBrace = petDetailCode.lastIndexOf('}');
if (lastBrace !== -1) {
    petDetailCode = petDetailCode.slice(0, lastBrace) + petDetailCode.slice(lastBrace + 1);
}

// Find where to insert it: right after 'const detailPet = ...'
const detailPetDecl = 'const detailPet = modal?.petId ? pets.find(p => p._id === modal.petId) : null;';
const insertIdx = content.indexOf(detailPetDecl);
if (insertIdx === -1) {
  console.log("Could not find detailPet declaration");
  process.exit(1);
}

// Ensure the `position: fixed` in petDetail is changed to `position: absolute` or relative to the page
// and remove `zIndex: 99999` so it acts like a page.
// Actually, if it's an early return, it replaces the entire app container, so it IS the page.
// `position: fixed, inset: 0` is totally fine because it fills the viewport and hides the body background.

// Let's also remove `maxHeight: "100vh"` logic from the old modal container since petDetail is out.
content = content.replace(/\["combatPlayback", "petDetail"\]\.includes\(modal\.type\)/g, 'modal.type === "combatPlayback"');

const finalContent = content.slice(0, insertIdx + detailPetDecl.length) + '\n\n' + petDetailCode + '\n\n' + content.slice(insertIdx + detailPetDecl.length);

fs.writeFileSync(file, finalContent);
console.log("Extraction successful!");
