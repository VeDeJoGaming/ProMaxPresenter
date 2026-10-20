const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, '..', 'visuals');
for (const file of fs.readdirSync(directory).filter(n => /^\d\d-.*\.svg$/.test(n) && !n.endsWith('.poster.svg'))) {
  const svg = fs.readFileSync(path.join(directory,file),'utf8');
  if (/<script|https?:\/\/(?!www.w3.org\/2000\/svg)/i.test(svg)) throw Error('Visual contains external content: '+file);
  const poster = svg.replace(/<(?:animateTransform|animate|set)\b[^>]*\/>/g,'');
  fs.writeFileSync(path.join(directory,file.replace('.svg','.poster.svg')),poster);
}
