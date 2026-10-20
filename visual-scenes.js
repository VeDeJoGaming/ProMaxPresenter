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
    ['pulse-grid','Pulse Grid','Energy','grid',['#9746df','#f1a7fb','#160b2b'],'Energetic']
  ].map(([id,name,category,scene,colors,mood],index)=>({id,name,category,kind:'scene',scene,colors,mood,seed:110+index}));
  function draw(ctx,preset,t,w,h){
    const c=preset.colors,e={a:.38,b:.7,c:1}[preset.variant||'a'],seed=preset.seed;
    const glow=(x,y,rx,ry,color,alpha)=>{
      ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);ctx.globalAlpha=alpha;
      const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(.3,color+'80');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
    };
    const line=(path,color,width,alpha)=>{ctx.save();ctx.lineJoin='round';ctx.lineCap='round';if(['neon','cross'].includes(preset.scene)){ctx.shadowColor=preset.colors[0];ctx.shadowBlur=w*.014;}ctx.beginPath();path();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.stroke();ctx.restore();};
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
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  window.ProMaxScenes={presets,draw};
})();
