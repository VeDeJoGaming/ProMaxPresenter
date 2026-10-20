const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reunite}=require('../library-migration.js');
const {digest}=require('../shared-library.js');
test('early GitHub songs reunite with original folders without losing edits or extra songs',()=>{
  const song=(id,text)=>({id,title:id,lyrics:text,slides:[{text,section:'Verse',key:'v'}]});
  const old={schemaVersion:1,songs:[song('common','old'),song('original','keep')],meetingFolders:[{id:'meeting',items:[{type:'song',songId:'common'}]}],settings:{visual:'dynamic-glass'}};
  const recent={songs:[song('common','edited'),song('new','extra')],selected:'new',settings:{align:'left'}};
  const merged=reunite(recent,old);
  assert.deepEqual(merged.songs.map(s=>s.id),['common','new','original']);
  assert.equal(merged.songs[0].lyrics,'edited');
  assert.deepEqual(merged.meetingFolders,old.meetingFolders);
  assert.equal(merged.settings.visual,'dynamic-glass');
  assert.equal(reunite({...recent,schemaVersion:1},old),null);
});
test('local slide identities do not cause false shared-song conflicts',async()=>{
  const song={id:'song',title:'Title',lyrics:'Words',lines:4,slides:[{text:'Words',section:'Verse',key:'v'}]};
  assert.equal(await digest(song),await digest({...song,slides:[{...song.slides[0],id:'local-slide'}]}));
});
