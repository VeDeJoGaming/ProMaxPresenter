const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/visual-engine.js':'visual-engine.js','/visual-scenes.js':'visual-scenes.js','/library-data.js':'library-data.js','/app-settings.js':'app-settings.js','/visuals.js':'visuals.js','/visual-library.js':'visual-library.js','/bible.js':'bible.js','/playback.js':'playback.js','/features.js':'features.js','/lyrics.js':'lyrics.js','/slide-editor.js':'slide-editor.js','/meetings.js':'meetings.js','/youtube.js':'youtube.js','/youtube-links.js':'youtube-links.js','/youtube-library.js':'youtube-library.js','/youtube-browser-ui.js':'youtube-browser-ui.js','/youtube-player.html':'youtube-player.html','/youtube-player.js':'youtube-player.js'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
for(const name of fs.readdirSync(__dirname).filter(name=>/\.(js|css)$/.test(name)&&name!=='server.js'))files['/'+name]=name;
for(const name of fs.readdirSync(path.join(__dirname,'visuals')).filter(name=>/\.svg$/.test(name)))files['/visuals/'+name]='visuals/'+name;
types['.svg']='image/svg+xml';
http.createServer((req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);return res.end('Not found');}fs.readFile(path.join(__dirname,file),(error,data)=>{if(error){res.writeHead(500);return res.end('Could not load app');}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache'});res.end(data);});}).listen(4173,'127.0.0.1',()=>console.log('ProMax Presenter is ready at http://127.0.0.1:4173'));
