const test=require('node:test');
const assert=require('node:assert/strict');
const {parse}=require('../youtube-links');
test('YouTube links accept standard, short, embed and live URLs with start times',()=>{
  const id='M7lc1UVf-VE';
  for(const url of [`https://www.youtube.com/watch?v=${id}`,`https://youtu.be/${id}`,`https://www.youtube.com/shorts/${id}`,`https://www.youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`])assert.equal(parse(url).videoId,id);
  assert.equal(parse(`https://youtu.be/${id}?t=1h2m3s`).start,3723);
  assert.equal(parse(`https://www.youtube.com/watch?v=${id}&start=15`).start,15);
});
test('YouTube links reject lookalike domains, scripts and non-video URLs',()=>{
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://example.com/M7lc1UVf-VE','https://youtube.com/playlist?list=123','https://youtube.com/watch?v=invalid'])assert.throws(()=>parse(url));
});
