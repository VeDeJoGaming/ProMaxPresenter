(function(root){
  // Early GitHub builds saved only songs/settings. Reunite that store with the
  // original recovery copy without discarding songs added in either version.
  function reunite(current,recovery){
    if(!current||!recovery||current.schemaVersion||Array.isArray(current.meetingFolders))return null;
    const songs=current.songs.map(song=>{
      const old=recovery.songs.find(s=>s.id===song.id);
      return {...old,...song,slides:song.slides.map((slide,i)=>({...((old?.slides[i]?.text===slide.text)?old.slides[i]:{}),...slide}))};
    });
    const ids=new Set(songs.map(s=>s.id));
    songs.push(...recovery.songs.filter(s=>!ids.has(s.id)));
    return {...recovery,songs,selected:current.selected,settings:{...recovery.settings,...current.settings},savedAt:Date.now()};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={reunite};else root.ProMaxMigration={reunite};
})(globalThis);
