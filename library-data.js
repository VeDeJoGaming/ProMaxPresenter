/* Shared validation for saved libraries and recovery copies. */
(function(root){
  function normalize(value){
    if(!value||typeof value!=='object'||!Array.isArray(value.songs)||!value.songs.length||value.songs.length>10000)throw Error('The saved song library is invalid.');
    if(value.schemaVersion>1)throw Error('This library needs a newer version of ProMax Presenter.');
    const text=(v,fallback='',max=1000000)=>typeof v==='string'?v.slice(0,max):fallback;
    const validId=v=>typeof v==='string'&&v.length>0&&v.length<=128;
    const id=v=>validId(v)?v:crypto.randomUUID();
    const scopedIds=values=>{
      const reserved=new Set(values.filter(validId)),used=new Set();
      return value=>{
        let result=id(value);
        if(used.has(result)){let suffix=1;const base=result.slice(0,96);do{result=base+'~repair-'+ ++suffix;}while(used.has(result)||reserved.has(result));}
        else if(!validId(value))while(used.has(result)||reserved.has(result))result=crypto.randomUUID();
        used.add(result);return result;
      };
    };
    const ids=new Set();
    const songs=value.songs.map(song=>{
      if(!song||!Array.isArray(song.slides)||song.slides.length>10000)throw Error('A saved song is invalid.');
      const songId=id(song.id);if(ids.has(songId))throw Error('The saved library contains duplicate songs.');ids.add(songId);
      const slideId=scopedIds(song.slides.map(slide=>slide?.id)),slides=song.slides.map(slide=>{if(!slide||typeof slide.text!=='string')throw Error('A saved slide is invalid.');return {...slide,id:slideId(slide.id),text:text(slide.text),section:text(slide.section,'Slide',100),key:text(slide.key,'',1).toLowerCase()};});
      return {...song,id:songId,title:text(song.title,'Untitled song',500),lyrics:text(song.lyrics,slides.map(s=>`[${s.section}]\n${s.text}`).join('\n\n')),lines:[2,4,6,8].includes(Number(song.lines))?Number(song.lines):4,slides};
    });
    const source=value.settings&&typeof value.settings==='object'&&!Array.isArray(value.settings)?value.settings:{};
    const settings={...source,color:/^#[0-9a-f]{6}$/i.test(source.color)?source.color:'#181818',fontSize:Math.max(3,Math.min(9,Number(source.fontSize)||5)),align:source.align==='left'?'left':'center'};
    if(source.scoreboard!==undefined){const scores=typeof module!=='undefined'&&module.exports?require('./scoreboard.js'):root.ProMaxScoreboard;settings.scoreboard=scores.normalize(source.scoreboard);}
    if(source.songFavorites!==undefined)settings.songFavorites=Array.isArray(source.songFavorites)?[...new Set(source.songFavorites.filter(v=>typeof v==='string'&&v.length<=128))].slice(0,10000):[];
    settings.visualColors=Array.isArray(source.visualColors)&&source.visualColors.length===3&&source.visualColors.every(c=>/^#[0-9a-f]{6}$/i.test(c))?source.visualColors:['#5276f4','#e0edff','#131c43'];
    settings.renderQuality=['auto','quality','performance'].includes(source.renderQuality)?source.renderQuality:'auto';
    const folders=Array.isArray(value.meetingFolders)?value.meetingFolders:[];
    if(folders.length>10000)throw Error('The saved meeting library is too large.');
    const folderIdentity=scopedIds(folders.map(f=>f?.id)),itemIdentity=scopedIds(folders.flatMap(f=>Array.isArray(f?.items)?f.items.map(item=>item?.id):[])),meetingFolders=folders.map(f=>{
      if(!f||!Array.isArray(f.items))throw Error('A saved meeting folder is invalid.');
      const folderId=folderIdentity(f.id),selection=new Map(),items=f.items.map(item=>{
        if(!item||!['song','bible','text','video','document','youtube'].includes(item.type))throw Error('A saved meeting entry is invalid.');
        if(['bible','text'].includes(item.type)&&(!Array.isArray(item.slides)||item.slides.some(s=>!s||typeof s.text!=='string')))throw Error('A saved meeting passage is invalid.');
        const itemId=itemIdentity(item.id),slideId=scopedIds((item.slides||[]).map(s=>s?.id));if(typeof item.id==='string'&&!selection.has(item.id))selection.set(item.id,itemId);
        return {...item,id:itemId,title:text(item.title,'Untitled item',500),...(item.plannedMinutes!==undefined?{plannedMinutes:Number.isInteger(item.plannedMinutes)&&item.plannedMinutes>=0&&item.plannedMinutes<=1440?item.plannedMinutes:null}:{}),...(item.operatorNotes!==undefined?{operatorNotes:text(item.operatorNotes,'',8000)}:{}),...(item.slides?{slides:item.slides.map(s=>({...s,id:slideId(s.id)}))}:{})};
      });
      const folder={...f,id:folderId,name:text(f.name,'Untitled meeting',500),...(f.plannedStart!==undefined?{plannedStart:typeof f.plannedStart==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(f.plannedStart)?f.plannedStart:''}:{}),...(f.operatorNotes!==undefined?{operatorNotes:text(f.operatorNotes,'',8000)}:{}),items};
      if(f.selectedItem!==undefined){if(selection.has(f.selectedItem))folder.selectedItem=selection.get(f.selectedItem);else delete folder.selectedItem;}
      return folder;
    });
    return {schemaVersion:1,savedAt:Number(value.savedAt)||0,songs,selected:songs.some(s=>s.id===value.selected)?value.selected:songs[0].id,settings,meetingFolders,meetingSelected:meetingFolders.some(f=>f.id===value.meetingSelected)?value.meetingSelected:null};
  }
  const parse=raw=>normalize(typeof raw==='string'?JSON.parse(raw):raw);
  if(typeof module!=='undefined'&&module.exports)module.exports={normalize,parse};else root.ProMaxLibraryData={normalize,parse};
})(globalThis);
