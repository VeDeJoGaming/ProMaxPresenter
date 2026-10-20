const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
async function startYouTubeHost(){
  const token=require('node:crypto').randomBytes(24).toString('hex');
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method!=='GET'||url.searchParams.get('token')!==token||!['/youtube-player.html','/youtube-player.js'].includes(url.pathname)){res.writeHead(404);res.end();return;}
    const file=path.join(__dirname,'..',url.pathname.slice(1));
    res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin'});
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}/youtube-player.html?token=${token}`,close:()=>server.close()};
}
module.exports={startYouTubeHost};
