(function(root) {
  const content = s => JSON.stringify({title:s.title,lyrics:s.lyrics,lines:s.lines,slides:s.slides});
  async function digest(s) {
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content(s))))].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function merge(local, incoming, groupId, protectedIds=new Set(), makeId=()=>crypto.randomUUID()) {
    const songs=structuredClone(local);let added=0,updated=0,conflicts=0;
    for(const remote of incoming) {
      if(!remote||typeof remote.id!=='string'||!Number.isSafeInteger(remote.revision)||remote.revision<1)throw Error('Invalid shared song.');
      const song=ProMaxNormalize({songs:[remote.song]}).songs[0];
      const existing=songs.filter(s=>s.shared?.groupId===groupId&&s.shared?.songId===remote.id).sort((a,b)=>b.shared.revision-a.shared.revision)[0];
      if(existing&&existing.shared.revision>=remote.revision)continue;
      const baseline=await digest(song);
      if(!existing&&songs.some(s=>content(s)===content(song)))continue;
      const shared={groupId,songId:remote.id,revision:remote.revision,baseline};
      if(existing&&existing.shared.baseline===await digest(existing)&&!protectedIds.has(existing.id)) {
        Object.assign(existing,song,{id:existing.id,shared});updated++;
      } else {
        songs.push({...song,id:makeId(),shared});added++;if(existing)conflicts++;
      }
    }
    return {songs,added,updated,conflicts};
  }
  const ProMaxNormalize = typeof module!=='undefined'&&module.exports?require('./library.js').normalizeLibrary:root.ProMaxLibrary.normalizeLibrary;
  const api={merge,digest};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxSharing=api;
})(typeof window==='undefined'?globalThis:window);
