const {test}=require('node:test');const assert=require('node:assert/strict');const {merge}=require('../shared-library.js');
const song={title:'Song',lyrics:'Original',lines:4,slides:[{text:'Original',section:'Verse',key:'v'}]};const remote={id:'remote',revision:1,song};
test('receiving is idempotent and untouched copies update in place',async()=>{const a=await merge([], [remote], 'group');const b=await merge(a.songs,[remote],'group');assert.equal(b.songs.length,1);
  const c=await merge(b.songs,[{...remote,revision:2,song:{...song,lyrics:'New'}}],'group');assert.equal(c.updated,1);assert.equal(c.songs[0].id,a.songs[0].id);});
test('local edits and selected songs are preserved; one separate incoming copy is added',async()=>{const a=await merge([], [remote], 'group');a.songs[0].lyrics='My edit';const newer={...remote,revision:2,song:{...song,lyrics:'New'}};
  const b=await merge(a.songs,[newer],'group');assert.equal(b.conflicts,1);assert.equal(b.songs[0].lyrics,'My edit');assert.equal((await merge(b.songs,[newer],'group')).songs.length,2);
  const c=await merge((await merge([], [remote], 'group')).songs,[newer],'group',new Set([a.songs[0].id]));assert.equal(c.songs.length,1);
  const original=await merge([], [remote], 'group');assert.equal((await merge(original.songs,[newer],'group',new Set([original.songs[0].id]))).songs.length,2);
});
