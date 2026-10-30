/* Saved score model and the same audience renderer for preview, browser and native output. */
(function(root){
  const MAX_TEAMS=64,MAX_SCORE=999999;
  const css=typeof document==='undefined'?null:new URL('scoreboard.css',document.currentScript.src).href;
  function normalize(value){
    const source=value&&typeof value==='object'?value:{},ids=new Set();
    const input=Array.isArray(source.teams)?source.teams.slice(0,MAX_TEAMS):[];
    const teams=input.filter(t=>t&&typeof t==='object').map((t,i)=>{
      let id=typeof t.id==='string'&&t.id.length<=128&&t.id?t.id:'team-'+(i+1);
      const base=id.slice(0,96);let suffix=1;while(ids.has(id))id=base+'-'+ ++suffix;ids.add(id);
      return {id,name:typeof t.name==='string'&&t.name.trim()?t.name.trim().slice(0,40):'Lag '+(i+1),score:Number.isSafeInteger(t.score)?Math.max(-MAX_SCORE,Math.min(MAX_SCORE,t.score)):0};
    });
    while(teams.length<2){let id='team-'+(teams.length+1);while(ids.has(id))id+='-';ids.add(id);teams.push({id,name:'Lag '+(teams.length+1),score:0});}
    if(!Array.isArray(source.teams))teams.push({id:'team-3',name:'Lag 3',score:0});
    return {title:typeof source.title==='string'&&source.title.trim()?source.title.trim().slice(0,80):'Poengtavle',teams,step:Number.isSafeInteger(source.step)&&source.step>0&&source.step<=10000?source.step:1,ranked:source.ranked===true};
  }
  function standings(value){
    const board=normalize(value),sorted=[...board.teams].sort((a,b)=>b.score-a.score),ranks=new Map();
    sorted.forEach((team,index)=>{if(!ranks.has(team.score))ranks.set(team.score,index+1);});
    return (board.ranked?sorted:board.teams).map(team=>({...team,rank:ranks.get(team.score)}));
  }
  function render(doc,container,value){
    const old=container.querySelector('.score-stage');
    if(!value.scoreboard){if(old){old.remove();delete container.dataset.mediaKey;delete container.dataset.cueKey;}return false;}
    const theme=new URL('theme.css',css).href;
    if(![...doc.querySelectorAll('link[rel=stylesheet]')].some(link=>link.href===theme)){const link=doc.createElement('link');link.rel='stylesheet';link.href=theme;doc.head.append(link);}
    if(!doc.getElementById('scoreboard-style')){const link=doc.createElement('link');link.id='scoreboard-style';link.rel='stylesheet';link.href=css;doc.head.append(link);}
    root.ProMaxYouTube?.release(doc);root.ProMaxYouTube?.park(doc);root.ProMaxPlayback?.clear(doc,container);
    const model=normalize(value.scoreboard),teams=standings(model);
    container.style.background='var(--pm-bg)';
    let stage=old;
    if(!stage){container.replaceChildren();stage=doc.createElement('section');stage.className='score-stage';container.append(stage);}
    stage.hidden=!!value.black;
    if(value.black){container.style.background='#000';return true;}
    const key=JSON.stringify(model);if(stage.dataset.board===key)return true;stage.dataset.board=key;
    stage.replaceChildren();
    const make=(tag,text,cls)=>{const el=doc.createElement(tag);el.className=cls;el.textContent=text;return el;};
    const frame=make('div','','score-frame'),top=make('div','','score-stage-top');
    top.append(make('span','PROMAX','score-brand'),make('span',teams.length+' LAG','score-team-count'));
    const title=make('h1',model.title,'score-stage-title'),grid=make('div','','score-grid');
    const columns=teams.length<=3?teams.length:teams.length<=8?4:teams.length<=15?5:teams.length<=24?6:8;
    const rows=Math.ceil(teams.length/columns);grid.style.setProperty('--score-columns',columns);grid.style.setProperty('--score-rows',rows);
    const digits=Math.max(...teams.map(t=>String(t.score).length));
    grid.style.setProperty('--score-number-size','min('+Math.min(12,40/columns,84/columns/(digits*.65))+'cqw,'+(22/rows)+'cqh)');
    grid.style.setProperty('--score-name-size','min('+Math.min(3.1,9/columns)+'cqw,'+(7/rows)+'cqh)');
    grid.style.setProperty('--score-padding','min(1.2cqw,'+(4/rows)+'cqh)');
    grid.style.setProperty('--score-gap','min(1.2cqh,'+(.2+1/rows)+'cqh)');
    for(const team of teams){const card=make('article','','score-tile');card.dataset.teamId=team.id;card.classList.toggle('score-leading',team.rank===1&&teams.some(t=>t.rank!==1));
      card.append(make('span',String(team.rank).padStart(2,'0'),'score-rank'),make('h2',team.name,'score-team-name'),make('strong',String(team.score),'score-total'));grid.append(card);}
    frame.append(top,title,grid);stage.append(frame);return true;
  }
  const api={normalize,standings,render,MAX_TEAMS,MAX_SCORE};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxScoreboard=api;
})(globalThis);
