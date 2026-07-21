const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix paths for iOS splash screens (remove public/ since Vite serves it from root)
html = html.replace(/href="public\/splash\//g, 'href="/splash/');

// Remove the injected loader style
html = html.replace(/<style>\s*#root-loader[\s\S]*?<\/style>/, '');

// Remove the injected loader div, restore empty <div id="root"></div>
html = html.replace(/<div id="root">\s*<div id="root-loader">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '<div id="root"></div>');

fs.writeFileSync('index.html', html);
console.log('Fixed index.html');
