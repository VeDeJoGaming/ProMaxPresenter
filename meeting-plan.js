/* A running sheet contains titles and planned timings, never lyrics or media paths. */
(function(root){
  const types={song:'Song',bible:'Bible',text:'Text',video:'Video',document:'PowerPoint',youtube:'YouTube'};
  const minutes=value=>Number.isInteger(value)&&value>=0&&value<=1440?value:null;
  const start=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?value:'';
  const text=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
  function normalize(value){
    if(!value||!Array.isArray(value.items)||value.items.length>1000)throw Error('A running sheet can contain up to 1,000 items.');
    const includeNotes=value.includeNotes===true;
    return {name:text(value.name)||'Untitled meeting',startTime:start(value.startTime),includeNotes,notes:includeNotes?text(value.notes,8000):'',items:value.items.map(item=>{
      if(!item||!Object.hasOwn(types,item.type))throw Error('The running sheet contains an invalid item.');
      return {id:text(item.id,128),title:text(item.title)||'Untitled item',type:item.type,plannedMinutes:minutes(item.plannedMinutes),missing:item.missing===true,notes:includeNotes?text(item.notes,8000):''};
    })};
  }
  function create(folder,catalog={},includeNotes=false){
    const indexes={song:new Map((catalog.songs||[]).map(s=>[s.id,s])),video:new Map((catalog.videos||[]).map(s=>[s.id,s])),document:new Map((catalog.documents||[]).map(s=>[s.id,s])),youtube:new Map((catalog.youtube||[]).map(s=>[s.id,s]))};
    return normalize({name:folder.name,startTime:folder.plannedStart,notes:folder.operatorNotes,includeNotes,items:folder.items.map(item=>{
      const source=indexes[item.type]?.get(item.type==='song'?item.songId:item.assetId);
      return {id:item.id,type:item.type,title:source?.title||source?.name||item.title,plannedMinutes:item.plannedMinutes,notes:item.operatorNotes,missing:!!indexes[item.type]&&!source};
    })});
  }
  function schedule(plan){
    let cursor=plan.startTime?Number(plan.startTime.slice(0,2))*60+Number(plan.startTime.slice(3)):null,total=0,untimed=0;
    const rows=plan.items.map(item=>{const duration=minutes(item.plannedMinutes),at=cursor;
      if(duration===null){untimed++;cursor=null;}else{total+=duration;if(cursor!==null)cursor+=duration;}
      return {...item,start:at,end:cursor};
    });
    return {rows,total,untimed,end:cursor};
  }
  function clock(value){if(value===null)return '—';const days=Math.floor(value/1440),time=value%1440;return String(Math.floor(time/60)).padStart(2,'0')+':'+String(time%60).padStart(2,'0')+(days?' (+'+days+'d)':'');}
  function durationLabel(value){if(value===null)return 'Not set';const hours=Math.floor(value/60),mins=value%60;return hours?hours+' h'+(mins?' '+mins+' min':''):mins+' min';}
  function summary(plan){const s=schedule(plan);return (s.untimed?'At least ':'')+durationLabel(s.total)+(s.untimed?' · '+s.untimed+' '+(s.untimed===1?'duration':'durations')+' not set':s.end!==null?' · Ends '+clock(s.end):'');}
  function toText(value){const plan=normalize(value),s=schedule(plan),lines=[plan.name,'Running order'+(plan.startTime?' · Starts '+plan.startTime:''),summary(plan),''];
    if(plan.notes)lines.push('Meeting notes: '+plan.notes,'');
    for(const [index,row]of s.rows.entries()){
      lines.push(`${index+1}. ${clock(row.start)} · ${row.title} · ${types[row.type]} · ${durationLabel(row.plannedMinutes)}${row.missing?' · Unavailable in library':''}`);
      if(row.notes)lines.push('   '+row.notes.replace(/\n/g,'\n   '));
    }
    lines.push('','Planned times only. A missing duration leaves later start times unknown.');return lines.join('\n');
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toHTML(value){const plan=normalize(value),s=schedule(plan);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>'+escape(plan.name)+'</title><style>'+`
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:11pt "Segoe UI",Arial,sans-serif;color:#231a17;line-height:1.5;margin:0}h1{font-size:24pt;line-height:1.2;margin:7px 0 12px;overflow-wrap:anywhere}.brand{font-size:9pt;letter-spacing:2px;color:#ad342b}header{border-bottom:3px solid #de6825;padding-bottom:16px;margin-bottom:20px}header p{margin:5px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th{text-align:left;font-size:9pt;color:#70564b;border-bottom:2px solid #decac0;padding:8px}th:first-child{width:15%}th:nth-child(2){width:65%}th:last-child{width:20%}td{padding:12px 8px;border-bottom:1px solid #e8dcd5;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}small{display:block;color:#70564b;font-size:9pt}.notes{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0 0;font-size:10pt}.meeting-notes{padding:12px;background:#faf3ee;border-left:3px solid #de6825;margin-bottom:18px}footer{margin-top:20px;color:#70564b;font-size:9pt}.missing{color:#a52e24}
    `+'</style></head><body><header><div class="brand">PROMAX PRESENTER · RUNNING ORDER</div><h1>'+escape(plan.name)+'</h1><p>'+(plan.startTime?'Starts '+escape(plan.startTime)+' · ':'')+escape(summary(plan))+'</p></header>'+(plan.notes?'<section class="meeting-notes"><b>Meeting notes</b><p class="notes">'+escape(plan.notes)+'</p></section>':'')+'<table><thead><tr><th>Start</th><th>Item</th><th>Duration</th></tr></thead><tbody>'+s.rows.map((row,i)=>'<tr><td>'+escape(clock(row.start))+'</td><td><b>'+escape((i+1)+'. '+row.title)+'</b><small>'+types[row.type]+(row.missing?' · <span class="missing">Unavailable in library</span>':'')+'</small>'+(row.notes?'<p class="notes">'+escape(row.notes)+'</p>':'')+'</td><td>'+escape(durationLabel(row.plannedMinutes))+'</td></tr>').join('')+'</tbody></table>'+(s.rows.length?'':'<p>This meeting is empty.</p>')+'<footer>Planned times only. A missing duration leaves later start times unknown. '+(plan.includeNotes?'Operator notes included.':'Operator notes excluded.')+'</footer></body></html>';
  }
  const api={types,minutes,start,normalize,create,schedule,clock,durationLabel,summary,toText,toHTML};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProMaxMeetingPlan=api;
})(globalThis);
