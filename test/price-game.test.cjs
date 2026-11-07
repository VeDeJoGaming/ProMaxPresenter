const test=require('node:test'),assert=require('node:assert/strict');
const game=require('../price-game.js'),library=require('../library-data.js');
const draft={title:'Gjett <prisen> & vinn',currency:'kr',rounds:[{id:'coffee',name:'Kaffe & te <stor>',price:'1 234,90',image:''},{id:'free',name:'Gratis vare',price:'0'}]};
test('Norwegian prices preserve decimals and reject invalid or ambiguous input',()=>{
  assert.equal(game.price('1\u00a0234,90'),1234.9);assert.equal(game.price('12.50'),12.5);assert.equal(game.price('0'),0);
  for(const value of ['',null,'-1','1e3','1,234.50','NaN','12,345','1000000000','5 kr'])assert.equal(game.price(value),null,String(value));
  assert.throws(()=>game.makeItem({...draft,rounds:[{name:'Kaffe',price:'feil'}]}),/Vare 1/);
  assert.throws(()=>game.makeItem({...draft,rounds:[]}),/1 og 30/);
});
test('question output excludes the answer and all inserted text is escaped',()=>{
  const item=game.makeItem(draft),question=game.svg(item,item.slides[0]),answer=game.svg(item,item.slides[1]);
  assert.equal(item.slides.length,4);assert.ok(question.includes('? kr'));assert.ok(!question.includes('234,90'));assert.ok(answer.includes('234,90'));
  assert.ok(question.includes('Kaffe &amp; te &lt;stor&gt;'));assert.ok(!question.includes('<stor>'));
  assert.ok(game.svg(item,item.slides[3]).includes('0 kr'));
  assert.equal(game.image(item,{priceRound:{id:'missing'}}),'');
});
test('editable source stores photos once and survives normalization with stable slide identities',()=>{
  const image='data:image/png;base64,aGVsbG8=',item=game.makeItem({...draft,rounds:[{...draft.rounds[0],image}]});
  assert.equal(JSON.stringify(item).split(image).length-1,1,'Do not duplicate photographs into every slide');
  const modified=game.makeItem({...draft,rounds:[{...draft.rounds[0],image,price:99}]},item);
  assert.deepEqual(modified.slides.map(s=>s.id),item.slides.map(s=>s.id));
  const value=library.normalize({songs:[{id:'song',slides:[]}],meetingFolders:[{id:'meeting',items:[{...modified,id:'game'}]}]});
  assert.deepEqual(value.meetingFolders[0].items[0].priceGame,modified.priceGame);
  const unsafe=game.makeItem({...draft,rounds:[{...draft.rounds[0],image:'https://example.com/private-photo'}]});assert.equal(unsafe.priceGame.rounds[0].image,'');
});

test('meeting checks recognize generated offline slides and flag missing source rounds',()=>{
  const item=game.makeItem(draft),checks=require('../meeting-checks.js');item.id='game';
  assert.equal(checks.assess({items:[item]},{}).rows[0].status,'ready');
  item.priceGame.rounds=[];assert.equal(checks.assess({items:[item]},{}).rows[0].status,'attention');
});

test('optional descriptions persist, escape markup and render on both slides without changing older games',()=>{
  const item=game.makeItem({...draft,rounds:[{...draft.rounds[0],description:'250 g & <hele bønner>\r\nMørkbrent.'}]});
  assert.equal(item.priceGame.rounds[0].description,'250 g & <hele bønner>\nMørkbrent.');
  for(const slide of item.slides){const svg=game.svg(item,slide);assert.ok(svg.includes('250 g &amp; &lt;hele bønner&gt;'));assert.ok(svg.includes('Mørkbrent.'));}
  const restored=library.normalize({songs:[{id:'song',slides:[]}],meetingFolders:[{id:'meeting',items:[{...item,id:'game'}]}]});
  assert.deepEqual(restored.meetingFolders[0].items[0].priceGame,item.priceGame);
  assert.equal(game.makeItem(draft).priceGame.rounds[0].description,'');
  delete item.priceGame.rounds[0].description;assert.ok(game.svg(item,item.slides[0]).includes('? kr'));
  assert.throws(()=>game.makeItem({...draft,rounds:[{...draft.rounds[0],description:'x'.repeat(201)}]}),/maks 200/);
});
