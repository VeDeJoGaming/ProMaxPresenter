(function (root) {
  'use strict';
  // Only known section labels use the colon format; ordinary lyrics keep their colons.
  const colonHeading = /^(vers|verse|refreng|refrain|chorus|bridge|bro|intro|outro|mellomspill|interlude|instrumental|solo|pre[- ]?chorus|pre[- ]?refreng)(?:\s+\d+)?\s*[:：]\s*$/i;
  function parse(text, maxLines) {
    maxLines=Number(maxLines);
    if (!Number.isInteger(maxLines) || maxLines<1 || maxLines>100) maxLines=4;
    let section='Slide';const result=[],buffer=[];
    const flush=()=>{
      while(buffer.length) result.push({text:buffer.splice(0,maxLines).join('\n'),section,
        key:/chorus|refrain|refreng/i.test(section)?'c':/verse|vers/i.test(section)?'v':/bridge|\bbro\b/i.test(section)?'b':''});
    };
    for (const line of text.replace(/\r/g,'').split('\n')) {
      const trimmed=line.trim();const bracket=trimmed.match(/^\[([^\]]+)\]$/);
      if (bracket || colonHeading.test(trimmed)) {
        flush();section=bracket?bracket[1].trim():trimmed.replace(/[:：]\s*$/,'').trim();
      } else if (!trimmed) flush();
      else buffer.push(trimmed);
    }
    flush();return result;
  }
  root.ProMaxLyrics={parse};
  if (typeof module!=='undefined') module.exports=root.ProMaxLyrics;
})(typeof window!=='undefined'?window:globalThis);
