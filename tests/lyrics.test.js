const test=require('node:test');
const assert=require('node:assert/strict');
const {parse}=require('../lyrics');
test('Norwegian colon sections produce seven slides for four verses and three refrains',()=>{
  const labels=['Vers 1','Refreng','Vers 2','Refreng','Vers 3','Refreng','Vers 4'];
  const text=labels.map((label,i)=>`${label}:\nFirst line ${i}\nSecond line\nThird line\nFourth line`).join('\n\n');
  const slides=parse(text,4);
  assert.equal(slides.length,7);
  assert.deepEqual(slides.map(s=>s.section),labels);
  assert.deepEqual(slides.map(s=>s.key),['v','c','v','c','v','c','v']);
  assert.ok(slides.every(s=>s.text.split('\n').length===4 && !/Vers \d:|Refreng:/.test(s.text)));
});
test('Colon headings split sections even without blank lines',()=>{
  const slides=parse('  vErS 1:  \r\nOne\r\nTwo\r\nREFRENG:\r\nThree',4);
  assert.deepEqual(slides.map(s=>s.text),['One\nTwo','Three']);
  assert.deepEqual(slides.map(s=>s.key),['v','c']);
});
test('Bracket format, English labels, Norwegian bridge and line limits remain supported',()=>{
  const slides=parse('[Verse 1]\nOne\nTwo\nThree\nChorus:\nFour\nBro:\nFive\n[Custom section]\nSix',2);
  assert.deepEqual(slides.map(s=>s.text),['One\nTwo','Three','Four','Five','Six']);
  assert.deepEqual(slides.map(s=>s.key),['v','v','c','b','']);
  assert.equal(parse('[Refreng]\nOne',4)[0].key,'c');
});
test('Ordinary lyric lines ending in a colon remain lyrics',()=>{
  const slides=parse('Jesus sier:\nKom til meg\nVers 1: en sanglinje\nRefreng kommer igjen',4);
  assert.equal(slides.length,1);assert.equal(slides[0].section,'Slide');
  assert.ok(slides[0].text.startsWith('Jesus sier:'));
});
test('Empty input and invalid line counts finish safely',()=>{
  assert.deepEqual(parse('Vers 1:\n\nRefreng:\n',4),[]);
  assert.equal(parse('A\nB\nC\nD\nE',0).length,2);
});
