(function(root){
  'use strict';
  const cache=new WeakMap();
  function normalize(value){return String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/ø/g,'o').replace(/\s+/g,' ').trim();}
  function indexed(song){
    let entry=cache.get(song);
    if(!entry||entry.sourceTitle!==song.title||entry.sourceLyrics!==song.lyrics){
      entry={sourceTitle:song.title,sourceLyrics:song.lyrics,title:normalize(song.title),lyrics:normalize(song.lyrics)};
      cache.set(song,entry);
    }
    return entry;
  }
  function search(songs,query){
    const phrase=normalize(query),terms=phrase.split(' ').filter(Boolean);
    return songs.flatMap((song,index)=>{
      if(!terms.length)return [{song,snippet:'',rank:0,index}];
      const entry=indexed(song),text=entry.title+' '+entry.lyrics;
      if(!terms.every(term=>text.includes(term)))return [];
      const titleMatch=terms.every(term=>entry.title.includes(term));
      const rank=entry.title===phrase?0:entry.title.startsWith(phrase)?1:titleMatch?2:3;
      let snippet='';
      if(!titleMatch){
        const lines=String(song.lyrics||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
        // Prefer the line containing most query words, then crop around its first match.
        let best='',score=0;
        for(const line of lines){const normalized=normalize(line),hits=terms.filter(term=>normalized.includes(term)).length;if(hits>score){best=line;score=hits;}}
        if(best){
          // Normalize prefixes to map folded letters back to the original text safely.
          const folded=normalize(best),at=Math.min(...terms.map(term=>folded.indexOf(term)).filter(i=>i>=0));
          let offset=0;while(offset<best.length&&normalize(best.slice(0,offset)).length<at)offset++;
          const start=Math.max(0,offset-28),end=Math.min(best.length,start+120);
          snippet=(start?'…':'')+best.slice(start,end)+(end<best.length?'…':'');
        }
      }
      return [{song,snippet,rank,index}];
    }).sort((a,b)=>a.rank-b.rank||a.index-b.index);
  }
  const api={search,normalize};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ProMaxSongSearch=api;
})(typeof window==='object'?window:globalThis);
