const https = require('https');
const fs = require('fs');

https.get('https://dribbble.com/shots/12017587-Emoji-Set', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/<meta property="og:image" content="([^"]+)"/);
    if(match && match[1]) {
      const imgUrl = match[1];
      console.log('Found image URL:', imgUrl);
      https.get(imgUrl, (imgRes) => {
        const file = fs.createWriteStream('d:/VScode/TheStory/thestory-fe/public/emojis.png');
        imgRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Image downloaded successfully.');
        });
      });
    } else {
      console.log('Image URL not found in meta tags.');
    }
  });
}).on('error', (e) => {
  console.error(e);
});
