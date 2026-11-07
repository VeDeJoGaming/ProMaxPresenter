/* Prepare privately, then explicitly add or update an ordinary meeting deck. */
(() => {
  const model=ProMaxPriceGame;
  const row=()=>({id:uid(),name:'',price:'',image:''});
  let draft={title:'Gjett prisen',currency:'kr',rounds:[row()]},target=null,selected=0,answer=false,view=null,loaded=false,writes=Promise.resolve();
  const node=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
  const button=(text,action,className)=>{const b=node('button',text,className);b.type='button';b.onclick=action;return b;};
  function remember(){
    const value=structuredClone({draft,target});
    writes=writes.catch(()=>{}).then(()=>storedAsset('put',value,'price-game-draft')).catch(()=>notify('Kladden kunne ikke lagres.'));
  }
  const ready=storedAsset('get',null,'price-game-draft').then(value=>{
    if(value?.draft&&Array.isArray(value.draft.rounds)&&value.draft.rounds.length&&value.draft.rounds.length<=model.MAX_ROUNDS){draft=value.draft;target=value.target||null;}
  }).catch(()=>{}).finally(()=>{loaded=true;});
  function field(text,value,change){const label=node('label',text),input=node('input');input.value=value;input.oninput=()=>{change(input.value);error('');remember();preview();};label.append(input);return {label,input};}
  function error(message){const e=view?.querySelector('.price-game-error');if(e)e.textContent=message;}
  function preview(){
    if(!view?.isConnected)return;
    selected=Math.max(0,Math.min(selected,draft.rounds.length-1));
    const r=draft.rounds[selected],sample={...r,name:r.name.trim()||'Navn på varen',price:model.price(r.price)};
    const item={title:draft.title.trim()||'Gjett prisen',priceGame:{currency:draft.currency,rounds:draft.rounds.map((r,i)=>i===selected?sample:r)}};
    const image=view.querySelector('.price-game-preview>img');
    image.src=model.image(item,{priceRound:{id:r.id,answer}});image.alt=`${answer?'Fasit':'Spørsmål'} for ${sample.name}`;
    const select=view.querySelector('.price-game-preview-tools select');
    select.replaceChildren(...draft.rounds.map((r,i)=>{const option=node('option',`${i+1} · ${r.name||'Ny vare'}`);option.value=i;return option;}));select.value=selected;
    view.querySelectorAll('[data-price-answer]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.priceAnswer==='true')===answer)));
    view.querySelectorAll('.price-game-row').forEach((e,i)=>e.dataset.selected=String(i===selected));
    view.querySelector('.price-game-summary').textContent=`${draft.rounds.length} varer → ${draft.rounds.length*2} lysbilder. Spørsmål først, fasit på neste lysbilde.`;
  }
  async function importPhoto(file,r){
    if(!file)return;const owner=draft,url=URL.createObjectURL(file),image=new Image();
    try{
      image.src=url;await image.decode();
      let width=800,source;
      do{
        const scale=Math.min(1,width/image.naturalWidth,width/image.naturalHeight),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);source=canvas.toDataURL('image/webp',.82);width=Math.floor(width*.75);
      }while(source.length>90000&&width>=200);
      if(source.length>90000)throw Error('Bildet er for stort.');
      if(draft!==owner||!draft.rounds.includes(r))return;
      r.image=source;remember();if(view?.isConnected)renderRows();preview();
    }catch{notify('Bildet kunne ikke åpnes. Velg et PNG-, JPEG- eller WebP-bilde.');}
    finally{URL.revokeObjectURL(url);}
  }
  function renderRows(){
    const list=view.querySelector('.price-game-rounds');list.replaceChildren();
    draft.rounds.forEach((r,index)=>{
      const card=node('section',null,'price-game-row');card.dataset.roundId=r.id;
      const heading=node('div',null,'price-game-row-heading');heading.append(node('strong',`Vare ${index+1}`));
      for(const [text,delta,label] of [['↑',-1,'Flytt vare opp'],['↓',1,'Flytt vare ned']]){
        const b=button(text,()=>{const next=index+delta;[draft.rounds[index],draft.rounds[next]]=[draft.rounds[next],draft.rounds[index]];selected=next;remember();renderRows();preview();});b.setAttribute('aria-label',label);b.disabled=index+delta<0||index+delta>=draft.rounds.length;heading.append(b);
      }
      const remove=button('×',()=>{draft.rounds.splice(index,1);selected=Math.min(selected,draft.rounds.length-1);remember();renderRows();preview();});remove.disabled=draft.rounds.length===1;remove.setAttribute('aria-label',`Fjern vare ${index+1}`);heading.append(remove);
      const fields=node('div',null,'price-game-fields');
      const name=field('Varenavn',r.name,value=>{r.name=value;selected=index;}),price=field('Riktig pris',r.price,value=>{r.price=value;selected=index;price.input.setAttribute('aria-invalid',String(model.price(value)===null));});
      name.input.maxLength=80;name.input.placeholder='F.eks. en pose kaffe';price.input.inputMode='decimal';price.input.placeholder='149,90';name.input.dataset.priceField='name';price.input.dataset.priceField='price';
      fields.append(name.label,price.label);
      const photo=node('div',null,'price-game-photo');
      if(r.image){const img=node('img');img.src=r.image;img.alt=r.name||'Varebilde';photo.append(img);}
      photo.append(ProMaxFilePicker.create({text:r.image?'Bytt bilde':'Legg til bilde',key:'price-photo-'+r.id,accept:'image/png,image/jpeg,image/webp',onFiles:files=>importPhoto(files[0],r)}));
      if(r.image)photo.append(button('Fjern bilde',()=>{r.image='';remember();renderRows();preview();},'subtle'));
      card.addEventListener('focusin',()=>{selected=index;preview();});card.append(heading,fields,photo);list.append(card);
    });
    view.querySelector('[data-price-add]').disabled=draft.rounds.length>=model.MAX_ROUNDS;
  }
  async function generate(){
    error('');if(ProMaxControls.busy)return;
    const folders=meetingFolders;
    const existing=target?folders.find(f=>f.id===target.folderId)?.items.find(i=>i.id===target.itemId):null;
    if(target&&!existing){error('Konkurransen er fjernet fra møtet. Velg «Ny konkurranse» for å lage en ny.');return;}
    let item;try{item=model.makeItem(draft,existing);}catch(e){error(e.message);return;}
    const destination=view.querySelector('[data-price-destination]')?.value;
    let folder=target?folders.find(f=>f.id===target.folderId):folders.find(f=>f.id===destination);
    const folderName=view.querySelector('[data-price-folder-name]')?.value.trim()||draft.title.trim()||'Gjett prisen';
    if(!folder&&destination!=='new'){error('Velg hvilken møtemappe lysbildene skal ligge i.');return;}
    await ProMaxControls.mutate('Gjett prisen',()=>{
      if(!folder){folder={id:uid(),name:folderName,items:[]};meetingFolders.push(folder);}
      if(existing)folder.items[folder.items.indexOf(existing)]=item;
      else{item.id=uid();folder.items.push(item);}
      meetingSelected=folder.id;folder.selectedItem=item.id;
    });
    if(!folder?.items.includes(item))return;
    target={folderId:folder.id,itemId:item.id};remember();
    ProMaxMeetings.select(folder.id);await ProMaxMeetings.open(item);
    notify(`${item.slides.length} lysbilder ${existing?'oppdatert':'lagt til'} i ${folder.name}.`);
  }
  async function render(container){
    if(!loaded){container.replaceChildren(node('p','Åpner kladd …'));await ready;if(ProMaxFeatures.currentTab()!=='price-game')return;}
    view=node('section',null,'price-game');container.replaceChildren(view);
    view.append(node('h2','Gjett prisen'),node('p','Legg inn varer og riktig pris. Bilder er valgfritt. Kladden lagres automatisk på denne maskinen.'));
    const top=node('div',null,'price-game-top'),title=field('Tittel på skjermen',draft.title,value=>draft.title=value);title.input.maxLength=80;top.append(title.label);
    const currencyLabel=node('label','Valuta'),currency=node('select');currency.setAttribute('aria-label','Valuta');
    for(const c of ['kr','€','$','£']){const option=node('option',c);option.value=c;currency.append(option);}currency.value=draft.currency;currency.onchange=()=>{draft.currency=currency.value;remember();preview();};currencyLabel.append(currency);top.append(currencyLabel);view.append(top);
    const layout=node('div',null,'price-game-layout'),left=node('div'),list=node('div',null,'price-game-rounds');
    const add=button('＋ Legg til vare',()=>{draft.rounds.push(row());selected=draft.rounds.length-1;remember();renderRows();preview();list.lastElementChild.querySelector('input').focus();},'wide');add.dataset.priceAdd='';left.append(list,add);
    const right=node('div',null,'price-game-preview'),tools=node('div',null,'price-game-preview-tools'),choose=node('select');choose.setAttribute('aria-label','Forhåndsvis vare');choose.onchange=()=>{selected=Number(choose.value);preview();};tools.append(choose);
    for(const [text,value] of [['Spørsmål',false],['Fasit',true]]){const b=button(text,()=>{answer=value;preview();});b.dataset.priceAnswer=value;tools.append(b);}
    right.append(node('strong','Forhåndsvisning'),node('img'),tools,node('p','Dette er bare en forhåndsvisning. Visning på skjermen starter når du velger et ferdig lysbilde.'));
    layout.append(left,right);view.append(layout,node('p',null,'price-game-summary'));
    const dest=node('div',null,'price-game-destination');
    if(target){const f=meetingFolders.find(f=>f.id===target.folderId);dest.append(node('p','Oppdaterer konkurransen i '+(f?.name||'en fjernet mappe')+'.'));
    }else{
      const label=node('label','Legg lysbildene i møtemappe'),select=node('select');select.dataset.priceDestination='';
      for(const f of meetingFolders){const option=node('option',f.name);option.value=f.id;select.append(option);}
      const option=node('option','＋ Ny møtemappe');option.value='new';select.append(option);select.value=meetingSelected||meetingFolders[0]?.id||'new';label.append(select);
      const name=field('Navn på ny møtemappe',draft.title,()=>{});name.input.dataset.priceFolderName='';name.input.maxLength=100;name.input.oninput=null;name.label.hidden=select.value!=='new';select.onchange=()=>name.label.hidden=select.value!=='new';dest.append(label,name.label);
    }
    const err=node('p',null,'price-game-error');err.setAttribute('role','alert');
    const actions=node('div',null,'price-game-actions');const save=button(target?'Oppdater lysbilder':'Lag lysbilder',generate,'primary');save.dataset.priceGenerate='';
    actions.append(save,button('Ny konkurranse',()=>{if(!confirm('Starte en tom kladd? Ferdige lysbilder i møtemappene beholdes.'))return;draft={title:'Gjett prisen',currency:'kr',rounds:[row()]};target=null;selected=0;answer=false;remember();render(container);},'subtle'));
    view.append(dest,err,actions);renderRows();preview();
  }
  async function edit(folderId,itemId,slideId){
    await ready;const item=meetingFolders.find(f=>f.id===folderId)?.items.find(i=>i.id===itemId);if(!item?.priceGame)return;
    draft={title:item.title,currency:item.priceGame.currency,rounds:structuredClone(item.priceGame.rounds)};target={folderId,itemId};
    const slide=item.slides.find(s=>s.id===slideId);selected=Math.max(0,draft.rounds.findIndex(r=>r.id===slide?.priceRound?.id));answer=slide?.priceRound?.answer===true;
    remember();ProMaxFeatures.showTab('price-game');
  }
  window.ProMaxPriceGameUI={render,edit,ready};
})();
