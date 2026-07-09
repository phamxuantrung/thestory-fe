const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add `detailPetId` state
content = content.replace('const [modal, setModal] = useState(null);', 'const [modal, setModal] = useState(null);\n  const [detailPetId, setDetailPetId] = useState(null);');

// 2. Find the early return block for petDetail
const earlyReturnStart = content.indexOf('if (modal?.type === "petDetail" && detailPet) {');
if (earlyReturnStart === -1) {
    console.log("Could not find early return");
    process.exit(1);
}

// Find the end of the early return block
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

// Modify petDetailCode to not be an early return, but a JSX block
petDetailCode = petDetailCode.replace('if (modal?.type === "petDetail" && detailPet) {', '');
// Remove the last brace
petDetailCode = petDetailCode.substring(0, petDetailCode.lastIndexOf('}'));
// Remove `return (` and `);` from the block
petDetailCode = petDetailCode.replace('return (', '');
petDetailCode = petDetailCode.substring(0, petDetailCode.lastIndexOf(')'));
petDetailCode = petDetailCode.trim(); // Now it's just the `<motion.div> ... </motion.div>`

// Replace `modal?.type === "petDetail" && detailPet` usages
// Actually, `const pet = detailPet;` is inside petDetailCode. Let's make sure it uses the new logic.
petDetailCode = `{(() => {\n  const pet = pets.find(p => p._id === detailPetId);\n  if (!pet) return null;\n` + 
                petDetailCode.replace('const pet = detailPet;', '') + 
                `\n})()}`;

// Replace `setModal(null)` for the "Vườn" button inside `petDetailCode` with `setDetailPetId(null)`
petDetailCode = petDetailCode.replace(/onClick=\{\(\) => setModal\(null\)\}.*?<Trees/g, (match) => {
    return match.replace('setModal(null)', 'setDetailPetId(null)');
});

// 3. Find the main return statement: `return (\n    <div className="app-container garden-wrap">`
const mainReturnStart = content.indexOf('return (\n    <div className="app-container garden-wrap">');
if (mainReturnStart === -1) {
    console.log("Could not find main return");
    process.exit(1);
}

// We will wrap the garden inside `{detailPetId ? ( petDetailCode ) : ( <div garden... > ... </div> )}`
// Wait, the modal container is INSIDE the garden div. We need to extract the modal container OR just keep it inside.
// Actually, if we just render `petDetailCode` conditionally INSIDE the main return wrapper, it's safer.
// Let's see the structure:
// <div className="app-container garden-wrap">
//    <Global.../>
//    <Header />
//    ...
//    {/* Khu vực Vườn (Garden Area) */}
//    ...
//    {/* Bottom Toolbars */}
//    ...
//    {/* Modals (BottomSheet style) */}
// </div>

// We can conditionally render everything EXCEPT the Modals container!
// But parsing that is hard with regex. 
// Easier: Just let `petDetailCode` be rendered at the very end of `<div className="app-container garden-wrap">`, just before the Modals container, OR right after it.
// Since `petDetailCode` has `position: fixed, inset: 0`, it will cover the garden anyway!
// We just need to make sure the Modals container is rendered ON TOP of `petDetailCode`.
// `petDetailCode` has `zIndex: 99999`. The Modal container has `zIndex: 999`.
// We need `petDetailCode` to have `zIndex: 50` so that Modal (`zIndex: 999`) appears on top!

// Wait, if we just put `petDetailCode` back, but controlled by `detailPetId` instead of `modal.type`, and lower its zIndex...
// No, if we don't unmount the garden, the garden still runs in the background. That's fine! 
// Let's modify `petDetailCode` zIndex:
petDetailCode = petDetailCode.replace('zIndex: 99999', 'zIndex: 50');

// Insert it right before the `<AnimatePresence>` of the modals.
const modalsStart = content.indexOf('{/* Modals (BottomSheet style) */}');
content = content.slice(0, modalsStart) + '\n      {/* Pet Detail Full Page View */}\n      ' + 
          petDetailCode + '\n\n      ' + content.slice(modalsStart);

// 4. Update the trigger in Garden Area
// Find `setModal({ type: "petDetail", petId: pet._id })`
content = content.replace(/setModal\(\{ type: "petDetail", petId: pet._id \}\)/g, 'setDetailPetId(pet._id)');

// Also we don't need `detailPet` computed at the top anymore
content = content.replace(/const detailPet = .*?;\n/, '');

fs.writeFileSync(file, content);
console.log("Architecture fixed!");
