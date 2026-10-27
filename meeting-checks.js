/* Pure meeting assessment. File and decoder evidence is supplied by the read-only runner. */
(function(root){
  const index=list=>new Map((list||[]).map(item=>[item.id,item]));
  function assess(folder,catalog,evidence={videos:new Map(),files:new Map()}){
    const songs=index(catalog.songs),videos=index(catalog.videos),documents=index(catalog.documents),youtube=index(catalog.youtube);
    const rows=(folder.items||[]).map((item,position)=>{
      const result={itemId:item.id,position,type:item.type,title:item.title||'Untitled item',status:'attention',message:'Content is missing.',action:'replace'};
      function slides(list,allowGenerate=false){
        const count=list?.length||0,blank=list?.filter(s=>!String(s?.text||'').trim()).length||0;
        if(!count){result.message=allowGenerate?'Lyrics saved, but slides have not been generated.':'No prepared slides.';result.action=allowGenerate?'generate':null;}
        else if(blank){result.message=`${blank} of ${count} slides are blank. Check whether these are intentional.`;result.action=null;}
        else{result.status='ready';result.message=`${count} prepared ${count===1?'slide':'slides'} · Available offline`;result.action=null;}
      }
      function video(id){
        if(!videos.has(id)){result.message='The local video is no longer in the library.';return;}
        result.videoId=id;result.action=null;const proof=evidence.videos.get(id);
        if(!proof){result.status='checking';result.message='Checking the saved video…';return;}
        result.status=proof.status;result.message=proof.message;if(proof.status==='attention')result.action='replace';
      }
      if(item.type==='song'){
        const song=songs.get(item.songId);if(!song){result.message='This song is no longer in the library.';return result;}
        result.title=song.title||result.title;slides(song.slides,!!song.lyrics?.trim());result.songId=song.id;
      }else if(item.type==='bible'||item.type==='text'){
        result.action=null;slides(item.slides);
      }else if(item.type==='video')video(item.assetId);
      else if(item.type==='youtube'){
        const entry=youtube.get(item.assetId);if(!entry){result.message='This YouTube entry is no longer in the library.';return result;}
        if(entry.localAssetId)video(entry.localAssetId);
        else{result.status='online';result.message='Requires internet. Video availability, ads and buffering are not checked.';result.action=null;}
      }else if(item.type==='document'){
        const doc=documents.get(item.assetId);if(!doc){result.message='This PowerPoint is no longer in the library.';return result;}
        if(!doc.slides?.length){result.message='This PowerPoint has no slide images.';return result;}
        result.urls=[...new Set(doc.slides)];result.action=null;
        const proofs=result.urls.map(url=>evidence.files.get(url));
        const bad=proofs.filter(p=>p&&['missing','invalid','unsupported'].includes(p.status)).length;
        if(bad){result.message=`${bad} of ${doc.slides.length} slide files are missing or unreadable. Reimport this PowerPoint.`;result.action='replace';}
        else if(proofs.some(p=>!p)){result.status='checking';result.message=`Checking ${doc.slides.length} slide files…`;}
        else if(proofs.some(p=>p.status!=='available')){result.status='unverified';result.message='Some slide files could not be checked on this computer.';}
        else{result.status='ready';result.message=`${doc.slides.length} slide files found · Available offline`;}
      }else{result.message='This content type cannot be checked.';result.action=null;}
      return result;
    });
    const counts={ready:0,attention:0,online:0,unverified:0,checking:0};for(const row of rows)counts[row.status]++;
    return {rows,counts,total:rows.length};
  }
  const api={assess};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxMeetingChecks=api;
})(globalThis);
