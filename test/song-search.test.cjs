const test=require('node:test'),assert=require('node:assert/strict');
const {search}=require('../song-search');
test('song discovery ranks titles, finds lyrics and preserves library order for equal ranks',()=>{
  const songs=[{title:'Evening',lyrics:'A light shines in the night'},{title:'Light of morning',lyrics:''},{title:'Light',lyrics:''},{title:'Another evening',lyrics:'Light in the night'}];
  assert.deepEqual(search(songs,'light').map(r=>r.song.title),['Light','Light of morning','Evening','Another evening']);
  assert.equal(search(songs,'night shines')[0].song,songs[0]);
  assert.match(search(songs,'night')[0].snippet,/light shines/);
  assert.equal(search(songs,'missing').length,0);
  assert.deepEqual(search(songs,'  ').map(r=>r.song),songs);
});
test('folded Nordic letters, accents, newlines and mutable edits remain searchable',()=>{
  const song={title:'Ære være',lyrics:'Håp over sjøen\nGrâce pour tous'};
  assert.equal(search([song],'AERE haap').length,0); // å folds to a, not aa
  assert.equal(search([song],'AERE hap sjoen')[0].song,song);
  assert.match(search([song],'grace')[0].snippet,/Grâce/);
  song.lyrics='A completely different line';
  assert.equal(search([song],'grace').length,0);
  assert.equal(search([song],'different').length,1);
  song.title='New title';assert.equal(search([song],'aere').length,0);
});
test('snippets keep original text and crop around distant matches without interpreting markup',()=>{
  const song={title:'Test',lyrics:'Beginning '.repeat(30)+'<b>needle</b> '+'ending '.repeat(30)};
  const result=search([song],'needle')[0];
  assert.match(result.snippet,/<b>needle<\/b>/);assert.ok(result.snippet.length<=122);assert.ok(result.snippet.startsWith('…'));
  assert.equal(search([{title:'Empty'}],'x').length,0);
});
