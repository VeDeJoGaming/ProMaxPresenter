/* Bounded cross-library discovery; navigation and presentation stay in the UI. */
(function(root){
  const search=typeof module!=='undefined'&&module.exports?require('./song-search'):root.ProMaxSongSearch;
  const bible=typeof module!=='undefined'&&module.exports?require('./bible'):root.ProMaxBible;
  function find(catalog,query,group='all',favoriteIds=[]){
    const q=String(query||'').trim(),favorites=new Set(favoriteIds),results=[],counts={song:0,meeting:0,bible:0,video:0,document:0,youtube:0};
    function add(type,values,limit){counts[type]=values.length;results.push(...values.slice(0,group==='all'?limit:60));}
    if(group==='all'||group==='songs'){
      const matches=search.search(catalog.songs||[],q);if(!q)matches.sort((a,b)=>Number(favorites.has(b.song.id))-Number(favorites.has(a.song.id))||search.compare(a.song,b.song));
      add('song',matches.map(value=>({type:'song',source:value.song,title:value.song.title||'Untitled song',detail:(favorites.has(value.song.id)?'★ Favorite · ':'')+(value.snippet||'Song · '+value.song.slides.length+' slides')})),30);
    }
    if(group==='all'||group==='meetings')add('meeting',search.search((catalog.meetings||[]).map(source=>({title:source.name,source})),q).map(({song})=>({type:'meeting',source:song.source,title:song.title||'Untitled meeting',detail:'Meeting · '+song.source.items.length+' items'})),15);
    if((group==='all'||group==='bible')&&catalog.bible&&q.length>=2){
      const matches=bible.search(catalog.bible,q);counts.bible=matches.length;
      results.push(...matches.slice(0,group==='all'?15:60).map(verse=>({type:'bible',source:verse,title:bible.formatReference([verse]),detail:'Bible · '+String(verse.text).slice(0,180)})));
    }
    if(group==='all'||group==='media')for(const [type,key,label]of [['video','videos','Local video'],['document','documents','PowerPoint'],['youtube','youtube','YouTube']]){
      const matches=search.search((catalog[key]||[]).map(source=>({title:source.title||source.name,source})),q);
      add(type,matches.map(({song})=>({type,source:song.source,title:song.title||label,detail:label+(type==='document'?' · '+(song.source.slides?.length||0)+' slides':type==='youtube'?(song.source.localAssetId?' · Local copy':' · Internet required'):' · Saved on this computer')})),10);
    }
    return {results,counts,total:Object.values(counts).reduce((a,b)=>a+b,0)};
  }
  const api={find};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxQuickOpenSearch=api;
})(globalThis);
