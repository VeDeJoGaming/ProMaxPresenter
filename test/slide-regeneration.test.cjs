const {test}=require('node:test'),assert=require('node:assert/strict'),{reconcile}=require('../slide-regeneration');
const slide=(text,section='Verse',key='v',id)=>({text,section,key,...(id?{id}:{})});
const ids=()=>{let value=0;return()=>'new-'+ ++value;};
test('inserting and reordering retains unchanged IDs and deliberate custom or blank shortcuts',()=>{
  const before=[slide('One','Verse','q','one'),slide('Two','Chorus','','two')],after=reconcile(before,[slide('Intro','Intro',''),slide('Two','Chorus','c'),slide('One')],ids());
  assert.deepEqual(after.map(s=>[s.id,s.key]),[['new-1',''],['two',''],['one','q']]);assert.equal(before[0].key,'q');
});
test('exact sections win before unique-text fallback for a renamed section',()=>{
  const before=[slide('Amen','Verse','v','verse'),slide('Amen','Chorus','c','chorus'),slide('Only here','Verse','q','unique')];
  const after=reconcile(before,[slide('Amen','Outro',''),slide('Amen','Verse','v'),slide('Only here','Opening','')],ids());assert.deepEqual(after.map(s=>[s.id,s.key]),[['chorus','c'],['verse','v'],['unique','q']]);
});
test('identical repeats keep occurrence order while ambiguous renamed repeats use fresh defaults',()=>{
  const before=[slide('Same','Chorus','a','one'),slide('Same','Chorus','b','two')];assert.deepEqual(reconcile(before,[slide('Same','Chorus'),slide('Same','Chorus')],ids()).map(s=>s.id),['one','two']);
  assert.deepEqual(reconcile(before,[slide('Same','Outro','o')],ids()).map(s=>[s.id,s.key]),[['new-1','o']]);
});
test('changed text gets a fresh ID and does not retain old Bible metadata',()=>{
  const passage={reference:'Synthetic 1:1',verses:[{text:'Synthetic passage'}]},before=Object.freeze([Object.freeze({...slide('Same','Bible','b','verse'),biblePassage:passage})]);
  const result=reconcile(before,[slide('Same','Bible')],ids()),changed=reconcile(before,[slide('Changed','Bible')],ids());assert.equal(result[0].biblePassage,passage);assert.equal(changed[0].biblePassage,undefined);assert.equal(changed[0].id,'new-1');
});
test('repeated regeneration is stable and duplicate legacy IDs are repaired',()=>{
  const next=[slide('One'),slide('Two')],first=reconcile([slide('One','Verse','q','duplicate'),slide('Two','Verse','w','duplicate')],next,ids());assert.equal(new Set(first.map(s=>s.id)).size,2);assert.deepEqual(reconcile(first,next,ids()),first);
});
