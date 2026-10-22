/* Logical content records only. Never copies Chromium databases or access keys. */
(function(root){
  const stable=value=>JSON.stringify(value);
  function merge(local,remote,baseline={}){
    const records={},conflicts={};
    for(const id of new Set([...Object.keys(remote.conflicts),...Object.keys(local.conflicts)])){
      conflicts[id]=local.conflicts[id]===null||remote.conflicts[id]===null?null:local.conflicts[id]||remote.conflicts[id];
    }
    for(const key of new Set([...Object.keys(local.records),...Object.keys(remote.records),...Object.keys(baseline)])){
      const l=local.records[key]??null,r=remote.records[key]??null,b=baseline[key];
      const lh=local.hashes[key],rh=remote.hashes[key];
      // Immutable files and video payloads may still be referenced by a conflict.
      if((key.startsWith('file/')||key.startsWith('asset/video:'))&&(l===null||r===null)){records[key]=l??r;continue;}
      if(stable(l)===stable(r))records[key]=l;
      else if(b!==undefined&&lh===b)records[key]=r;
      else if(b!==undefined&&rh===b)records[key]=l;
      else if(b===undefined&&(l===null||r===null))records[key]=l??r;
      else {
        records[key]=l;
        // The same collision is retained once across retries and device restores.
        const id=key+'@'+[lh||'deleted',rh||'deleted'].sort().join(':');
        if(!Object.hasOwn(conflicts,id))conflicts[id]={key,local:l,incoming:r};
      }
    }
    return {format:1,records,conflicts};
  }
  const api={merge};if(typeof module!=='undefined')module.exports=api;else root.ProMaxPrivateMerge=api;
})(globalThis);
