const {test}=require('node:test'),assert=require('node:assert/strict');
const plan=require('../meeting-plan'),{parse}=require('../library-data');
const fixture=()=>({id:'meeting',name:'Sunday',plannedStart:'23:50',operatorNotes:'Private meeting note',items:[{id:'a',type:'song',title:'Old song title',songId:'song',plannedMinutes:15,operatorNotes:'Private item note'},{id:'b',type:'text',title:'Reading',slides:[{text:'Public words'}],plannedMinutes:20},{id:'c',type:'video',title:'Missing clip',assetId:'absent',plannedMinutes:0}]});
test('running sheets calculate midnight and retain explicit zero durations',()=>{
  const value=plan.create(fixture(),{songs:[{id:'song',title:'Current title',lyrics:'Never export these lyrics',slides:[]}]});
  const s=plan.schedule(value);assert.equal(value.items[0].title,'Current title');assert.equal(value.items[2].missing,true);assert.equal(s.total,35);assert.equal(s.untimed,0);assert.equal(plan.clock(s.rows[1].start),'00:05 (+1d)');assert.equal(plan.clock(s.end),'00:25 (+1d)');assert.equal(s.rows[2].plannedMinutes,0);assert.equal(plan.durationLabel(75),'1 h 15 min');
  assert.doesNotMatch(JSON.stringify(value),/Private|Never export|Public words|songId|assetId/);
});
test('unknown durations never invent later start or end times',()=>{
  const f=fixture();delete f.items[0].plannedMinutes;const value=plan.create(f),s=plan.schedule(value);
  assert.equal(s.rows[0].start,1430);assert.equal(s.rows[1].start,null);assert.equal(s.end,null);assert.equal(s.total,20);assert.equal(s.untimed,1);assert.match(plan.summary(value),/At least 20 min.*1 duration not set/);
  delete f.plannedStart;const withoutStart=plan.schedule(plan.create(f));assert.ok(withoutStart.rows.every(row=>row.start===null));
});
test('export opts notes in explicitly and escapes all user text without executable markup',()=>{
  const f=fixture();f.name='<script>alert(1)</script>';f.operatorNotes='<img src="https://invalid.test/pixel">';
  const publicPlan=plan.create(f);assert.doesNotMatch(plan.toHTML(publicPlan),/<script>|<img|Private item note/);assert.doesNotMatch(plan.toText(publicPlan),/Private/);
  const privatePlan=plan.create(f,{},true),html=plan.toHTML(privatePlan);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.match(html,/Private item note/);assert.match(html,/default-src 'none'/);assert.match(plan.toText(privatePlan),/Meeting notes:/);
  assert.equal(plan.normalize({...privatePlan,includeNotes:false}).notes,'');assert.equal(plan.normalize({...privatePlan,includeNotes:false}).items[0].notes,'');
});
test('timing validation preserves old libraries and repairs malformed imported values',()=>{
  const source={songs:[{id:'song',title:'Title',slides:[{text:'Words'}]}],meetingFolders:[fixture()]};
  const normalized=parse(source);assert.equal(normalized.meetingFolders[0].plannedStart,'23:50');assert.equal(normalized.meetingFolders[0].items[0].plannedMinutes,15);
  source.meetingFolders[0].plannedStart='25:00';source.meetingFolders[0].items[0].plannedMinutes=-5;source.meetingFolders[0].items[1].plannedMinutes='10';source.meetingFolders[0].items[2].plannedMinutes=1.5;
  const repaired=parse(source);assert.equal(repaired.meetingFolders[0].plannedStart,'');assert.ok(repaired.meetingFolders[0].items.every(i=>i.plannedMinutes===null));
  assert.throws(()=>plan.normalize({items:Array(1001).fill({type:'text'})}),/1,000/);assert.throws(()=>plan.normalize({items:[{type:'__proto__'}]}),/invalid/);
  for(const v of [-1,Infinity,1441,1.5,'5',null])assert.equal(plan.minutes(v),null);
});
