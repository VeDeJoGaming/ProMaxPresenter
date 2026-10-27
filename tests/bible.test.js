const test = require('node:test');
const assert = require('node:assert/strict');
const Bible = require('../bible');
const rows=[{book:'John',chapter:3,verse:16,text:'Synthetic verse with a light.'},
  {book:'John',chapter:3,verse:17,text:'Another synthetic verse.'},
  {book:'John',chapter:4,verse:1,text:'A light appears here.'}];
test('chapter context includes preceding and following verses in order, confined to the same book and chapter',()=>{
  const bible=Bible.parse(JSON.stringify({verses:[rows[2],rows[1],rows[0],{book:'Matt',chapter:3,verse:16,text:'Another book'}]}));
  const verse=Bible.search(bible,'Joh 3:17')[0],context=Bible.chapterVerses(bible,verse);
  assert.deepEqual(context.map(v=>v.verse),[16,17]);assert.equal(context[1],verse);
  assert.equal(Bible.chapterVerses(bible,Bible.search(bible,'Joh 3:16')[0]).length,2);
  assert.equal(Bible.chapterVerses(bible,Bible.search(bible,'Joh 4:1')[0]).length,1);
  assert.deepEqual(bible.verses.map(v=>v.verse),[1,17,16,16],'context must not reorder imported data');
  assert.deepEqual(Bible.ordered([bible.verses[0],bible.verses[1],bible.verses[3],bible.verses[2]]).map(v=>`${v.book} ${v.chapter}:${v.verse}`),['Matteus 3:16','Johannes 3:16','Johannes 3:17','Johannes 4:1']);
});
test('JSON import normalizes Norwegian and OSIS book names and searches ranges',()=>{
  const bible=Bible.parse(JSON.stringify({name:'Test translation',verses:rows}));
  assert.equal(bible.name,'Test translation');assert.equal(bible.verses[0].book,'Johannes');
  assert.equal(Bible.search(bible,'Joh 3:16–17').length,2);
  assert.equal(Bible.search(bible,'Johannes 3').length,2);
  assert.equal(Bible.search(bible,'light').length,2);
  assert.equal(Bible.search(bible,'verse light').length,1);
  assert.equal(Bible.search(bible,'Joh 3:18').length,0);
});
test('CSV supports escaped quotes, commas and newlines inside verse text',()=>{
  const bible=Bible.parse('book,chapter,verse,text\nJohn,3,16,"A comma, a ""quote""\nand a new line"','test.csv');
  assert.equal(bible.verses[0].text,'A comma, a "quote"\nand a new line');
  assert.equal(Bible.parse('book\tchapter\tverse\ttext\nJohn\t3\t16\tSynthetic','test.tsv').verses.length,1);
});
test('Plain text and nested JSON import supported',()=>{
  assert.equal(Bible.parse('1. Mosebok 1:1 Synthetic text','test.txt').verses[0].book,'1. Mosebok');
  assert.equal(Bible.parse(JSON.stringify({books:[{name:'John',chapters:[{number:3,verses:[{number:16,text:'Synthetic'}]}]}]})).verses[0].verse,16);
});
test('Invalid and duplicate rows cannot replace a Bible',()=>{
  assert.throws(()=>Bible.parse('{bad}'));
  assert.throws(()=>Bible.parse(JSON.stringify([{chapter:1,verse:1,text:'Missing book'}])),/Every verse/);
  assert.throws(()=>Bible.parse(JSON.stringify({verses:[...rows,rows[0]]})),/duplicate/);
  assert.throws(()=>Bible.parse(JSON.stringify([{book:'John',chapter:0,verse:1,text:'Synthetic'}])),/Every verse/);
  assert.throws(()=>Bible.parse('not a verse','test.txt'),/one verse per line/);
  assert.throws(()=>Bible.parse('book,chapter,verse,text\nJohn,3,16,"unclosed','test.csv'),/Unclosed/);
});

test('Live search accepts partial books and references while typing',()=>{
  const bible=Bible.parse(JSON.stringify({verses:[
    {book:'Matt',chapter:2,verse:1,text:'Second chapter'},
    {book:'Matt',chapter:1,verse:2,text:'Second verse'},
    {book:'Matt',chapter:1,verse:1,text:'First verse'},
    {book:'John',chapter:1,verse:1,text:'A different book'},
    {book:'1John',chapter:1,verse:1,text:'Letter'}
  ]}));
  assert.deepEqual(Bible.search(bible,'Mat').map(v=>[v.chapter,v.verse]),[[1,1],[1,2],[2,1]]);
  for(const query of ['Mat 1.1','Mat1:1','Mattheus 1:1'])assert.equal(Bible.search(bible,query)[0].text,'First verse');
  assert.equal(Bible.search(bible,'Mat 1:').length,2);
  assert.equal(Bible.search(bible,'Mat 1:1–').length,1);
  assert.equal(Bible.search(bible,'1 Joh 1.1')[0].text,'Letter');
  assert.equal(Bible.search(bible,'Joh')[0].text,'A different book');
  assert.equal(Bible.search(bible,'different book').length,1);
  assert.equal(Bible.search(bible,'').length,0);
});

test('Passage references combine only consecutive verses in the same chapter',()=>{
  const v=(verse,chapter=16,book='Matteus')=>({book,chapter,verse});
  assert.equal(Bible.formatReference([v(26),v(27)]),'Matteus 16:26-27');
  assert.equal(Bible.formatReference([v(26)]),'Matteus 16:26');
  assert.equal(Bible.formatReference([v(26),v(28)]),'Matteus 16:26 · Matteus 16:28');
  assert.equal(Bible.formatReference([v(28),v(1,17)]),'Matteus 16:28 · Matteus 17:1');
});
test('indexed chapter browsing crosses book boundaries and retains original verse identities',()=>{
  const bible=Bible.parse(JSON.stringify({verses:[{book:'Mark',chapter:1,verse:1,text:'Next book'},...rows]}));
  const current=Bible.search(bible,'Joh 3:16')[0];
  assert.deepEqual(Bible.adjacentChapter(bible,current,1).map(v=>v.chapter),[4]);
  assert.equal(Bible.adjacentChapter(bible,current,-1)[0].book,'Markus');
  assert.deepEqual(Bible.adjacentChapter(bible,bible.verses[0],-1),[]);
  assert.deepEqual(Bible.adjacentChapter(bible,Bible.search(bible,'Joh 4:1')[0],1),[]);
  assert.equal(Bible.chapterVerses(bible,current)[0],current);
  const copy=Bible.chapterVerses(bible,current);copy.pop();assert.equal(Bible.chapterVerses(bible,current).length,2);
});
test('cached text search preserves word matching and refreshes for a replacement import',()=>{
  const bible=Bible.parse(JSON.stringify({verses:rows}));
  assert.equal(Bible.search(bible,'synthetic light')[0],bible.verses[0]);
  assert.equal(Bible.search(bible,'synthetic light')[0],bible.verses[0]);
  bible.verses=Bible.parse(JSON.stringify({verses:[{book:'Ps',chapter:1,verse:1,text:'Replacement content'}]})).verses;
  assert.equal(Bible.search(bible,'synthetic').length,0);assert.equal(Bible.search(bible,'replacement')[0].book,'Salmene');
});
