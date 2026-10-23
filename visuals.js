/* Original procedural backgrounds. No downloads, codecs or remote assets. */
(() => {
  const presets = [
    ['golden-hour','Golden Hour','Soft','clouds',['#bd6829','#f0c476','#694027']],
    ['ember-clouds','Ember Clouds','Soft','clouds',['#8d2925','#db6535','#612621']],
    ['rose-mist','Rose Mist','Soft','clouds',['#9a4e53','#dd9290','#513333']],
    ['ivory-drift','Ivory Drift','Soft','clouds',['#b3a58e','#e1ccb0','#6c5b47']],
    ['amber-silk','Amber Silk','Soft','silk',['#c57a36','#f2c275','#805231']],
    ['crimson-silk','Crimson Silk','Soft','silk',['#9f302e','#d65c48','#662523']],
    ['copper-flow','Copper Flow','Soft','silk',['#b26c46','#d5a777','#63432f']],
    ['soft-ribbons','Soft Ribbons','Soft','ribbons',['#a26f50','#d6b085','#664f3a']],
    ['light-of-dawn','Light of Dawn','Atmosphere','rays',['#9d6732','#edc88b','#513421']],
    ['cathedral-light','Cathedral Light','Atmosphere','rays',['#79654f','#e3c79f','#41362a']],
    ['floating-gold','Floating Gold','Atmosphere','bokeh',['#b88744','#f8d394','#705234']],
    ['candlelight','Candlelight','Atmosphere','bokeh',['#a45629','#e9ac57','#5d3020']],
    ['quiet-embers','Quiet Embers','Atmosphere','embers',['#b6532c','#f5be6b','#7d3026']],
    ['starlit-warmth','Starlit Warmth','Atmosphere','stars',['#bbaa8d','#f0dbb5','#73614b']],
    ['desert-tides','Desert Tides','Minimal','dunes',['#ab7951','#e0b888','#654631']],
    ['sandstone','Sandstone','Minimal','dunes',['#857360','#cdb395','#51463a']],
    ['golden-ripples','Golden Ripples','Minimal','waves',['#9f793f','#e4c482','#58462d']],
    ['warm-horizon','Warm Horizon','Minimal','waves',['#a05439','#d99b68','#603829']],
    ['gentle-halo','Gentle Halo','Minimal','halo',['#a68757','#e6ce9b','#594831']],
    ['burnished-orbit','Burnished Orbit','Minimal','halo',['#9c4f35','#e2a66c','#613321']],
    ['molten-glass','Molten Glass','Cinematic','glass',['#ed4e24','#ffe3a0','#7c2418']],
    ['champagne-prism','Champagne Prism','Cinematic','glass',['#dcad76','#fff0cb','#65503c']],
    ['scarlet-veil','Scarlet Veil','Cinematic','veil',['#d93626','#ffb17a','#6d211b']],
    ['luminous-satin','Luminous Satin','Cinematic','veil',['#d28a3e','#ffe6a6','#674221']],
    ['afterglow','Afterglow','Cinematic','horizon',['#e86435','#ffd3a0','#722a1d']],
    ['first-light','First Light','Cinematic','horizon',['#d9a977','#fff1c8','#665040']],
    ['fireline','Fireline','Cinematic','frame',['#ef502a','#ffde94','#762719']],
    ['gilded-frame','Gilded Frame','Cinematic','frame',['#cfa24e','#fff0ba','#625026']],
    ['open-sanctuary','Open Sanctuary','Architecture','arches',['#d88441','#ffe2a3','#603824']],
    ['ivory-vault','Ivory Vault','Architecture','arches',['#bfa58a','#fff0cf','#554638']],
    ['amber-windows','Amber Windows','Architecture','windows',['#d89445','#ffe1a0','#67401f']],
    ['copper-windows','Copper Windows','Architecture','windows',['#c76b42','#ffc69b','#652f24']]
  ].map(([id,name,category,kind,colors],index)=>({id,name,category,kind,colors,seed:index+1}));
  presets.push({id:'dynamic-glass',name:'Dynamic Glass',category:'Glass',kind:'dynamic-glass',colors:['#e87b08','#ffd35a','#6c2500'],seed:42});
  ['Prism Columns','Obsidian Ribbons','Liquid Cathedral','Aurora Glass','Crystal Cascade','Midnight Facets'].forEach((name,index)=>presets.push({id:name.toLowerCase().replace(/ /g,'-'),name,category:'Glass',kind:'prismatic-glass',pattern:index,colors:[['#df7a17','#ffe2a0','#552207'],['#d24768','#ffd3df','#371028'],['#6278c5','#d0e1ff','#151a41'],['#0ba68d','#b5ffe7','#082d3b'],['#805aca','#e6d5ff','#251644'],['#1c7daf','#c6f1ff','#081c2c']][index],seed:70+index}));
  const aliases={'ember-clouds':'golden-hour','rose-mist':'golden-hour','ivory-drift':'golden-hour','crimson-silk':'amber-silk','copper-flow':'amber-silk','cathedral-light':'light-of-dawn','candlelight':'floating-gold','sandstone':'desert-tides','warm-horizon':'golden-ripples','burnished-orbit':'gentle-halo','champagne-prism':'molten-glass','luminous-satin':'scarlet-veil','first-light':'afterglow','gilded-frame':'fireline','ivory-vault':'open-sanctuary','copper-windows':'amber-windows','obsidian-ribbons':'prism-columns','aurora-glass':'liquid-cathedral','crystal-cascade':'midnight-facets'};
  Object.assign(aliases,{'soft-ribbons':'amber-silk','light-of-dawn':'bloom-rays','quiet-embers':'floating-gold','desert-tides':'golden-hour','golden-ripples':'still-waters','scarlet-veil':'amber-silk','afterglow':'still-waters','fireline':'neon-depth','open-sanctuary':'neon-depth','amber-windows':'prism-columns','aurora-curtains':'golden-hour','pulse-grid':'velocity-streams'});
  for(let i=presets.length-1;i>=0;i--)if(aliases[presets[i].id])presets.splice(i,1);
  presets.push(...(window.ProMaxScenes?.presets||[]).filter(p=>!aliases[p.id]));
  presets.push({id:'paint-sweeps',name:'Paint Sweeps',category:'Paint',kind:'paint',colors:['#2969a0','#c7a6da','#101b35'],seed:201,mood:'Calm',tags:['brush','pigment','paint','sweeps','texture']});
  presets.push({id:'signal-weave',name:'Signal Weave',category:'Energy',kind:'signal',colors:['#fa2009','#ff4b10','#170400'],seed:202,mood:'Energetic',tags:['red','led','matrix','lights']});
  presets.push({id:'chromatic-current',name:'Chromatic Current',category:'Glass',kind:'chromatic',colors:['#ec2509','#1809fa','#060414'],seed:203,mood:'Calm',tags:['red','blue','reflections','liquid']});
  presets.push({id:'winter-reverie',name:'Winter Reverie',category:'Nature',kind:'winter',colors:['#8c7caa','#ffd0de','#20233e'],seed:204,mood:'Calm',fixedPalette:true,tags:['winter','snow','river','realistic','landscape']});
  presets.sort((a,b)=>Number(b.kind==='scene')-Number(a.kind==='scene'));
  const resolveId=id=>{let result=id;for(let i=0;i<4&&aliases[result];i++)result=aliases[result];return result;};
  const palettes={gold:['#e87b08','#ffd35a','#6c2500'],blue:['#157dd0','#7ddfff','#082558'],purple:['#8249c9','#e2acff','#35105e'],rose:['#d64277','#ffadc9','#64152d'],green:['#159c79','#a2f9c7','#084536'],white:['#9baaba','#f4f8ff','#3c4857']};
  function variant(section=''){return /^(pre[- ]?(chorus|refreng))/i.test(section)?'c':/chorus|refrain|refreng/i.test(section)?'b':/bridge|\bbro\b/i.test(section)?'c':'a';}
  const tau=Math.PI*2;
  const fraction=n=>n-Math.floor(n);
  const random=(seed,n)=>fraction(Math.sin(seed*71.17+n*19.31)*43758.5453);
  function draw(canvas,preset,phase){
    phase=fraction(phase);
    if(window.ProMaxOptics?.draw(canvas,preset,phase))return;
    const ctx=canvas.getContext('2d'); if(!ctx)return;
    const w=canvas.width,h=canvas.height,t=phase*tau,s=preset.seed,c=preset.colors;
    const energy={a:.65,b:.85,c:1}[preset.variant||'a'];
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#100d0b';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.scale(w,h);
    const glow=(x,y,r,color,alpha=1)=>{
      ctx.save();ctx.globalAlpha=alpha;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
    };
    const stroke=(color,width,alpha)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;};
    glow(.5,.7,.85,c[2],.65);
    if(!['scene','dynamic-glass','prismatic-glass'].includes(preset.kind)){ctx.translate(.5,.5);ctx.scale(.85+energy*.25,.85+energy*.25);ctx.translate(-.5,-.5);}
    switch(preset.kind){
      case 'scene': window.ProMaxScenes.draw(ctx,preset,t,w,h);break;
      case 'clouds':
        for(let i=0;i<7;i++)glow(.5+.5*Math.sin(t+(i+s)*1.3),.5+.38*Math.cos(t+(i+s)*1.7),.32+random(s,i)*.3,c[i%3],.42);
        glow(.15+.12*Math.sin(t),.82,.45,c[1],.28);
        break;
      case 'silk': case 'ribbons':
        for(let i=0;i<36;i++){
          ctx.beginPath();const y=i/35;
          ctx.moveTo(-.15,y+.16*Math.sin(t+i*.06));
          ctx.bezierCurveTo(.25,y-.4*Math.sin(t+i*.032+s),.65,y+.4*Math.cos(t+i*.043),1.15,y+.13*Math.cos(t+i*.06));
          stroke(c[i%3],preset.kind==='silk'?.026:.008,.07+.055*Math.sin(i/35*Math.PI));ctx.stroke();
        }
        break;
      case 'rays':
        glow(.5,-.15,.8,c[0],.4);
        for(let i=0;i<13;i++){
          const x=(i-6)*.09+.12*Math.sin(t+i*.4);
          const gradient=ctx.createLinearGradient(0,0,0,1);gradient.addColorStop(0,c[1]+'38');gradient.addColorStop(1,c[1]+'00');
          ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(.5+x*.3,-.15);ctx.lineTo(.5+x-.09,1.2);ctx.lineTo(.5+x+.03,1.2);ctx.closePath();ctx.fill();
        }
        break;
      case 'bokeh': case 'embers': case 'stars':
        for(let i=0;i<55;i++){
          const angle=t+random(s,i)*tau,x=random(s,i+200)+.07*Math.sin(angle),y=random(s,i+400)+.09*Math.cos(angle);
          const pulse=.45+.55*(.5+.5*Math.sin(t+random(s,i+600)*tau));
          const radius=preset.kind==='bokeh'?.013+random(s,i+800)*.05:preset.kind==='stars'?.0015+random(s,i)*.002:.002+random(s,i)*.006;
          if(preset.kind==='bokeh')glow(x,y,radius,c[i%3],pulse*.5);
          else {ctx.globalAlpha=pulse*.55;ctx.fillStyle=c[i%3];ctx.beginPath();ctx.ellipse(x,y,radius,radius*w/h,0,0,tau);ctx.fill();}
        }
        break;
      case 'dunes':
        for(let i=0;i<9;i++){
          const y=.45+i*.07;ctx.beginPath();ctx.moveTo(-.1,1.2);ctx.lineTo(-.1,y);
          ctx.bezierCurveTo(.2,y-.15+.05*Math.sin(t+i*.4),.65,y+.15+.05*Math.cos(t+i*.4),1.1,y-.05);
          ctx.lineTo(1.1,1.2);ctx.closePath();ctx.fillStyle=c[i%3];ctx.globalAlpha=.1;ctx.fill();
        }
        break;
      case 'waves':
        for(let i=0;i<24;i++){
          ctx.beginPath();for(let j=0;j<=80;j++){const x=j/80,y=.58+i*.023+.045*Math.sin(x*7+t+i*.13)+.025*Math.cos(x*11-t+i*.1);if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
          stroke(c[i%3],.002,.16);ctx.stroke();
        }
        break;
      case 'halo':
        const x=.5+.06*Math.cos(t),y=.5+.06*Math.sin(t);glow(x,y,.55,c[0],.16);
        for(let i=0;i<24;i++){ctx.beginPath();ctx.ellipse(x,y,.14+i*.014,.14+i*.014,Math.sin(t)*.12,0,tau);stroke(c[i%3],.002,.045+.025*Math.sin(t+i*.2));ctx.stroke();}
        break;
      case 'dynamic-glass': {
        ctx.fillStyle='#020202';ctx.fillRect(0,0,1,1);
        const strength={a:.48,b:.76,c:1}[preset.variant||'a'];
        for(let i=0;i<48;i++){
          const x=i/47+.003*Math.sin(t+i*.43),width=.010+random(42,i)*.015;
          ctx.save();ctx.beginPath();ctx.rect(x,0,width,1);ctx.clip();
          for(let j=0;j<3;j++){
            const y=.5+.65*Math.sin(t+j*tau/3+Math.floor(i/7)*.9+i*.045);
            const g=ctx.createRadialGradient(x+width*.65,y,0,x+width*.65,y,.26+strength*.23);
            g.addColorStop(0,preset.colors[1]);g.addColorStop(.22,preset.colors[0]);g.addColorStop(.62,preset.colors[2]);g.addColorStop(1,'#000000');
            ctx.globalAlpha=strength;ctx.fillStyle=g;ctx.fillRect(x,0,width,1);
          }
          const rib=ctx.createLinearGradient(x,0,x+width,0);rib.addColorStop(0,'#000000f5');rib.addColorStop(.32,'#00000000');rib.addColorStop(.72,'#00000020');rib.addColorStop(1,'#000000f8');
          ctx.globalAlpha=1;ctx.fillStyle=rib;ctx.fillRect(x,0,width,1);ctx.restore();
          stroke(c[0],.0007,.24+strength*.18);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1);ctx.stroke();ctx.globalAlpha=1;
        }
        break;
      }
      case 'prismatic-glass': {
        const pattern=preset.pattern||0,energy={a:.48,b:.78,c:1}[preset.variant||'a'];
        ctx.fillStyle='#030508';ctx.fillRect(0,0,1,1);
        glow(.2+.12*Math.sin(t),.65+.2*Math.cos(t),.65,c[0],.16*energy);
        glow(.82+.1*Math.cos(t),.25+.18*Math.sin(t),.55,c[1],.09*energy);
        const count=[30,24,18,36,42,28][pattern];
        for(let i=-1;i<count+1;i++){
          const x=i/count,width=(.55+random(preset.seed,i+5)*.35)/count;
          const sway=(pattern===1?.035:pattern===2?.055:.007)*Math.sin(t+i*.17);
          const tilt=pattern===1?.17*Math.sin(t):pattern===4?.04*Math.cos(t):0;
          ctx.save();ctx.beginPath();ctx.moveTo(x+tilt,0);
          ctx.bezierCurveTo(x+sway,.3,x-sway,.7,x-tilt,1);
          ctx.lineTo(x-tilt+width,1);ctx.bezierCurveTo(x-sway+width,.7,x+sway+width,.3,x+tilt+width,0);ctx.closePath();ctx.clip();
          ctx.fillStyle=c[2]+'60';ctx.fillRect(x-.2,0,width+.4,1);
          ctx.globalCompositeOperation='screen';
          for(let j=0;j<3;j++){
            const crest=.5+.57*Math.sin(t+j*tau/3+i*.10+(pattern===3?Math.sin(i*.18):0));
            const radius=(pattern===5?.14:pattern===2?.42:.27)+energy*.12;
            const g=ctx.createLinearGradient(0,crest-radius,0,crest+radius);
            g.addColorStop(0,c[2]+'00');g.addColorStop(.22,c[0]+'24');g.addColorStop(.43,c[0]+'c0');g.addColorStop(.5,c[1]);g.addColorStop(.59,c[0]+'a0');g.addColorStop(.8,c[2]+'30');g.addColorStop(1,c[2]+'00');
            ctx.globalAlpha=energy*(pattern===5?.5:.8);ctx.fillStyle=g;ctx.fillRect(x-.2,0,width+.4,1);
          }
          ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
          const rib=ctx.createLinearGradient(x,0,x+width,0);rib.addColorStop(0,'#000000f0');rib.addColorStop(.2,c[1]+'20');rib.addColorStop(.45,'#00000000');rib.addColorStop(.78,'#00000050');rib.addColorStop(.94,c[1]+'50');rib.addColorStop(1,'#000000f8');ctx.fillStyle=rib;ctx.fillRect(x-.1,0,width+.2,1);ctx.restore();
          const edge=ctx.createLinearGradient(0,0,0,1);edge.addColorStop(0,c[1]+'00');edge.addColorStop(.35+.1*Math.sin(t+i*.1),c[1]+'a0');edge.addColorStop(1,c[0]+'00');
          ctx.beginPath();ctx.moveTo(x+tilt+width,0);ctx.bezierCurveTo(x+sway+width,.3,x-sway+width,.7,x-tilt+width,1);ctx.strokeStyle=edge;ctx.lineWidth=pattern===5?.0012:.0008;ctx.globalAlpha=.5*energy;ctx.stroke();ctx.globalAlpha=1;
        }
        break;
      }
      case 'glass':
        glow(.12,.7,.65,c[0],.7);glow(.88,.14,.5,c[1],.4);
        for(let i=0;i<7;i++){
          ctx.save();ctx.translate((i-3)*.23+.5+.06*Math.sin(t+i*.7),.5);ctx.rotate(-.36+.08*Math.sin(t+i*.3));
          const g=ctx.createLinearGradient(-.08,0,.12,0);g.addColorStop(0,c[0]+'08');g.addColorStop(.5,c[1]+'12');g.addColorStop(.88,c[0]+'55');g.addColorStop(1,c[1]+'b0');
          ctx.fillStyle=g;ctx.fillRect(-.1,-1,.2,2);
          const edge=ctx.createLinearGradient(0,-.7,0,.7);edge.addColorStop(0,c[1]+'00');edge.addColorStop(.5,c[1]+'a0');edge.addColorStop(1,c[1]+'00');
          ctx.fillStyle=edge;ctx.fillRect(.098,-.7,.003,1.4);ctx.restore();
        }
        break;
      case 'veil':
        glow(.85,.2,.7,c[0],.5);glow(.12,.9,.65,c[1],.2);
        for(let i=0;i<18;i++){
          const y=.1+i*.053,drift=.12*Math.sin(t+i*.09+s);
          ctx.beginPath();ctx.moveTo(-.2,y+drift);
          ctx.bezierCurveTo(.1,y-.45,.6,y+.5+.08*Math.cos(t),1.2,y-.15-drift);
          ctx.bezierCurveTo(.6,y+.52+.08*Math.cos(t),.1,y-.4,-.2,y+.04+drift);
          const g=ctx.createLinearGradient(0,y-.15,1,y+.3);g.addColorStop(0,c[0]+'60');g.addColorStop(.45,c[1]+'10');g.addColorStop(.82,c[1]+'90');g.addColorStop(1,c[0]+'10');
          ctx.fillStyle=g;ctx.fill();stroke(c[1],.001,.11);ctx.stroke();
        }
        break;
      case 'horizon':
        const horizon=.62+.06*Math.sin(t);
        const sky=ctx.createLinearGradient(0,0,0,1);sky.addColorStop(0,'#100b09');sky.addColorStop(.36,c[2]);sky.addColorStop(horizon,c[0]);sky.addColorStop(.8,c[2]);sky.addColorStop(1,'#100b09');ctx.fillStyle=sky;ctx.fillRect(0,0,1,1);
        glow(.65+.12*Math.sin(t),horizon,.4,c[1],.6);
        for(let i=0;i<8;i++){const y=horizon+.04+i*.055;ctx.beginPath();ctx.moveTo(0,1.1);ctx.lineTo(0,y);ctx.bezierCurveTo(.3,y-.04*Math.sin(t+i*.3),.65,y+.03*Math.cos(t+i*.2),1,y);ctx.lineTo(1,1.1);ctx.closePath();ctx.fillStyle=i%2?c[2]:'#170f0b';ctx.globalAlpha=.27;ctx.fill();}
        break;
      case 'frame':
        glow(.05,.15,.6,c[0],.8);glow(.95,.85,.5,c[1],.55);
        for(let i=0;i<7;i++){
          const inset=.025+i*.019;
          ctx.save();ctx.translate(.5,.5);ctx.rotate(.035*Math.sin(t+i*.3));
          const g=ctx.createLinearGradient(-.5,-.5,.5,.5);g.addColorStop(0,c[1]);g.addColorStop(.32,c[0]+'28');g.addColorStop(.68,c[0]+'28');g.addColorStop(1,c[1]);
          ctx.strokeStyle=g;ctx.lineWidth=i===0?.008:.002;ctx.globalAlpha=.75-i*.08;ctx.strokeRect(-.5+inset,-.5+inset,1-inset*2,1-inset*2);ctx.restore();
        }
        break;
      case 'arches':
        glow(.5,.1,.7,c[0],.4);glow(.88,.85,.5,c[1],.2);
        for(let i=0;i<8;i++){
          const inset=i*.027,shift=.014*Math.sin(t+i*.35),left=.06+inset+shift,right=.94-inset+shift,top=.025+inset;
          const arch=()=>{ctx.beginPath();ctx.moveTo(left,1.1);ctx.lineTo(left,.42);ctx.bezierCurveTo(left,top,.5,top-.14,right,.42);ctx.lineTo(right,1.1);};
          arch();stroke(c[0],.015,.22);ctx.stroke();
          arch();const g=ctx.createLinearGradient(0,0,1,1);g.addColorStop(0,c[1]+'c0');g.addColorStop(.5,c[0]+'50');g.addColorStop(1,c[1]+'b0');ctx.strokeStyle=g;ctx.lineWidth=.003;ctx.globalAlpha=.75-i*.06;ctx.stroke();
        }
        break;
      case 'windows':
        glow(.85,.3,.85,c[0],.65);
        for(let i=0;i<6;i++){
          const x=(i-2)*.24+.09*Math.sin(t+i*.4),y=.02+.06*Math.cos(t+i*.3);
          ctx.save();ctx.transform(1,-.18,.15,1,x,y);
          const g=ctx.createLinearGradient(0,0,.22,0);g.addColorStop(0,c[2]+'90');g.addColorStop(.7,c[0]+'40');g.addColorStop(1,c[1]+'d0');ctx.fillStyle=g;ctx.fillRect(0,-.3,.19,1.6);
          stroke(c[1],.002,.6);ctx.strokeRect(0,-.3,.19,1.6);ctx.restore();
        }
        break;
    }
    ctx.restore();ctx.globalAlpha=1;
    // Keep the lyric area quiet and readable at every frame.
    const vignette=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.7);
    vignette.addColorStop(0,'#00000030');vignette.addColorStop(1,'#00000080');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    const texture=grain(canvas.ownerDocument);ctx.globalAlpha=.13;ctx.fillStyle=ctx.createPattern(texture,'repeat');ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
  }
  const textures=new WeakMap();
  function grain(doc){
    if(textures.has(doc))return textures.get(doc);
    const tile=doc.createElement('canvas');tile.width=64;tile.height=64;
    const ctx=tile.getContext('2d'),pixels=ctx.createImageData(64,64);
    for(let i=0;i<4096;i++){const value=Math.floor(random(17,i)*255);pixels.data.set([value,value,value,30],i*4);}
    ctx.putImageData(pixels,0,0);textures.set(doc,tile);return tile;
  }
  const stillFrames=new Map();
  window.addEventListener?.('promax-visual-assets-ready',()=>{stillFrames.clear();for(const canvas of document.querySelectorAll('canvas.visual-canvas'))canvas.drawFrame?.();});
  const findPreset=(id,options={})=>id==='solid'?{id:'solid',kind:'solid',colors:[options.color||'#181818',options.color||'#181818',options.color||'#181818'],seed:0,mood:'Calm'}:presets.find(p=>p.id===id);
  function mount(container,id,animated=true,options={}){
    let preset=findPreset(id,options);if(!preset)return null;
    if(preset.kind==='bundled-svg')return window.ProMaxBundledVisuals.mount(container,preset,animated);
    let canvas=container.ownerDocument.createElement('canvas');
    const isOutput=container.id==='stage',isGallery=!!container.closest('.visual-option');
    let dirty=true,quality=options.renderQuality||'auto',maxWidth=isOutput?(quality==='performance'?1280:quality==='quality'?1920:1600):isGallery?640:480;
    const size=()=>{const width=animated?Math.max(isGallery?640:320,Math.min(maxWidth,container.clientWidth||960)):320;const height=Math.max(1,Math.round(width*(isOutput?(container.clientHeight||width*9/16)/(container.clientWidth||width):9/16)));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;dirty=true;}};
    size();container.prepend(canvas);
    let surface=null;
    if(animated&&window.ProMaxOptics?.families[preset.id]!==undefined){try{surface=window.ProMaxOptics.surface(canvas,preset);}catch{const replacement=container.ownerDocument.createElement('canvas');replacement.width=canvas.width;replacement.height=canvas.height;canvas.replaceWith(replacement);canvas=replacement;}}
    canvas.className='media visual-canvas';canvas.setAttribute('aria-hidden','true');
    let stopped=false,frame=0,last=0,rendered=0,windowFrames=0,windowStarted=performance.now(),slowWindows=0,fastWindows=0;
    const fps=isOutput?60:isGallery?24:30,interval=1000/fps;
    const getLook=options=>{
      const selected=options.visualPalette||(['dynamic-glass','prismatic-glass'].includes(preset.kind)?options.glassPalette:'original')||'original';
      const valid=value=>/^#[0-9a-f]{6}$/i.test(value);
      let colors=palettes[selected]||preset.colors;
      if(preset.fixedPalette)colors=preset.colors;
      if(selected==='custom'&&Array.isArray(options.visualColors)&&options.visualColors.length===3&&options.visualColors.every(valid))colors=options.visualColors;
      if(selected==='solid'&&valid(options.visualColor)){
        const rgb=[1,3,5].map(i=>parseInt(options.visualColor.slice(i,i+2),16));
        const mix=(amount,white)=>'#'+rgb.map(v=>Math.round(v*(1-amount)+white*amount).toString(16).padStart(2,'0')).join('');
        colors=[options.visualColor,mix(.65,255),mix(.8,0)];
      }
      if(preset.kind==='solid')colors=Array(3).fill(valid(options.color)?options.color:'#181818');
      const motion=options.visualMotion||'auto';
      const chosen=options.glassAuto===false?(options.glassVariant||'a'):variant(options.section);
      const basePeriod=motion==='calm'?100000:motion==='energetic'?20000:motion==='normal'?60000:preset.mood==='Energetic'?24000:80000;
      return {colors:[...colors],variant:chosen,period:basePeriod*{a:1,b:.8,c:.6}[chosen]};
    };
    let look=getLook(options),started=0;
    const numeric=value=>({look:{a:0,b:1,c:2}[value.variant],colors:value.colors.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)),period:value.period});
    let current=numeric(look),from=current,previous=performance.now(),phase=(Date.now()%look.period)/look.period,progress=1,crossfade=null,scratch=null;
    const key=value=>JSON.stringify([value.colors,value.variant,value.period]);
    const sample=now=>{
      const oldPeriod=current.period;
      progress=started?Math.min(1,Math.max(0,(now-started)/5000)):1;
      const ease=progress*progress*(3-2*progress),target=numeric(look);
      current={look:from.look+(target.look-from.look)*ease,period:from.period+(target.period-from.period)*ease,colors:from.colors.map((color,i)=>color.map((channel,j)=>channel+(target.colors[i][j]-channel)*ease))};
      phase=fraction(phase+Math.max(0,now-previous)/((oldPeriod+current.period)*.5));previous=now;
      return current;
    };
    canvas.setLook=next=>{
      const nextQuality=next.renderQuality||'auto';if(nextQuality!==quality){quality=nextQuality;maxWidth=isOutput?(quality==='performance'?1280:quality==='quality'?1920:1600):maxWidth;size();}
      const target=getLook(next);if(key(target)===key(look))return;
      const now=performance.now();sample(now);from=current;look=target;started=now;dirty=true;
    };
    canvas.setPreset=(nextId,next={})=>{
      const nextPreset=findPreset(nextId,next);if(!nextPreset)return false;
      if(nextPreset.id===preset.id){canvas.setLook(next);return true;}
      const now=performance.now();dirty=true;render(now,false);
      let old={...current,preset,phase,at:now};
      if(crossfade){
        if(surface?.snapshot())old={...old,snapshot:true};
        else{const bitmap=canvas.ownerDocument.createElement('canvas');bitmap.width=canvas.width;bitmap.height=canvas.height;bitmap.getContext('2d').drawImage(canvas,0,0);old={...old,bitmap};}
      }
      preset=nextPreset;look=getLook(next);current=numeric(look);from=current;started=0;progress=1;previous=now;
      crossfade={from:old,at:now};windowFrames=0;windowStarted=now;slowWindows=0;fastWindows=0;dirty=true;canvas.dataset.visualId=nextId;canvas.setLook(next);return true;
    };
    canvas.getLookState=()=>({look:current.look,phase,period:current.period,progress,backgroundProgress:crossfade?Math.min(1,(performance.now()-crossfade.at)/1500):1});
    canvas.getRenderStats=()=>({frames:rendered,targetFps:fps,width:canvas.width,height:canvas.height,quality,preset:preset.id,transitioning:!!crossfade});
    const paint2D=(target,layer)=>{
      if(layer.bitmap){const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(layer.bitmap,0,0,target.width,target.height);return;}
      const colors=layer.colors.map(color=>'#'+color.map(channel=>Math.round(channel*255).toString(16).padStart(2,'0')).join(''));
      if(layer.preset.kind==='solid'){const ctx=target.getContext('2d');ctx.fillStyle=colors[0];ctx.fillRect(0,0,target.width,target.height);}
      else draw(target,{...layer.preset,colors,look:layer.look,variant:['a','b','c'][Math.round(layer.look)]},layer.phase);
    };
    const render=(now,countFrame=true)=>{
      if(!dirty&&preset.kind==='solid'&&!crossfade&&(!started||now-started>=5000))return;
      dirty=false;
      sample(now);
      if(countFrame){rendered++;windowFrames++;}
      let mix=1;
      if(crossfade){const amount=Math.min(1,Math.max(0,(now-crossfade.at)/1500));mix=amount*amount*(3-2*amount);const old=crossfade.from;old.phase=fraction(old.phase+Math.max(0,now-old.at)/old.period);old.at=now;if(amount===1)crossfade=null;}
      const target={...current,preset,phase,weight:mix};
      if(surface){surface.render(crossfade?[{...crossfade.from,weight:1-mix},target]:[target]);return;}
      paint2D(canvas,target);
      if(crossfade){if(!scratch)scratch=canvas.ownerDocument.createElement('canvas');scratch.width=canvas.width;scratch.height=canvas.height;paint2D(scratch,crossfade.from);const ctx=canvas.getContext('2d');ctx.globalAlpha=1-mix;ctx.drawImage(scratch,0,0);ctx.globalAlpha=1;}
    };
    canvas.drawFrame=()=>{dirty=true;render(performance.now(),false);};
    canvas.captureFrame=()=>{canvas.drawFrame();return canvas.toDataURL();};
    const tick=now=>{
      if(stopped)return;
      if(!canvas.isConnected){canvas.stop();return;}
      if(!isOutput&&(container.ownerDocument.hidden||!isGallery&&container.ownerDocument.querySelector('dialog[open]'))){last=now;frame=requestAnimationFrame(tick);return;}
      const elapsed=now-last;
      if(elapsed>=interval-.5){render(now);last=last?last+Math.max(1,Math.floor((elapsed+.5)/interval))*interval:now;}
      if(isOutput&&quality==='auto'&&preset.kind!=='solid'&&now-windowStarted>=1500){
        const actual=windowFrames*1000/(now-windowStarted);
        slowWindows=actual<48?slowWindows+1:0;fastWindows=actual>57?fastWindows+1:0;
        if(slowWindows>=2&&maxWidth>960){maxWidth=Math.max(960,Math.round(maxWidth*.85));size();slowWindows=0;}
        else if(fastWindows>=4&&maxWidth<1600){maxWidth=Math.min(1600,Math.round(maxWidth/0.85));size();fastWindows=0;}
        windowFrames=0;windowStarted=now;
      }
      frame=requestAnimationFrame(tick);
    };
    const stillKey=JSON.stringify([id,look.colors,look.variant,canvas.width,canvas.height]);
    if(!animated&&stillFrames.has(stillKey)){const saved=stillFrames.get(stillKey);stillFrames.delete(stillKey);stillFrames.set(stillKey,saved);canvas.getContext('2d').drawImage(saved,0,0);}
    else{render(performance.now());if(!animated){const saved=canvas.ownerDocument.createElement('canvas');saved.width=canvas.width;saved.height=canvas.height;saved.getContext('2d').drawImage(canvas,0,0);stillFrames.set(stillKey,saved);if(stillFrames.size>96)stillFrames.delete(stillFrames.keys().next().value);}}
    const observer=animated&&typeof ResizeObserver!=='undefined'?new ResizeObserver(size):null;observer?.observe(container);
    if(animated)frame=requestAnimationFrame(tick);
    canvas.stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer?.disconnect();surface?.stop();};
    return canvas;
  }
  function renderGlass(doc,container,value,isOutput){
    if(window.ProMaxBundledVisuals?.render(doc,container,value,isOutput))return true;
    if(value.black||value.pdf||value.video||value.image||value.youtube||value.media&&!value.settings.visual)return false;
    let canvas=container.querySelector('canvas[data-glass]'),text=container.querySelector('.screen-text');
    const id=presets.some(p=>p.id===value.settings.visual)?value.settings.visual:'solid',options={...value.settings,section:value.section};
    if(!canvas&&id==='solid')return false;
    if(!canvas){const solidStart=!!text&&!container.querySelector('.media');ProMaxPlayback.clear(doc,container);container.replaceChildren();canvas=mount(container,solidStart?'solid':id,true,options);canvas.dataset.glass='true';canvas.dataset.visualId=solidStart?'solid':id;text||=doc.createElement('div');text.className='screen-text';text.style.zIndex=2;container.append(text);}
    if(canvas.dataset.visualId!==id)canvas.setPreset(id,options);
    canvas.setLook({...value.settings,section:value.section});container.dataset.mediaKey=value.settings.visual;container.style.background='#000';
    ProMaxPlayback.renderLiveText(text,value);
    text.style.textAlign=value.settings.align;text.style.fontSize=isOutput?value.settings.fontSize+'vw':container.clientWidth*value.settings.fontSize/100+'px';return true;
  }
  const backgroundStates=new WeakMap();
  function beginBackground(doc,container,value){
    const bare=!value.black&&!value.pdf&&!value.video&&!value.image&&!value.youtube;
    const key=bare?value.settings.visual||value.media?.url||'solid:'+value.settings.color:null;
    const previous=backgroundStates.get(container);
    if(previous?.key===key)return ()=>{};
    const record={key};backgroundStates.set(container,record);
    if(!bare||!previous?.key)return ()=>{};
    const motion=presets.some(p=>p.id===value.settings.visual);
    const bundled=presets.some(p=>p.id===value.settings.visual&&p.kind==='bundled-svg');
    if(!bundled&&((motion||!value.media)&&container.querySelector('canvas[data-glass]')||motion&&!container.querySelector('.media')))return ()=>{};
    // File backgrounds use one composited still frame; text is never part of the fade.
    const snapshot=doc.createElement('canvas'),width=Math.min(1600,container.clientWidth||320);
    snapshot.width=width;snapshot.height=Math.max(1,Math.round(width*(container.clientHeight||width*9/16)/(container.clientWidth||width)));
    const context=snapshot.getContext('2d',{alpha:false});context.fillStyle=doc.defaultView.getComputedStyle(container).backgroundColor;context.fillRect(0,0,snapshot.width,snapshot.height);
    for(const element of container.querySelectorAll('.media,.shade')){
      const style=doc.defaultView.getComputedStyle(element);context.globalAlpha=Number(style.opacity);
      if(element.classList.contains('shade')){context.fillStyle=style.backgroundColor;context.fillRect(0,0,snapshot.width,snapshot.height);continue;}
      element.drawFrame?.();
      const w=element.videoWidth||element.naturalWidth||element.width,h=element.videoHeight||element.naturalHeight||element.height;
      if(!w||!h)continue;
      try{const scale=element.tagName==='CANVAS'?null:Math.max(snapshot.width/w,snapshot.height/h);if(scale)context.drawImage(element,(snapshot.width-w*scale)/2,(snapshot.height-h*scale)/2,w*scale,h*scale);else context.drawImage(element,0,0,snapshot.width,snapshot.height);}catch{}
    }
    context.globalAlpha=1;
    return ()=>{
      for(const old of container.querySelectorAll('.background-fade'))old.stop();
      let timeout,begun=false,stopped=false;
      snapshot.stop=()=>{if(stopped)return;stopped=true;clearTimeout(timeout);snapshot.getAnimations().forEach(a=>a.cancel());snapshot.remove();snapshot.width=1;snapshot.height=1;};
      snapshot.className='media background-fade';snapshot.style.cssText='z-index:1;pointer-events:none';container.append(snapshot);
      const start=()=>{if(begun||stopped)return;begun=true;clearTimeout(timeout);if(!snapshot.isConnected||backgroundStates.get(container)!==record)return;const animation=snapshot.animate([{opacity:1},{opacity:0}],{duration:1500,easing:'ease-in-out',fill:'forwards'});animation.onfinish=()=>snapshot.stop();};
      const media=container.querySelector('img.media,video.media');
      if(media&&(media.tagName==='IMG'?!media.complete:media.readyState<2)){media.addEventListener(media.tagName==='IMG'?'load':'loadeddata',start,{once:true});media.addEventListener('error',start,{once:true});timeout=setTimeout(start,6000);}else start();
    };
  }
  window.ProMaxVisuals={presets,draw,mount,variant,palettes,renderGlass,resolveId,beginBackground};
})();
