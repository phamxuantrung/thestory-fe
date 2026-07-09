const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add `detailPetId` state
if (!content.includes('const [detailPetId, setDetailPetId]')) {
    content = content.replace('const [modal, setModal] = useState(null);', 'const [modal, setModal] = useState(null);\n  const [detailPetId, setDetailPetId] = useState(null);');
}

// 2. Find the early return block for petDetail
const earlyReturnStart = content.indexOf('if (modal?.type === "petDetail" && detailPet) {');
if (earlyReturnStart !== -1) {
    let braceCount = 0;
    let earlyReturnEnd = -1;
    for (let i = earlyReturnStart; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                earlyReturnEnd = i + 1;
                break;
            }
        }
    }

    let petDetailCode = content.substring(earlyReturnStart, earlyReturnEnd);
    
    // Remove the early return from the code
    content = content.slice(0, earlyReturnStart) + content.slice(earlyReturnEnd);

    // Modify petDetailCode to be an IIFE inside JSX
    petDetailCode = petDetailCode.replace('if (modal?.type === "petDetail" && detailPet) {', '');
    petDetailCode = petDetailCode.substring(0, petDetailCode.lastIndexOf('}'));
    petDetailCode = petDetailCode.trim(); 
    
    // Convert to JSX IIFE
    petDetailCode = `{detailPetId && (() => {\n  const pet = pets.find(p => p._id === detailPetId);\n  if (!pet) return null;\n` + 
                    petDetailCode.replace('const pet = detailPet;', '') + 
                    `\n})()}`;

    // Fix zIndex
    petDetailCode = petDetailCode.replace('zIndex: 99999', 'zIndex: 50');

    // Replace `setModal(null)` with `setDetailPetId(null)` inside the petDetail block
    // Specifically the Vườn button
    petDetailCode = petDetailCode.replace(/onClick=\{\(\) => setModal\(null\)\}.*?<Trees/g, (match) => {
        return match.replace('setModal(null)', 'setDetailPetId(null)');
    });

    // Find the Modals section and inject before it
    const modalsStart = content.indexOf('{/* Modals (BottomSheet style) */}');
    content = content.slice(0, modalsStart) + '\n      {/* Pet Detail Full Page View */}\n      ' + 
              petDetailCode + '\n\n      ' + content.slice(modalsStart);
}

// 3. Update the triggers in Garden Area
content = content.replace(/setModal\(\{ type: "petDetail", petId: pet._id \}\)/g, 'setDetailPetId(pet._id)');

// 4. Remove `detailPet` computed at the top
content = content.replace(/const detailPet = modal\?\.petId \? pets\.find\(p => p\._id === modal\.petId\) : null;\n?/g, '');

fs.writeFileSync(file, content);
console.log("Architecture fixed successfully!");
