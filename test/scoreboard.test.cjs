const {test}=require('node:test'),assert=require('node:assert/strict');
const scores=require('../scoreboard.js'),{normalize}=require('../library-data.js');
test('scoreboard defaults to three teams and accepts two through 64 with negative and tied scores',()=>{
  assert.equal(scores.normalize().teams.length,3);
  const teams=Array.from({length:64},(_,i)=>({id:'t'+i,name:'Lag '+i,score:i<2?7:-i}));
  const board=scores.normalize({teams,ranked:true,step:10,title:'Quiz'});assert.equal(board.teams.length,64);assert.equal(board.step,10);
  const list=scores.standings(board);assert.deepEqual(list.slice(0,3).map(t=>t.rank),[1,1,3]);assert.equal(list.at(-1).score,-63);
  assert.equal(scores.normalize({teams:teams.slice(0,2)}).teams.length,2);
  assert.equal(scores.normalize({teams:[...teams,...teams]}).teams.length,64);
});
test('malformed scores are bounded and team identities remain unique',()=>{
  const value=scores.normalize({teams:[{id:'dup',score:Infinity},{id:'dup',score:10000000},{id:'dup',score:1.5}],step:-1});
  assert.deepEqual(value.teams.map(t=>t.score),[0,999999,0]);assert.equal(new Set(value.teams.map(t=>t.id)).size,3);assert.equal(value.step,1);
  const long=scores.normalize({teams:[{id:'x'.repeat(128)},{id:'x'.repeat(128)}]});assert.ok(long.teams.every(t=>t.id.length<=128));assert.deepEqual(scores.normalize(long),long);
});
test('saved libraries retain score state without adding a board to old profiles',()=>{
  const base={songs:[{id:'s',slides:[]}]};assert.equal(normalize(base).settings.scoreboard,undefined);
  const board=scores.normalize();board.teams[0].score=-7;
  const library=normalize({...base,settings:{scoreboard:board}});assert.deepEqual(library.settings.scoreboard,board);
});
