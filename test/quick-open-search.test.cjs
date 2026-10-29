const {test}=require('node:test'),assert=require('node:assert/strict'),{find}=require('../quick-open-search'),bible=require('../bible');
const song=(id,title,lyrics='')=>({id,title,lyrics,slides:[]});
test('cross-library discovery keeps favorites, lyric snippets and Nordic media matching',()=>{
  const catalog={songs:[song('alpha','Alpha'),song('favorite','Favorite','Unique lyric marker')],meetings:[{id:'meeting',name:'Sunday',items:[]}],videos:[{id:'video',name:'Håp over sjøen.mp4'}],documents:[{id:'doc',title:'Håp',slides:['one','two']}],youtube:[{id:'yt',title:'Håp',localAssetId:'video'}]};
  assert.equal(find(catalog,'','all',['favorite']).results[0].source.id,'favorite');
  const lyric=find(catalog,'unique marker');assert.equal(lyric.total,1);assert.match(lyric.results[0].detail,/Unique lyric marker/);
  const media=find(catalog,'hap','media');assert.equal(media.total,3);assert.deepEqual(new Set(media.results.map(r=>r.type)),new Set(['video','document','youtube']));assert.match(media.results.find(r=>r.type==='youtube').detail,/Local copy/);
  assert.equal(find(catalog,'Sunday','meetings').results[0].source.id,'meeting');assert.equal(find(catalog,'Sunday','songs').total,0);
});
test('Bible discovery finds references and words without enumerating verses for an empty query',()=>{
  const value=bible.parse(JSON.stringify({name:'Synthetic Bible',verses:[{book:'John',chapter:3,verse:15,text:'Synthetic before'},{book:'John',chapter:3,verse:16,text:'Unique verse marker'},{book:'John',chapter:3,verse:17,text:'Synthetic after'}]}));
  assert.equal(find({bible:value},'','bible').total,0);assert.equal(find({bible:value},'x','bible').total,0);
  const ref=find({bible:value},'Joh 3:16','bible');assert.equal(ref.total,1);assert.equal(ref.results[0].source.verse,16);assert.equal(ref.results[0].title,'Johannes 3:16');
  assert.equal(find({bible:value},'unique marker').results[0].source.verse,16);
});
test('large libraries report the full count while bounding result DOM work',()=>{
  const catalog={songs:Array.from({length:1000},(_,i)=>song(String(i),'Song '+i)),meetings:Array.from({length:100},(_,i)=>({name:'Meeting '+i,items:[]})),videos:Array.from({length:500},(_,i)=>({name:'Video '+i}))};
  const all=find(catalog,'');assert.equal(all.total,1600);assert.equal(all.results.length,55);assert.equal(find(catalog,'Song','songs').results.length,60);assert.equal(find(catalog,'Video','media').results.length,60);
});
