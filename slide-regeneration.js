/* Match existing content in linear passes, then use unique text for renamed sections. */
(function(root){
  const section=slide=>typeof slide.section==='string'?slide.section:'Slide';
  const signature=slide=>JSON.stringify([slide.text,section(slide)]);
  function reconcile(previous,generated,createId=()=>crypto.randomUUID()){
    const exact=new Map(),texts=new Map(),records=previous.map(slide=>({slide,used:false}));
    for(const record of records){
      const key=signature(record.slide);if(!exact.has(key))exact.set(key,{records:[],index:0});exact.get(key).records.push(record);
      if(!texts.has(record.slide.text))texts.set(record.slide.text,{records:[],index:0,remaining:0});const bucket=texts.get(record.slide.text);bucket.records.push(record);bucket.remaining++;
    }
    const consume=record=>{if(record){record.used=true;texts.get(record.slide.text).remaining--;}return record?.slide;};
    const matched=generated.map(slide=>{const bucket=exact.get(signature(slide));return bucket?consume(bucket.records[bucket.index++]):undefined;});
    for(let index=0;index<generated.length;index++)if(!matched[index]){
      const bucket=texts.get(generated[index].text);if(bucket?.remaining!==1)continue;
      while(bucket.records[bucket.index]?.used)bucket.index++;
      matched[index]=consume(bucket.records[bucket.index]);
    }
    const ids=new Set();
    return generated.map((slide,index)=>{
      const old=matched[index];let id=old?.id;
      if(typeof id!=='string'||!id||ids.has(id))id=slide.id;
      while(typeof id!=='string'||!id||ids.has(id))id=createId();ids.add(id);
      return {...slide,id,key:typeof old?.key==='string'?old.key:slide.key,...(old?.biblePassage!==undefined&&slide.biblePassage===undefined?{biblePassage:old.biblePassage}:{})};
    });
  }
  const api={reconcile};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxSlideRegeneration=api;
})(globalThis);
