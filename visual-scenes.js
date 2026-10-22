/* Original scene families. The renderer receives a periodic phase and palette. */
(() => {
  const tau=Math.PI*2;
  const noise=(seed,index)=>{const x=Math.sin(seed*71.17+index*19.31)*43758.5453;return x-Math.floor(x);};
  const presets=[
    ['velocity-streams','Velocity Streams','Energy','streams',['#5276f4','#e0edff','#131c43'],'Energetic'],
    ['bloom-rays','Bloom Rays','Calm','bloom',['#569e92','#f3e7bd','#071c25'],'Calm'],
    ['neon-depth','Neon Depth','Energy','neon',['#148de8','#72e8ff','#041224'],'Energetic'],
    ['sacred-light','Sacred Light','Calm','cross',['#99a9da','#f5f3ff','#101326'],'Calm'],
    ['orbital-dust','Orbital Dust','Energy','orbit',['#c48724','#ffe0a1','#20130b'],'Energetic'],
    ['still-waters','Still Waters','Calm','ocean',['#e97644','#fff4e4','#2d2269'],'Calm'],
    ['aurora-curtains','Aurora Curtains','Calm','aurora',['#368e98','#bccdff','#171934'],'Calm'],
    ['pulse-grid','Pulse Grid','Energy','grid',['#9746df','#f1a7fb','#160b2b'],'Energetic'],
    ['dusk-ridges','Dusk Ridges','Nature','ridges',['#84719b','#ffd6a0','#101629'],'Calm'],
    ['tidal-caustics','Tidal Caustics','Nature','caustics',['#158d9a','#b9f3df','#061820'],'Calm'],
    ['petal-canopy','Petal Canopy','Nature','petals',['#b67f96','#fbe3bc','#201523'],'Calm'],
    ['boreal-mist','Boreal Mist','Atmosphere','mist',['#4c9b9b','#c8e1d8','#101b2a'],'Calm'],
    ['celestial-arcs','Celestial Arcs','Atmosphere','constellations',['#7892cc','#f1dfba','#101526'],'Calm'],
    ['lunar-eclipse','Lunar Eclipse','Cinematic','eclipse',['#b97851','#ffe8bf','#131828'],'Calm'],
    ['contour-dunes','Contour Dunes','Nature','dunes',['#bb8352','#f6d4a1','#211923'],'Calm'],
    ['luminous-vault','Luminous Vault','Cinematic','vault',['#707dc0','#f4c9a6','#151626'],'Calm']
  ].map(([id,name,category,scene,colors,mood],index)=>({id,name,category,kind:'scene',scene,colors,mood,seed:110+index}));
  function draw(ctx,preset,t,w,h){
    const c=preset.colors,e={a:.38,b:.7,c:1}[preset.variant||'a'],seed=preset.seed;
    const glow=(x,y,rx,ry,color,alpha)=>{
      ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);ctx.globalAlpha=alpha;
      const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(.3,color+'80');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
    };
    const line=(path,color,width,alpha)=>{ctx.save();ctx.lineJoin='round';ctx.lineCap='round';if(['neon','cross'].includes(preset.scene)){ctx.shadowColor=preset.colors[0];ctx.shadowBlur=w*.014;}ctx.beginPath();path();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.stroke();ctx.restore();};
    const look=Math.max(0,Math.min(2,preset.look??{a:0,b:1,c:2}[preset.variant||'a']));
    const at=(a,b,c)=>a+(b-a)*Math.min(look,1)+(c-b)*Math.max(look-1,0);
    const tint=(a,b,f)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-f)+parseInt(b.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('');
    ctx.fillStyle='#03050a';ctx.fillRect(0,0,1,1);
    switch(preset.scene){
      case 'streams': {
        const cy=.51+.025*Math.sin(t),spread=.22+e*.34;
        glow(.5,cy,.8,.23,c[0],.18+e*.2);
        ctx.globalCompositeOperation='screen';
        for(let i=0;i<68;i++){
          const side=i%2?-1:1,amount=(i/68)**1.3,offset=(.018+amount*spread)*side;
          const shimmer=.4+.6*(.5+.5*Math.sin(t*2+i*.57));
          const path=()=>{ctx.moveTo(-.05,cy+offset);ctx.bezierCurveTo(.22,cy+offset*.32,.36,cy+offset*.035,.5,cy+offset*.025);ctx.bezierCurveTo(.65,cy+offset*.04,.79,cy+offset*.55,1.05,cy+offset*1.8);};
          line(path,c[0],.01+e*.016,(.08+e*.1)*shimmer);
          line(path,i%4===0?c[1]:c[0],.0007+e*.0013,(.35+e*.6)*shimmer);
          const p=(noise(seed,i)+t/tau*2)%1,fade=Math.sin(p*Math.PI)**2;
          const x=p,y=cy+offset*((x-.5)*2)**2;
          glow(x,y,.045+.035*e,.003+.002*e,c[1],fade*(.35+e*.6));
        }
        ctx.globalCompositeOperation='source-over';break;
      }
      case 'bloom': {
        const source=.36+.15*Math.sin(t),rise=.95-e*.17;
        glow(source,rise,.75,.85,c[0],.18+e*.28);
        ctx.globalCompositeOperation='screen';
        for(let i=0;i<14;i++){
          const a=-1.8+i*.12+.075*Math.sin(t+i*.45),length=.52+e*.65,dx=Math.cos(a)*length,dy=Math.sin(a)*length;
          const g=ctx.createLinearGradient(source,rise,source+dx,rise+dy);g.addColorStop(0,c[1]+'a0');g.addColorStop(.38,c[i%2]+'40');g.addColorStop(1,c[0]+'00');
          ctx.fillStyle=g;ctx.globalAlpha=.15+e*.16;ctx.beginPath();ctx.moveTo(source-.025,rise);ctx.lineTo(source+dx-.09,rise+dy);ctx.lineTo(source+dx+.09,rise+dy);ctx.lineTo(source+.025,rise);ctx.closePath();ctx.fill();
        }
        glow(source,rise,.26,.32,c[1],.3+e*.3);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;break;
      }
      case 'neon': {
        const count=8,spread=.4+e*.45;
        glow(.5,.5,.75,.65,c[0],.1);
        for(let i=count-1;i>=0;i--){
          const wave=.5+.5*Math.sin(t-i*.53),width=.25+(i/count)*spread,height=.075+(i/count)*spread*.59;
          const x=.5-width/2,y=.5-height/2,r=Math.min(.032,height*.32);
          const path=()=>ctx.roundRect(x,y,width,height,r);
          const alpha=.3+(wave**2)*(.4+e*.6);
          line(path,c[0],.035,alpha*.32);line(path,c[0],.018,alpha*.55);
          const g=ctx.createLinearGradient(x,y,x+width,y+height);g.addColorStop(0,c[0]);g.addColorStop(.5,c[1]);g.addColorStop(1,c[0]);
          line(path,g,.005,Math.min(1,alpha));line(path,c[1],.0013,Math.min(1,alpha)*.9);
        }break;
      }
      case 'cross': {
        const x=.5+.008*Math.sin(t),top=.15,bottom=.8,bar=.37,width=.024;
        glow(x,.4,.3,.53,c[0],.2+e*.3);
        const path=()=>{ctx.moveTo(x-width,top);ctx.lineTo(x+width,top);ctx.lineTo(x+width,bar-width);ctx.lineTo(x+.125,bar-width);ctx.lineTo(x+.125,bar+width);ctx.lineTo(x+width,bar+width);ctx.lineTo(x+width,bottom);ctx.lineTo(x-width,bottom);ctx.lineTo(x-width,bar+width);ctx.lineTo(x-.125,bar+width);ctx.lineTo(x-.125,bar-width);ctx.lineTo(x-width,bar-width);ctx.closePath();};
        const pulse=.82+.18*Math.sin(t);
        line(path,c[0],.07,.25*e*pulse);line(path,c[1],.025,.35*e*pulse);
        if(preset.variant==='b'){ctx.beginPath();path();ctx.fillStyle=c[1];ctx.globalAlpha=.95;ctx.fill();ctx.globalAlpha=1;}
        line(path,c[1],.005,.85+e*.15);break;
      }
      case 'orbit': {
        ctx.save();ctx.translate(.5,.5);ctx.scale(1,w/h);
        for(let ring=0;ring<26;ring++){
          const radius=.045+ring*.022*(.65+e*.4),count=28+ring*5;
          for(let j=0;j<count;j++){
            const a=j/count*tau+t*(ring%2?1:-1)+noise(seed,ring)*tau;
            const spark=.25+.75*(.5+.5*Math.sin(t*2+j*.73+ring));
            ctx.globalAlpha=(.35+e*.65)*spark;ctx.fillStyle=j%11===0?c[1]:c[0];
            ctx.beginPath();ctx.arc(Math.cos(a)*radius,Math.sin(a)*radius,.001+noise(seed,j+ring*99)*.0015,0,tau);ctx.fill();
            if(j%3===0){ctx.beginPath();ctx.arc(0,0,radius,a,a+.035+e*.03);ctx.lineWidth=.0007;ctx.strokeStyle=c[0];ctx.stroke();}
          }
        }ctx.restore();ctx.globalAlpha=1;break;
      }
      case 'ocean': {
        const horizon=.59,sky=ctx.createLinearGradient(0,0,0,horizon);
        sky.addColorStop(0,c[2]);sky.addColorStop(.65,c[0]+'b0');sky.addColorStop(1,c[0]);ctx.fillStyle=sky;ctx.fillRect(0,0,1,horizon);
        const sx=.52+.035*Math.sin(t),sy=horizon+.07-e*.07;
        glow(sx,horizon,.43,.35,c[1],.34+e*.15);
        ctx.save();ctx.beginPath();ctx.rect(0,0,1,horizon);ctx.clip();ctx.fillStyle=c[1];ctx.globalAlpha=.92;ctx.beginPath();ctx.ellipse(sx,sy,.047,.047*w/h,0,0,tau);ctx.fill();ctx.restore();
        const sea=ctx.createLinearGradient(0,horizon,0,1);sea.addColorStop(0,c[0]);sea.addColorStop(.4,c[2]);sea.addColorStop(1,'#06080f');ctx.fillStyle=sea;ctx.fillRect(0,horizon,1,1-horizon);
        for(let row=0;row<52;row++){
          const depth=row/51,y=horizon+(1-horizon)*depth**1.75;
          const wave=.001+depth*depth*(.012+.016*e),reflection=Math.max(0,1-Math.abs(y-sy)/.7);
          for(let j=0;j<18;j++){
            const x=j/17+.024*Math.sin(t+row*.45+j*.6),yy=y+wave*Math.sin(t*2+j*.9+row*.55);
            const distance=Math.abs(x-sx),beam=Math.max(0,1-distance/(.028+depth*.24));
            line(()=>{ctx.moveTo(x-.028,yy);ctx.bezierCurveTo(x-.01,yy-wave*.35,x+.012,yy+wave*.35,x+.04,yy);},beam>.01?c[1]:c[0],.001+depth*.003,beam>.01?beam*reflection*(.14+e*.28):.09+depth*.09);
          }
        }break;
      }
      case 'aurora': {
        glow(.6,.35,.85,.6,c[2],.6);
        for(let i=0;i<42;i++){
          const x=i/41,y=.28+.13*Math.sin(x*6+t)+.065*Math.cos(x*11-t);
          const g=ctx.createLinearGradient(0,y-.07,0,y+.48);g.addColorStop(0,c[1]+'00');g.addColorStop(.17,c[1]+'75');g.addColorStop(.35,c[0]+'60');g.addColorStop(1,c[2]+'00');
          line(()=>{ctx.moveTo(x,y-.07);ctx.bezierCurveTo(x+.04*Math.sin(t+x*3),y+.1,x-.05*Math.cos(t+x*2),y+.32,x+.02,y+.48);},g,.038,.25+e*.38);
        }
        glow(.4+.12*Math.sin(t),.42,.65,.4,c[0],.24);break;
      }
      case 'grid': {
        const vanishing=.5+.04*Math.sin(t),horizon=.43;
        glow(vanishing,horizon,.65,.25,c[0],.2+e*.2);
        for(let i=-18;i<=18;i++){
          const x=vanishing+i*.11;
          line(()=>{ctx.moveTo(vanishing+i*.009,horizon);ctx.lineTo(x,1.2);},c[0],.0015,.35+e*.4);
        }
        for(let i=0;i<24;i++){
          const p=(i/24+t/tau)%1,fade=Math.sin(p*Math.PI)**2,y=horizon+(1-horizon)*p*p;
          line(()=>{ctx.moveTo(0,y);ctx.lineTo(1,y);},i%4===0?c[1]:c[0],.0015+p*.0015,fade*(.25+e*.65));
        }
        for(let i=0;i<3;i++)glow(vanishing+.2*Math.sin(t+i*2),horizon,.08,.018,c[1],.25*e);
        break;
      }
      case 'ridges': {
        const sky=ctx.createLinearGradient(0,0,0,1);sky.addColorStop(0,tint(c[2],'#000000',.52));sky.addColorStop(.65,tint(c[0],c[2],.58));sky.addColorStop(1,c[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,1,1);
        const sx=at(.77,.23,.79),sy=at(.24,.31,.22)+.007*Math.sin(t);
        glow(sx,sy,.28,.34,c[0],.25);glow(sx,sy,.085,.15,c[1],.12);
        ctx.fillStyle=c[1];ctx.globalAlpha=.52;ctx.beginPath();ctx.ellipse(sx,sy,.024,.024*w/h,0,0,tau);ctx.fill();ctx.globalAlpha=1;
        for(let layer=0;layer<6;layer++){
          const base=.58+layer*.078,amp=.035+layer*.005,points=[];
          for(let j=0;j<=100;j++){const x=j/100;const y=base+Math.sin(x*9+layer*1.8)*amp+Math.sin(x*22+layer*.7)*amp*.28+Math.sin(x*4+layer+t)*.006;points.push([x,y]);}
          ctx.beginPath();ctx.moveTo(0,1);for(const [x,y] of points)ctx.lineTo(x,y);ctx.lineTo(1,1);ctx.closePath();ctx.fillStyle=tint(c[0],c[2],.37+layer*.105);ctx.fill();
          line(()=>{points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));},c[1],.001,.025+at(.02,.05,.1));
          glow(.3+.24*Math.sin(t+layer),base+.04,.7,.022,c[0],at(.06,.1,.16));
        }break;
      }
      case 'caustics': {
        ctx.fillStyle=tint(c[2],'#000000',.5);ctx.fillRect(0,0,1,1);
        glow(.12,.9,.65,.45,c[0],at(.22,.33,.4));glow(.93,.18,.5,.5,c[0],at(.09,.18,.29));
        ctx.globalCompositeOperation='screen';
        ctx.save();ctx.translate(.5,.5);ctx.rotate(at(-.3,.4,-.6));ctx.scale(at(1.5,1,.7),at(1.5,1,.7));ctx.translate(-.5,-.5);
        for(let axis=0;axis<2;axis++)for(let row=0;row<26;row++){
          const path=()=>{for(let j=0;j<=70;j++){const p=j/70,base=row/25,warp=.024*Math.sin(p*18+t+row*.8)+.018*Math.sin(p*8-t*2+row*.6);const x=axis?base+warp:p,y=axis?p:base+warp;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}};
          const edge=Math.abs(row/25-.5)*2;line(path,row%4?c[0]:c[1],.0022,at(.08,.18,.32)*(.15+edge*edge));
        }
        ctx.restore();
        ctx.globalCompositeOperation='source-over';break;
      }
      case 'petals': {
        ctx.fillStyle=tint(c[2],'#000000',.55);ctx.fillRect(0,0,1,1);
        glow(.05,.08,.6,.65,c[0],.22);glow(.98,.83,.45,.45,c[0],at(.02,.13,.2));
        for(let side=0;side<2;side++){
          const visibility=side?at(.12,.75,1):1;
          const branch=at(.035,.09,.16);
          line(()=>{for(let j=0;j<=60;j++){const y=j/60,x=branch+.08*Math.sin(y*3)+.005*Math.sin(t+y*4),xx=side?1-x:x;j?ctx.lineTo(xx,y):ctx.moveTo(xx,y);}},c[0],.002,.3*visibility);
          for(let i=0;i<23;i++){
            const f=i/22,y=.015+f*1.03,bx=branch+.08*Math.sin(f*3),x=(side?1-bx:bx)+.005*Math.sin(t+i*.6),angle=(side?-1:1)*(.4+(i%2)*1.1)+.035*Math.sin(t+i);
            const radius=.045+noise(seed,i)*at(.03,.055,.08);
            ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,w/h);ctx.globalAlpha=(.45+noise(seed,i+33)*.28)*visibility;
            const g=ctx.createRadialGradient(-radius*.3,0,0,0,0,radius);g.addColorStop(0,tint(c[1],c[0],.45));g.addColorStop(1,tint(c[0],c[2],.45));ctx.fillStyle=g;
            ctx.beginPath();ctx.ellipse(0,0,radius,radius*.33,0,0,tau);ctx.fill();ctx.restore();
          }
        }break;
      }
      case 'mist': {
        ctx.fillStyle=tint(c[2],'#000000',.55);ctx.fillRect(0,0,1,1);
        glow(.25,.17,.7,.4,c[0],.15);
        for(let i=0;i<18;i++){
          const y=at(.15,.18,.12)+i*.007;
          const path=()=>{for(let j=0;j<=80;j++){const x=j/80,yy=y+.055*Math.sin(x*5+Math.sin(t)*.5+i*.08)+.021*Math.sin(x*11+Math.cos(t)+i*.15);j?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}};
          line(path,i%6?c[0]:c[1],.022,at(.06,.11,.16));
          line(()=>{ctx.moveTo(0,.89+i*.004);ctx.bezierCurveTo(.24,.91+.02*Math.sin(t+i*.1),.65,.84+.02*Math.cos(t),1,.87+i*.004);},c[0],.016,at(.015,.04,.06));
        }
        for(let i=0;i<35;i++){const x=noise(seed,i),y=noise(seed+1,i)*.36;glow(x,y,.0015,.002*w/h,c[1],(.1+.15*Math.sin(t+i)**2)*at(.4,.7,1));}break;
      }
      case 'constellations': {
        ctx.fillStyle=tint(c[2],'#000000',.6);ctx.fillRect(0,0,1,1);
        glow(.18,.14,.5,.35,c[0],.17);glow(.88,.88,.45,.4,c[0],at(.02,.1,.18));
        ctx.save();ctx.translate(.5,.5);ctx.scale(1,w/h);
        for(let ring=0;ring<7;ring++){
          const radius=.35+ring*.045,offset=at(-.17,.05,.14)+.006*Math.sin(t+ring),start=-Math.PI+.3+ring*.2;
          line(()=>ctx.ellipse(offset,-.01,radius,radius*.64,at(-.38,.18,-.24),start,start+at(1.7,2.5,3.5)),c[0],.0012,at(.3,.5,.75));
          for(let i=0;i<9;i++){
            const a=start+i/8*at(1.7,2.5,3.5),x=offset+Math.cos(a)*radius,y=Math.sin(a)*radius*.64;
            glow(x,y,.0018,.0018,c[1],.35+.2*Math.sin(t+ring+i)**2);
          }
        }ctx.restore();break;
      }
      case 'eclipse': {
        ctx.fillStyle=tint(c[2],'#000000',.57);ctx.fillRect(0,0,1,1);
        const x=at(.22,.77,.79)+.006*Math.sin(t),y=at(.24,.27,.72),r=at(.13,.18,.22);
        glow(x,y,r*2.2,r*2.2*w/h,c[0],.35);glow(x,y,r*1.35,r*1.35*w/h,c[1],.16);
        ctx.save();ctx.translate(x,y);ctx.scale(1,w/h);
        const disc=ctx.createRadialGradient(-r*.4,-r*.4,0,0,0,r);disc.addColorStop(0,c[1]);disc.addColorStop(1,c[0]);ctx.fillStyle=disc;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(0,0,r,0,tau);ctx.fill();ctx.globalAlpha=1;
        ctx.beginPath();ctx.arc(0,0,r,0,tau);ctx.clip();ctx.fillStyle=tint(c[2],'#000000',.88);ctx.beginPath();ctx.arc(r*at(.25,.12,.5)+.007*Math.cos(t),-r*.16,r*.99,0,tau);ctx.fill();ctx.restore();
        for(let i=0;i<34;i++){const xx=noise(seed,i),yy=noise(seed+3,i);glow(xx,yy,.001,.001*w/h,c[1],.12+.06*Math.sin(t+i));}break;
      }
      case 'dunes': {
        ctx.fillStyle=tint(c[2],'#000000',.57);ctx.fillRect(0,0,1,1);
        glow(.18,.87,.7,.25,c[0],at(.15,.23,.32));glow(.93,.15,.35,.3,c[0],at(.03,.1,.2));
        for(let i=0;i<44;i++){
          const d=i/43,y=.66+d*.43;
          line(()=>{for(let j=0;j<=100;j++){const x=j/100,yy=y+at(.04,.08,.12)*Math.sin(x*6+d*3+.16*Math.sin(t))+.026*Math.sin(x*12-d*4+.2*Math.cos(t));j?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}},i%7?c[0]:c[1],i%7?.0009:.0014,at(.25,.42,.62)*(.45+d*.55));
        }break;
      }
      case 'vault': {
        ctx.fillStyle=tint(c[2],'#000000',.55);ctx.fillRect(0,0,1,1);
        glow(.09,.7,.2,.7,c[0],.24);glow(.91,.7,.2,.7,c[0],.24);
        for(let i=0;i<9;i++){
          const r=at(.34,.26,.18)+i*.045+.003*Math.sin(t+i*.3),cy=at(.64,.65,.69)+i*.012,rise=r*at(.95,1.2,1.45),visibility=Math.max(0,Math.min(1,at(3.5,6.5,9)-i));
          const path=()=>{ctx.moveTo(.5-r,1.1);ctx.lineTo(.5-r,cy);ctx.bezierCurveTo(.5-r,cy-rise*.55,.5-r*.55,cy-rise,.5,cy-rise);ctx.bezierCurveTo(.5+r*.55,cy-rise,.5+r,cy-rise*.55,.5+r,cy);ctx.lineTo(.5+r,1.1);};
          line(path,c[0],.018,.15*visibility);line(path,i%3?c[0]:c[1],.0025,(.45+.1*Math.sin(t+i*.5))*visibility);
          if(i>2)for(let j=0;j<5;j++){const y=cy+j*.09;line(()=>{ctx.moveTo(.5-r,y);ctx.lineTo(.5-r+.026,y-.01);ctx.moveTo(.5+r,y);ctx.lineTo(.5+r-.026,y-.01);},c[1],.0007,.14*visibility);}
        }break;
      }
    }
    if(['ridges','caustics','petals','mist','constellations','eclipse','dunes','vault'].includes(preset.scene)){
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      const shade=ctx.createRadialGradient(.5,.49,.08,.5,.49,.53);shade.addColorStop(0,'#000000a0');shade.addColorStop(.6,'#00000045');shade.addColorStop(1,'#00000000');ctx.fillStyle=shade;ctx.fillRect(0,0,1,1);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  window.ProMaxScenes={presets,draw};
})();
