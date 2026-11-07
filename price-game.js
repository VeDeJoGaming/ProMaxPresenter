/* Portable price-game source. Rendered slides contain only the visible answer. */
(function(root){
  const MAX_ROUNDS=30;
  const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function price(value){
    const raw=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
    if(!/^\d{1,9}(\.\d{1,2})?$/.test(raw))return null;
    const amount=Number(raw);return amount<=999999999.99?amount:null;
  }
  function format(value,currency='kr'){
    return new Intl.NumberFormat('nb-NO',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value)+' '+currency;
  }
  function makeItem(draft,previous){
    const title=String(draft.title||'').trim().slice(0,80)||'Gjett prisen';
    if(!Array.isArray(draft.rounds)||!draft.rounds.length||draft.rounds.length>MAX_ROUNDS)throw Error('Legg inn mellom 1 og 30 varer.');
    const currency=['kr','€','$','£'].includes(draft.currency)?draft.currency:'kr';
    const used=new Set();
    const rounds=draft.rounds.map((r,i)=>{
      const name=String(r.name||'').trim(),amount=price(r.price);
      if(!name||name.length>80)throw Error(`Vare ${i+1}: skriv et navn på maks 80 tegn.`);
      if(amount===null)throw Error(`Vare ${i+1}: skriv en gyldig pris, for eksempel 149 eller 149,90.`);
      const id=typeof r.id==='string'&&!used.has(r.id)?r.id:crypto.randomUUID();used.add(id);
      const image=/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(r.image||'')?r.image:'';
      return {id,name,price:amount,image};
    });
    const slides=rounds.flatMap((round,index)=>[false,true].map(answer=>{
      const old=previous?.slides?.find(s=>s.priceRound?.id===round.id&&s.priceRound.answer===answer);
      const label=`${index+1} · ${round.name} · ${answer?'Fasit':'Gjett'}`;
      return {id:old?.id||crypto.randomUUID(),text:'',section:label,label,key:'',priceRound:{id:round.id,answer}};
    }));
    return {...previous,type:'text',title,priceGame:{version:1,currency,rounds},slides};
  }
  function lines(value,max=21){
    const result=[];let line='';
    for(const word of String(value).split(/\s+/).flatMap(w=>w.match(new RegExp(`.{1,${max}}`,'gu'))||[])){
      if(line&&Array.from(line+' '+word).length>max){result.push(line);line='';}
      line+=(line?' ':'')+word;
    }
    if(line)result.push(line);return result.slice(0,4);
  }
  function svg(item,slide){
    const game=item?.priceGame,round=game?.rounds?.find(r=>r.id===slide.priceRound?.id);if(!round)return '';
    const index=game.rounds.indexOf(round),answer=slide.priceRound.answer===true;
    const name=lines(round.name),size=name.length>3?48:58;
    const amount=answer?(Number.isFinite(round.price)?format(round.price,game.currency):'— '+game.currency):'? '+game.currency;
    const amountSize=amount.length>15?60:amount.length>11?76:104;
    const photo=round.image?`<rect x="80" y="200" width="650" height="590" rx="32" fill="#f5eeea"/><image href="${xml(round.image)}" x="110" y="230" width="590" height="530" preserveAspectRatio="xMidYMid meet"/>`:
      '<rect x="80" y="200" width="650" height="590" rx="32" fill="#291c1b" stroke="#5e3730"/><path d="M259 365h180l112 130-160 160-132-112z" fill="#ef5349"/><circle cx="307" cy="412" r="17" fill="#291c1b"/><text x="404" y="559" text-anchor="middle" font-size="120" font-weight="700" fill="#fff1e7">?</text>';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><radialGradient id="glow" cx="100%" cy="0%" r="100%"><stop stop-color="#6b2823"/><stop offset="1" stop-color="#191212"/></radialGradient></defs><rect width="1600" height="900" fill="url(#glow)"/><path d="M1190 0h410v10h-410z" fill="#ff8a3d"/><g font-family="Segoe UI,Arial,sans-serif" fill="#fff1e7"><rect x="80" y="79" width="8" height="44" rx="4" fill="#ef5349"/><text x="108" y="112" font-size="${item.title.length>50?22:30}" font-weight="600">${xml(item.title)}</text><text x="1520" y="112" text-anchor="end" font-size="24" fill="#d3b6ab">VARE ${index+1} / ${game.rounds.length}</text>${photo}<text x="810" y="230" fill="#ff9b59" font-size="23" font-weight="700" letter-spacing="4">${answer?'FASIT':'HVA KOSTER DEN?'}</text><text font-size="${size}" font-weight="700">${name.map((s,i)=>`<tspan x="810" y="${312+i*68}">${xml(s)}</tspan>`).join('')}</text><rect x="810" y="610" width="710" height="155" rx="26" fill="${answer?'#ff8a3d':'#30201d'}" stroke="${answer?'#ffad73':'#87503b'}"/><text x="1165" y="718" text-anchor="middle" font-size="${amountSize}" font-weight="700" fill="${answer?'#241108':'#ffae76'}">${xml(amount)}</text><text x="810" y="820" font-size="24" fill="#d3b6ab">${answer?'Dette er riktig pris.':'Hva tror dere?'}</text></g></svg>`;
  }
  function image(item,slide){const source=svg(item,slide);return source?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source):'';}
  const api={MAX_ROUNDS,price,format,makeItem,svg,image};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxPriceGame=api;
})(globalThis);
