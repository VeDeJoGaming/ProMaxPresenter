(function(root){
  function parse(value){
    let url;try{url=new URL(value.trim());}catch{throw Error('Paste a YouTube video link.');}
    if(!['https:','http:'].includes(url.protocol))throw Error('Paste a YouTube video link.');
    const host=url.hostname.toLowerCase();let id;
    if(host==='youtu.be')id=url.pathname.split('/')[1];
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)){
      id=url.pathname==='/watch'?url.searchParams.get('v'): /^\/(shorts|embed|live)\//.test(url.pathname)?url.pathname.split('/')[2]:null;
    }
    if(!/^[\w-]{11}$/.test(id||''))throw Error('Use a link to one YouTube video, not a channel or playlist.');
    const raw=url.searchParams.get('t')||url.searchParams.get('start')||'0';
    const match=raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    const start=/^\d+$/.test(raw)?Number(raw):match?Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0):0;
    return {videoId:id,start:Math.min(start,86400),url:`https://www.youtube.com/watch?v=${id}`};
  }
  root.ProMaxYouTubeLinks={parse};if(typeof module!=='undefined')module.exports=root.ProMaxYouTubeLinks;
})(typeof window!=='undefined'?window:globalThis);
