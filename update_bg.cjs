const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// The line is: background: "url('/room-bg.png') center/cover no-repeat",
// Note: We need to make sure we don't accidentally match something else, so we replace it in the `petDetailCode`.

content = content.replace(
  /background: "url\('\/room-bg\.png'\) center\/cover no-repeat",/g,
  'background: detailMode === "feed" ? "url(\'/kitchen-bg.png\') center/cover no-repeat" : "url(\'/room-bg.png\') center/cover no-repeat", transition: "background 0.4s ease-in-out",'
);

fs.writeFileSync(file, content);
console.log('Background updated successfully');
