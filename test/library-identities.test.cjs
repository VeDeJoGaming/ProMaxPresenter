const {test}=require('node:test'),assert=require('node:assert/strict'),{normalize}=require('../library-data');
function example(){return {schemaVersion:1,savedAt:1,selected:'song',songs:[{id:'song',title:'Synthetic identity example',lyrics:'Synthetic words',slides:[{id:'repeat-slide',text:'First words',section:'Verse',key:'q'},{id:'repeat-slide',text:'Second words',section:'Verse',key:'w'}]}],settings:{},meetingSelected:'repeat-folder',meetingFolders:[{id:'repeat-folder',name:'First folder',selectedItem:'repeat-item',items:[{id:'repeat-item',type:'song',songId:'song',title:'First item'},{id:'prepared',type:'text',title:'Prepared text',slides:[{id:'repeat-prepared',text:'Prepared one'},{id:'repeat-prepared',text:'Prepared two'}]}]},{id:'repeat-folder',name:'Second folder',selectedItem:'repeat-item',items:[{id:'repeat-item',type:'song',songId:'song',title:'Second item'}]}]};}
test('local duplicate slide, folder and item IDs are repaired without losing content or selection',()=>{
  const source=example(),before=JSON.stringify(source),data=normalize(source),folders=data.meetingFolders,items=folders.flatMap(f=>f.items);
  assert.equal(new Set(data.songs[0].slides.map(s=>s.id)).size,2);assert.equal(new Set(folders.map(f=>f.id)).size,2);assert.equal(new Set(items.map(i=>i.id)).size,3);
  assert.equal(new Set(items[1].slides.map(s=>s.id)).size,2);assert.equal(data.songs[0].slides[0].id,'repeat-slide');assert.equal(data.meetingSelected,folders[0].id);
  assert.equal(folders[0].selectedItem,folders[0].items[0].id);assert.equal(folders[1].selectedItem,folders[1].items[0].id,'Each folder retains its own selected entry after global item ID repair');
  assert.deepEqual(data.songs[0].slides.map(s=>s.text),['First words','Second words']);assert.deepEqual(items.map(i=>i.title),['First item','Prepared text','Second item']);assert.equal(JSON.stringify(source),before,'Validation never mutates the supplied document');
  assert.deepEqual(normalize(data),data,'Repair is stable once the repaired library is saved');
  assert.deepEqual(normalize(source),data,'The same duplicate IDs are repaired consistently on another computer');
});
test('valid slide IDs can be reused across separate songs or prepared passages',()=>{
  const source=example();source.songs[0].slides=[source.songs[0].slides[0]];source.songs.push({...source.songs[0],id:'other-song'});source.meetingFolders=[{id:'folder',name:'Folder',items:['first','second'].map(id=>({id,type:'text',title:id,slides:[{id:'repeat-slide',text:id}]}))}];const data=normalize(source);assert.equal(data.songs[0].slides[0].id,'repeat-slide');assert.equal(data.songs[1].slides[0].id,'repeat-slide');assert.deepEqual(data.meetingFolders[0].items.map(item=>item.slides[0].id),['repeat-slide','repeat-slide']);
});
test('duplicate shared song identities remain an explicit invalid-library error',()=>{
  const source=example();source.songs.push({...source.songs[0]});assert.throws(()=>normalize(source),/duplicate songs/);
});
test('repair reserves existing identifiers and keeps replacement IDs within the schema length',()=>{
  const source=example(),long='a'.repeat(128);source.songs[0].slides=[{id:long,text:'One'},{id:long,text:'Two'},{id:long.slice(0,96)+'~repair-2',text:'Existing reserved ID'}];const data=normalize(source),slides=data.songs[0].slides;assert.equal(slides[0].id,long);assert.equal(slides[2].id,source.songs[0].slides[2].id);assert.ok(slides[1].id.length<=128);assert.equal(new Set(slides.map(s=>s.id)).size,3);
});
