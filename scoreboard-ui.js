/* Local entertainment scoreboard; edits publish only while this board is live. */
(() => {
  const model=()=>ProMaxScoreboard.normalize(settings.scoreboard);
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const button=(text,id,action,cls)=>{const node=el('button',text,cls);node.type='button';node.id=id;node.onclick=action;return node;};
  let root=null,rows=new Map();
  function sync(){
    if(state.scoreboard){state.scoreboard=structuredClone(model());paint();}
    if(root?.isConnected)draw();
  }
  function change(operation){
    if(ProMaxControls.busy)return;
    const value=model();operation(value);settings.scoreboard=ProMaxScoreboard.normalize(value);save();sync();
  }
  function show(){
    stopTimer();ProMaxFeatures.externalCue();state={text:'',black:false,pdf:null,scoreboard:structuredClone(model())};
    $('live-label').textContent='Poengtavle';paint();draw();
  }
  const confirmDialog=el('dialog',null,'score-confirm');confirmDialog.id='score-confirm';
  const question=el('h2'),hint=el('p','Du kan angre endringen med Ctrl+Z.'),actions=el('div',null,'dialog-actions');let confirmed=null;
  actions.append(button('Avbryt','score-confirm-cancel',()=>confirmDialog.close()),button('Bekreft','score-confirm-accept',()=>{confirmDialog.close();confirmed?.();},'primary'));
  confirmDialog.append(question,hint,actions);document.body.append(confirmDialog);
  function confirmChange(text,action){question.textContent=text;confirmed=action;confirmDialog.showModal();$('score-confirm-cancel').focus();}
  function field(label,input){const wrap=el('label',null,'score-field');wrap.append(el('span',label),input);return wrap;}
  function render(view){
    root=el('section',null,'score-controls');root.id='score-controls';rows=new Map();
    const head=el('div',null,'score-heading'),intro=el('div');intro.append(el('span','UNDERHOLDNINGSKVELD','eyebrow'),el('h2','Poengtelling'));
    head.append(intro,button('Vis poengtavle','score-show',show,'primary'));root.append(head,el('p','Start med tre lag, eller tilpass antallet. Poengene lagres automatisk. Når tavlen er live, vises endringene med en gang.','feature-help'));
    const options=el('div',null,'score-options'),title=el('input');title.id='score-title';title.maxLength=80;title.onchange=()=>change(b=>b.title=title.value);
    const step=el('input');step.id='score-step';step.type='number';step.min=1;step.max=10000;step.step=1;
    step.onchange=()=>{const n=Number(step.value);if(!step.value.trim()||!Number.isSafeInteger(n)||n<1||n>10000){notify('Velg et helt poengsteg fra 1 til 10 000.');step.value=model().step;return;}change(b=>b.step=n);};
    options.append(field('Tittel på skjermen',title),field('Poeng per klikk',step));root.append(options);
    const tools=el('div',null,'score-tools'),rank=el('input');rank.id='score-ranked';rank.type='checkbox';rank.onchange=()=>change(b=>b.ranked=rank.checked);
    const rankLabel=el('label',null,'score-order');rankLabel.append(rank,document.createTextNode('Vis lederlaget først på skjermen'));
    tools.append(rankLabel,button('↶ Angre','score-undo',()=>ProMaxControls.undo()),button('Nullstill poeng','score-reset',()=>confirmChange('Nullstille alle poengene?',()=>change(b=>b.teams.forEach(t=>t.score=0))),'subtle'));root.append(tools);
    const list=el('div',null,'score-team-list');list.id='score-team-list';root.append(list);
    const footer=el('div',null,'score-footer');footer.append(button('＋ Legg til lag','score-add',()=>{change(b=>{if(b.teams.length<ProMaxScoreboard.MAX_TEAMS)b.teams.push({id:uid(),name:'Lag '+(b.teams.length+1),score:0});});const last=list.lastElementChild?.querySelector('input');last?.focus();last?.select();}),el('span','','score-summary'));root.append(footer);
    const status=el('p',null,'score-output-status');status.id='score-output-status';status.setAttribute('role','status');root.append(status,el('small','Minuspoeng er tillatt. Skriv inn et nøyaktig poengtall ved behov. Ctrl+Z angrer; Ctrl+Shift+Z gjør om. Angrehistorikken varer til appen lukkes.'));
    view.replaceChildren(root);draw();
  }
  function draw(){
    if(!root?.isConnected)return;const value=model(),active=document.activeElement;
    const set=(id,v)=>{if($(id)!==active)$(id).value=v;};set('score-title',value.title);set('score-step',value.step);$('score-ranked').checked=value.ranked;
    $('score-add').disabled=value.teams.length>=ProMaxScoreboard.MAX_TEAMS;
    root.querySelector('.score-summary').textContent=value.teams.length+' lag · opptil '+ProMaxScoreboard.MAX_TEAMS;
    const list=$('score-team-list'),keep=new Set(value.teams.map(t=>t.id));
    for(const [id,row] of rows)if(!keep.has(id)){row.remove();rows.delete(id);}
    value.teams.forEach((team,index)=>{
      let row=rows.get(team.id);
      if(!row){
        row=el('div',null,'score-team-row');row.dataset.teamId=team.id;
        const number=el('span',null,'score-row-number'),name=el('input');name.className='score-name';name.maxLength=40;name.id='score-name-'+team.id;
        name.onchange=()=>change(b=>b.teams.find(t=>t.id===team.id).name=name.value);
        const controls=el('div',null,'score-adjust'),total=el('input');total.className='score-value';total.type='number';total.step=1;total.min=-ProMaxScoreboard.MAX_SCORE;total.max=ProMaxScoreboard.MAX_SCORE;total.id='score-value-'+team.id;
        total.onchange=()=>{const n=Number(total.value);if(!total.value.trim()||!Number.isSafeInteger(n)||Math.abs(n)>ProMaxScoreboard.MAX_SCORE){notify('Skriv et helt poengtall fra −999 999 til 999 999.');total.value=model().teams.find(t=>t.id===team.id).score;return;}change(b=>b.teams.find(t=>t.id===team.id).score=n);};
        const adjust=direction=>change(b=>{const t=b.teams.find(t=>t.id===team.id),next=t.score+direction*b.step;if(Math.abs(next)>ProMaxScoreboard.MAX_SCORE){notify('Poenggrensen er nådd.');return;}t.score=next;});
        const minus=button('−','score-minus-'+team.id,()=>adjust(-1)),plus=button('+','score-plus-'+team.id,()=>adjust(1),'primary');minus.classList.add('score-minus');plus.classList.add('score-plus');
        const remove=button('Fjern','score-remove-'+team.id,()=>{if(model().teams.length<=2)return;confirmChange('Fjerne «'+model().teams.find(t=>t.id===team.id).name+'»?',()=>{change(b=>{if(b.teams.length>2)b.teams=b.teams.filter(t=>t.id!==team.id);});$('score-add')?.focus();});},'subtle score-remove');
        controls.append(minus,total,plus);row.append(number,name,controls,remove);rows.set(team.id,row);
      }
      row.querySelector('.score-row-number').textContent=String(index+1).padStart(2,'0');
      const name=row.querySelector('.score-name'),total=row.querySelector('.score-value');if(name!==active)name.value=team.name;if(total!==active)total.value=team.score;
      name.setAttribute('aria-label','Navn på lag '+(index+1));total.setAttribute('aria-label','Poeng for '+team.name);
      for(const [cls,label] of [['score-minus','Trekk fra'],['score-plus','Legg til']]){const b=row.querySelector('.'+cls);b.textContent=(cls==='score-minus'?'−':'+')+value.step;b.setAttribute('aria-label',label+' '+value.step+' poeng: '+team.name);}
      row.querySelector('.score-remove').disabled=value.teams.length<=2;
      if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);
    });
    $('score-output-status').textContent=state.scoreboard?(state.black?'Poengtavlen er skjult med blackout.':(nativeOutputActive||output&&!output.closed?'Poengtavlen er live på presentasjonsskjermen.':'Poengtavlen er klar i forhåndsvisningen. Slå på «Presentation off» for å vise den på storskjermen.')):'Trykk «Vis poengtavle» når poengene skal på skjermen.';
  }
  window.ProMaxScores={render,sync};
  // Score changes must also follow a global undo/redo, without sending another cue.
  const originalPaint=paint;paint=function(){originalPaint();if(root?.isConnected)draw();};
  for(const id of ['previous','next']){const original=$(id).onclick;$(id).onclick=function(e){if(!state.scoreboard)return original.call(this,e);};}
})();
