/* Local GPU optics: signed distance geometry, procedural atmosphere and reflective water.
   Every motion term is periodic. No external media or page content is used. */
(() => {
  const families={'golden-hour':0,'amber-silk':1,'floating-gold':2,'starlit-warmth':3,'gentle-halo':4,'molten-glass':5,'dynamic-glass':5,'prism-columns':5,'liquid-cathedral':5,'midnight-facets':5,'velocity-streams':6,'bloom-rays':7,'neon-depth':8,'sacred-light':9,'orbital-dust':10,'still-waters':11};
  Object.assign(families,{'dusk-ridges':12,'tidal-caustics':13,'petal-canopy':14,'boreal-mist':15,'celestial-arcs':16,'lunar-eclipse':17,'contour-dunes':18,'luminous-vault':19});
  families.solid=-1;
  const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment=`
precision highp float;
uniform vec2 resolution;
uniform float families[4],seeds[4];
uniform sampler2D previousFrame;
uniform float times[4],looks[4],weights[4];
uniform vec3 primaries[4],highlights[4],depths[4];
float time,look,family,seed;
vec3 primary,highlight,depth;
const float PI=3.14159265359;
const float TAU=6.28318530718;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.7;a*=.5;}return v;}
float at(vec3 values){return values.x+(values.y-values.x)*clamp(look,0.,1.)+(values.z-values.y)*clamp(look-1.,0.,1.);}
float gaussian(float d,float width){return exp(-d*d/(width*width));}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
vec3 light(float d,float glow,float strength){return primary*exp(-abs(d)/glow)*strength+highlight*exp(-abs(d)/(glow*.12))*strength*.65;}
vec3 atmosphere(vec2 uv){return depth*.08+primary*.025*gaussian(length(uv-vec2(.5,.5)),.7);}
vec3 cloud(vec2 uv){
  vec2 drift=vec2(sin(time),cos(time))*.16;
  float scale=3.4;
  vec2 p=uv*vec2(1.8,1.)*scale+drift;
  vec2 warp=vec2(fbm(p+seed),fbm(p+4.7));float n=fbm(p+warp*2.4);
  vec2 source=vec2(.5,.8);
  float beam=gaussian(length((uv-source)*vec2(.9,1.)),.8);
  float field=smoothstep(.28,.77,n)*beam;
  float edge=pow(max(0.,1.-abs(n-.55)*4.),3.)*beam;
  return depth*.07+primary*field*at(vec3(.3,1.2,2.1))+highlight*edge*at(vec3(.03,.16,.34));
}
vec3 silk(vec2 uv){
  vec2 p=uv-vec2(.5);float angle=-.5;
  p=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*p;
  float waves=3.;
  float fold=p.y*waves*7.+1.6*sin(p.x*4.+sin(time)*.5)+.5*cos(p.x*7.-cos(time));
  float n=sin(fold),edge=pow(.5+.5*cos(fold),12.);
  float illumination=.3+.7*smoothstep(-.6,.6,p.x);
  vec3 color=mix(depth*.16,primary*at(vec3(.15,.55,.85)),smoothstep(-.9,.7,n));
  return color*illumination+highlight*edge*at(vec3(.08,.48,.85))*illumination;
}
vec3 particles(vec2 uv,bool stars){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);vec3 color=depth*.035;
  float count=at(vec3(22.,65.,115.));
  for(int i=0;i<115;i++){
    float id=float(i);float visibility=1.-smoothstep(count-3.,count+3.,id);if(visibility<=0.)continue;
    vec2 r=vec2(hash(vec2(id,seed)),hash(vec2(id+71.,seed)));
    vec2 center=(r-.5)*vec2(1.95,1.25)+vec2(sin(time+r.x*TAU),cos(time+r.y*TAU))*.045;
    float radius=stars?.0023+.0015*r.x:.013+.04*r.x*r.x;
    float d=length(p-center),pulse=.55+.45*sin(time+id);
    vec3 tint=mix(primary,highlight,r.y)*visibility;
    if(stars){color+=tint*gaussian(d,radius)*pulse;color+=tint*gaussian(d,radius*5.)*.065*pulse;}
    else{color+=tint*(.04+.13*pulse)*smoothstep(radius*1.1,radius*.6,d);color+=tint*.12*gaussian(d,radius*1.5)*pulse;}
  }
  if(stars){
    vec2 drift=vec2(sin(time),cos(time))*.1;
    float n=fbm(uv*5.+drift);
    float nebula=gaussian(uv.y-.6+uv.x*.46,.18);
    color+=primary*pow(n,2.)*nebula*at(vec3(.1,1.4,2.5));
    color+=highlight*pow(n,5.)*nebula*at(vec3(.02,.2,.4));
  }
  return color;
}
vec3 halo(vec2 uv){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);float radius=.37;
  p-=vec2(sin(time),cos(time))*.015;float d=length(p)-radius;
  vec3 color=depth*.025+light(d,.025,at(vec3(.25,1.1,1.8)));
  color+=(light(length(p)-radius*.73,.018,.7)+primary*gaussian(length(p),.6)*.12)*clamp(look-1.,0.,1.);
  return color;
}
vec3 glass(vec2 uv){
  float id=seed;
  if(id==21.){vec2 p=uv-.5;p=mat2(.91,.414,-.414,.91)*p;uv=p+.5;}
  if(id==75.){vec2 p=uv-.5;p=mat2(.84,.54,-.54,.84)*p;uv=p+.5;}
  float columns=32.;
  if(id==70.)columns=12.;
  if(id==21.)columns=10.;
  if(id==75.)columns=13.;
  float x=uv.x+.014*sin(uv.y*5.+time),cell=floor(x*columns),facet=fract(x*columns);
  float curvature=pow(abs(facet-.5)*2.,1.7);
  vec2 q=vec2(x+curvature*.07+sin(cell*.7)*.018,uv.y);
  if(id==72.)q.x+=.12*sin(q.y*4.+time);
  if(id==75.)q.y+=cell*.037;
  float sourceY=.58;
  float illumination=gaussian(q.y-sourceY-.22*sin(time+cell*.075),at(vec3(.13,.3,.5)));
  float band=pow(.5+.5*sin(q.y*8.+time+sin(cell*.3)),4.);
  float edges=pow(facet,15.)*.75+pow(1.-facet,22.)*.2;
  vec3 color=depth*.015+primary*illumination*(.2+.6*curvature)*at(vec3(.3,1.,1.5))+highlight*illumination*edges*at(vec3(.3,.8,1.4));
  color+=primary*band*at(vec3(.035,.22,.6))*gaussian(q.y-.5,.65);
  color*=.35+.65*smoothstep(.02,.15,facet);
  if(id==21.)color+=highlight*.2*gaussian(q.x-.2-.15*sin(time),.1)*illumination;
  return color;
}
vec3 streams(vec2 uv){
  vec3 color=depth*.015;float center=.5;
  float flare=at(vec3(.3,.6,.92));
  float spread=.8;
  float squeeze=pow(abs(uv.x-.5)*2.,1.9);
  for(int i=0;i<38;i++){
    float id=float(i),side=mod(id,2.)*2.-1.;
    float visibility=1.-smoothstep(at(vec3(12.,26.,38.))-2.,at(vec3(12.,26.,38.))+2.,id);
    float offset=(.013+pow(id/38.,1.5)*spread)*side;
    offset+=sin(id*6.7)*spread*.025;
    float y=center+offset*(.015+squeeze)+.008*sin(uv.x*4.+time+id*.07);
    float d=uv.y-y;
    float pulse=.2+.8*pow(.5+.5*sin(time*6.+id*.8+uv.x*10.),2.);
    float core=.001+(.002+.002*hash(vec2(id,2.)))*squeeze;
    vec3 tint=(mod(id,7.)<1.?highlight:primary)*visibility;
    color+=tint*gaussian(d,core)*(flare+.15)*pulse;
    color+=tint*gaussian(d,.015+squeeze*.025)*flare*.28*pulse;
  }
  color+=highlight*gaussian(uv.y-center,.008)*gaussian(uv.x-.5,.1)*flare*.55;
  color+=primary*gaussian(uv.y-center,.1)*.06;
  return color;
}
vec3 rays(vec2 uv){
  vec2 origin=vec2(.5,1.04);
  vec2 p=(uv-origin)*vec2(1.65,1.);float angle=atan(p.x,-p.y),dist=length(p);
  float sw=sin(time)*.09;
  float beam=0.;
  for(int i=0;i<9;i++){
    float id=float(i),a=(id-4.)*.105+sw+.028*sin(time+id);
    float chroma=.018;
    beam+=gaussian(angle-a,.036+look*.027)*(1.-smoothstep(.05,1.6,dist))*(.15+look*.16);
  }
  vec3 color=depth*.025+primary*beam;
  color+=highlight*pow(beam,.8)*.36;
  color+=highlight*gaussian(dist,.3+look*.1)*(.5+look*.22);
  // The dispersion follows the same optical origin instead of drawing hard triangles.
  color+=primary*gaussian(angle-.13-sw,.16)*gaussian(dist-.43,.42)*.55;
  color+=depth*gaussian(angle+.2-sw,.18)*gaussian(dist-.55,.45)*.7;
  float refraction=fbm(vec2(angle*5.+sin(time)*.1,dist*3.+cos(time)*.1));
  color*=.55+.75*refraction;
  return color;
}
vec3 neon(vec2 uv){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);vec3 color=depth*.018;
  float count=at(vec3(5.,7.,9.));
  float width=.28;
  float height=.04;
  for(int i=0;i<9;i++){
    float id=float(i);float visibility=1.-smoothstep(count-1.,count,id);if(visibility<=0.)continue;
    vec2 size=vec2(width+id*.068,height+id*.048);
    float d=box(p,size,.045);
    float chase=.35+.65*pow(.5+.5*sin(time*4.-id*.8),3.);
    color+=light(d,.019,chase*at(vec3(.4,.85,1.1))*visibility);
    color+=primary*gaussian(d,.05)*chase*.15*visibility;
  }
  return color;
}
vec3 cross(vec2 uv){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
  float size=.9*(1.+.012*sin(time));p/=size;
  float vertical=box(p-vec2(0,.015),vec2(.028,.32),.006);
  float horizontal=box(p-vec2(0,-.09),vec2(.16,.028),.006);
  float d=min(vertical,horizontal);
  vec3 color=depth*.012+primary*exp(-abs(d)/.045)*at(vec3(.16,.35,.7));
  float fill=clamp(1.-abs(look-1.),0.,1.);
  color+=highlight*(1.-smoothstep(-.003,.003,d))*1.15*fill;
  color+=highlight*exp(-abs(d)/.0025)*at(vec3(.8,1.2,1.7));
  color+=highlight*exp(-abs(d)/.013)*.18;
  color+=primary*gaussian(length(p),.35)*.3*(.8+.2*sin(time))*clamp(look-1.,0.,1.);
  return color;
}
vec3 orbit(vec2 uv){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);float r=length(p),a=atan(p.y,p.x);
  float rings=62.;
  float scaled=r*rings;
  float band=gaussian(fract(scaled)-.5,at(vec3(.07,.095,.13)));
  float ring=floor(scaled);
  float group=mod(ring,3.);float visibility=group<.5?1.:group<1.5?clamp(look,0.,1.):clamp(look-1.,0.,1.);
  float speed=mod(ring,2.)<1.?1.:-1.;
  float angular=a+time*speed;
  float speck=pow(.5+.5*sin(angular*(50.+ring*2.)+ring*7.7),4.);
  float gaps=smoothstep(at(vec3(.52,.28,.05)),1.,noise(vec2(cos(angular),sin(angular))*5.+ring));
  vec3 color=depth*.012+primary*band*speck*gaps*at(vec3(1.5,2.6,3.1));
  color+=highlight*band*pow(speck,3.)*gaps*.8;
  color+=primary*gaussian(fract(scaled)-.5,.16)*speck*gaps*.18*clamp(look-1.,0.,1.);
  color*=smoothstep(.018,.09,r)*visibility;return color;
}
float waveHeight(vec2 p){
  float v=sin(p.x*1.7+p.y*.3+sin(time))*sin(p.y*.8+cos(time))*.35;
  v+=sin(p.x*4.1-p.y*1.3+2.*time)*.12;
  v+=sin(p.x*9.3+p.y*3.7-time)*.045;
  v+=sin(p.x*19.1-p.y*7.2+3.*time)*.016;
  v+=(noise(p*3.+vec2(sin(time),cos(time)))*2.-1.)*.022;return v*.12;
}
vec3 ocean(vec2 uv){
  float horizon=.67;
  float sunY=at(vec3(horizon-.12,horizon+.02,horizon+.1));
  vec2 sun=vec2(.5+.015*sin(time),sunY);
  vec2 delta=(uv-sun)*vec2(resolution.x/resolution.y,1.);
  vec3 sky=mix(depth*.8,primary*.8,pow(clamp(uv.y/horizon,0.,1.),2.))*at(vec3(1.,1.,.72));
  sky+=primary*gaussian(length(delta),.45)*.2;
  sky+=highlight*gaussian(length(delta),.22)*.3;
  sky+=highlight*(1.-smoothstep(.077,.081,length(delta)))*1.1;
  if(uv.y<horizon)return sky;
  vec3 ray=normalize(vec3((uv.x-.5)*resolution.x/resolution.y,(horizon-uv.y)*1.6,1.));
  float distance=.35/max(.003,-ray.y);
  for(int i=0;i<5;i++){vec2 p=ray.xz*distance;float height=waveHeight(p);distance=mix(distance,(.35-height)/max(.003,-ray.y),.65);}
  vec2 p=ray.xz*distance;float eps=.025+distance*.0006;
  float height=waveHeight(p);
  vec3 normal=normalize(vec3(-(waveHeight(p+vec2(eps,0.))-height)/eps,1.,-(waveHeight(p+vec2(0,eps))-height)/eps));
  vec3 reflection=reflect(ray,normal);
  float fresnel=.12+.78*pow(1.-clamp(dot(-ray,normal),0.,1.),4.);
  float skyPosition=clamp(1.-reflection.y*2.,0.,1.);
  vec3 water=mix(depth*.14,mix(depth*.65,primary*.7,skyPosition),fresnel);
  vec3 sunDirection=normalize(vec3((sun.x-.5)*resolution.x/resolution.y,(horizon-sunY)*1.6,1.));
  float glint=pow(max(0.,dot(reflection,sunDirection)),220.);
  water+=highlight*glint*at(vec3(2.5,.65,.12));
  water=mix(water,primary*.55,exp(-(uv.y-horizon)*45.)*.7);
  return water*at(vec3(1.,1.,.78));
}
// New families share only palette and exposure; each has its own spatial grammar.
vec3 ridges(vec2 uv){
  float horizon=at(vec3(.61,.58,.64));
  vec3 color=mix(depth*.18,primary*.23,gaussian(uv.y-horizon,.3));
  vec2 sun=vec2(at(vec3(.78,.23,.79)),at(vec3(.24,.31,.22))+.006*sin(time));
  float solar=length((uv-sun)*vec2(resolution.x/resolution.y,1.));
  color+=primary*gaussian(solar,.22)*.14+highlight*gaussian(solar,.08)*.06;
  color+=highlight*(1.-smoothstep(.026,.0275,solar))*at(vec3(.3,.4,.48));
  for(int i=0;i<6;i++){
    float id=float(i),base=horizon+id*.075;
    float amplitude=.034+id*.007;
    float ridge=base+sin(uv.x*9.+id*1.8)*amplitude+sin(uv.x*22.+id*.7)*amplitude*.28;
    ridge+=sin(uv.x*4.+id+time)*.006;
    float cover=smoothstep(ridge-.001,ridge+.001,uv.y);
    vec3 mountain=mix(primary,depth,.38+id*.105)*(.27-id*.027);
    color=mix(color,mountain,cover);
    float fog=gaussian(uv.y-ridge-.026,.018+id*.004);
    float mist=.6+.4*sin(uv.x*5.+time+id);
    color+=primary*fog*mist*at(vec3(.018,.045,.085));
    color+=highlight*gaussian(uv.y-ridge,.0012)*at(vec3(.005,.012,.024));
  }
  return color;
}
vec3 caustics(vec2 uv){
  vec2 drift=vec2(sin(time),cos(time));
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
  float angle=at(vec3(-.3,.4,-.6));p=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*p;
  p*=at(vec3(5.,8.,12.));
  vec2 warp=vec2(sin(p.y*.8+time)+sin(p.x*.53-time),cos(p.x*.7-time)+cos(p.y*.61+time));
  vec2 q=p+warp*.8;
  float cell=sin(q.x*1.5+sin(q.y*.8+time)*.8)*sin(q.y*1.8+sin(q.x*.7-time)*.7);
  float ridge=pow(max(0.,1.-abs(cell)*2.8),4.5);
  float fine=pow(max(0.,1.-abs(sin(q.x*2.1+q.y*.9+sin(time))*sin(q.y*1.7-q.x*.5+cos(time)))*4.),12.);
  float edge=smoothstep(.08,.63,length((uv-.5)*vec2(1.,.86)));
  float depthLight=.3+.7*gaussian(length(uv-vec2(.13,.95)),.65);
  vec3 color=depth*.085+primary*depthLight*.09;
  color+=primary*ridge*edge*depthLight*at(vec3(.18,.4,.65));
  color+=highlight*(ridge*.28+fine*.12)*edge*depthLight*at(vec3(.4,.75,1.1));
  color+=primary*gaussian(uv.y-.92-.018*sin(uv.x*8.+time),.12)*.1;
  return color;
}
vec3 petals(vec2 uv){
  float aspect=resolution.x/resolution.y;
  vec3 color=depth*.055+primary*gaussian(length((uv-vec2(.05,.12))*vec2(1.,.8)),.55)*.06;
  float branch=at(vec3(.035,.09,.16))+.08*sin(uv.y*3.)+.005*sin(time+uv.y*4.);
  color+=primary*gaussian(uv.x-branch,.0012)*.1;
  color+=primary*gaussian(uv.x-(1.-branch),.0012)*at(vec3(.01,.08,.14));
  for(int i=0;i<42;i++){
    float id=float(i),side=mod(id,2.),row=floor(id*.5),f=row/20.;
    float presence=side<.5?1.:at(vec3(.1,.72,1.));
    vec2 center=vec2(at(vec3(.035,.09,.16))+.08*sin(f*3.),.015+f*1.03);
    if(side>.5)center.x=1.-center.x;
    center+=vec2(sin(time+id*.6),cos(time+id*.4))*.005;
    float direction=(side*2.-1.)*(.4+mod(row,2.)*1.2)+.035*sin(time+id);
    vec2 p=(uv-center)*vec2(aspect,1.);
    float size=.045+hash(vec2(id,seed))*at(vec3(.03,.055,.08));
    if(dot(p,p)>size*size*5.)continue;
    p=mat2(cos(direction),sin(direction),-sin(direction),cos(direction))*p;
    float shape=length(p/vec2(size,size*.34));
    float leaf=1.-smoothstep(.86,1.02,shape);
    float grain=.9+.1*sin(p.x/size*12.+sin(p.y/size*7.));
    vec3 tint=mix(primary,highlight,.16+.2*hash(vec2(id+3.,seed)));
    color+=tint*leaf*grain*presence*.65;
    color+=highlight*gaussian(p.y,.00045)*(1.-smoothstep(size*.2,size,abs(p.x)))*leaf*presence*.11;
    color+=primary*gaussian(shape,1.4)*presence*.04;
    color+=highlight*gaussian(shape-1.,.045)*presence*.09;
  }
  return color;
}
vec3 mist(vec2 uv){
  vec3 color=depth*.075;
  vec2 drift=vec2(sin(time),cos(time))*.14;
  float haze=noise(uv*vec2(4.,7.)+drift+seed);
  for(int i=0;i<4;i++){
    float id=float(i),base=at(vec3(.13,.18,.12))+id*.025;
    float ribbon=base+.055*sin(uv.x*5.+sin(time)*.5+id*.16)+.021*sin(uv.x*11.+cos(time)+id*.27);
    float veil=gaussian(uv.y-ribbon,at(vec3(.018,.028,.043)));
    float core=gaussian(uv.y-ribbon,.0035);
    float folds=.35+.65*noise(vec2(uv.x*12.+sin(time)*.2,id*2.+cos(time)*.1));
    color+=primary*veil*folds*at(vec3(.1,.18,.25));
    color+=highlight*core*folds*at(vec3(.02,.045,.08));
  }
  float low=.88+.018*sin(uv.x*6.+sin(time)*.7)+.012*cos(uv.x*13.+cos(time));
  color+=primary*gaussian(uv.y-low,.045)*haze*at(vec3(.025,.06,.11));
  vec2 cells=uv*vec2(75.,42.),cell=floor(cells),f=fract(cells);
  vec2 star=vec2(hash(cell+seed),hash(cell+seed+9.));
  float dotStar=gaussian(length(f-star),.045);
  color+=highlight*dotStar*step(.97,hash(cell+4.))*(1.-smoothstep(.15,.52,uv.y))*(.13+.04*sin(time+cell.x));
  return color;
}
vec3 constellations(vec2 uv){
  vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
  float tilt=at(vec3(-.38,.18,-.24));
  p=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p;
  p.x-=at(vec3(-.17,.05,.14))+.006*sin(time);
  vec2 q=p/vec2(1.,.64);float radius=length(q),angle=atan(q.y,q.x);
  vec3 color=depth*.06;
  for(int i=0;i<7;i++){
    float id=float(i),r=.37+id*.066;
    float start=-PI+.3+id*.2,end=start+at(vec3(1.7,2.5,3.5));
    float a=angle;
    if(a<start)a+=TAU;
    float visible=smoothstep(start,start+.08,a)*(1.-smoothstep(end-.08,end,a));
    float d=radius-r;
    float band=gaussian(d,.0014)*visible;
    color+=primary*band*at(vec3(.3,.5,.75));
    float nodes=(a-start)/(end-start)*8.;
    float node=gaussian((fract(nodes+.5)-.5)*(end-start)*r/8.,.0025)*gaussian(d,.0025)*visible;
    float shimmer=.82+.18*sin(time+floor(nodes+.5)+id);
    color+=highlight*node*shimmer*1.2;
    color+=primary*gaussian(d,.035)*visible*at(vec3(.04,.08,.14));
  }
  float nebula=gaussian(uv.y-.12-uv.x*.18,.11);
  color+=primary*nebula*noise(uv*6.+vec2(sin(time),cos(time))*.07)*.08;
  return color;
}
vec3 eclipse(vec2 uv){
  vec2 center=vec2(at(vec3(.22,.77,.79))+.006*sin(time),at(vec3(.24,.27,.72)));
  vec2 p=(uv-center)*vec2(resolution.x/resolution.y,1.);
  float r=at(vec3(.13,.18,.22)),d=length(p),angle=atan(p.y,p.x);
  vec3 color=depth*.055;
  float corona=exp(-abs(d-r)/(.025+.005*sin(angle*7.+time)));
  color+=primary*corona*.35+highlight*exp(-abs(d-r)/.0014)*.25;
  float disc=1.-smoothstep(r-.001,r+.001,d);
  float texture=noise(p*130.+seed)*.35+.65;
  vec3 surface=mix(primary,highlight,.45-.3*p.y/r)*texture*.75;
  vec2 shadow=p-vec2(r*at(vec3(.25,.12,.5))+.003*cos(time),-r*.16);
  float occult=1.-smoothstep(r*.97,r*1.01,length(shadow));
  surface=mix(surface,depth*.004,occult);
  color=mix(color,surface,disc);
  color+=primary*gaussian(d,r*2.4)*.018;
  vec2 grid=uv*vec2(90.,50.),cell=floor(grid),f=fract(grid);
  vec2 location=vec2(hash(cell+seed),hash(cell+seed+7.));
  float star=gaussian(length(f-location),.035)*step(.988,hash(cell+3.));
  color+=highlight*star*(1.-disc)*(.13+.025*sin(time+cell.x));
  return color;
}
vec3 dunes(vec2 uv){
  float y=uv.y;
  float drift=.16*sin(time),breath=.2*cos(time);
  float field=y+at(vec3(.045,.085,.125))*sin(uv.x*6.+y*3.+drift)+.025*sin(uv.x*12.-y*4.+breath);
  float contours=field*at(vec3(55.,68.,83.));
  float line=gaussian(fract(contours)-.5,.055);
  float major=gaussian(fract(contours/7.)-.5,.012);
  float bank=smoothstep(at(vec3(.62,.57,.51)),.96,uv.y);
  float reverse=smoothstep(.84,1.15,uv.x-uv.y*.24)*at(vec3(.12,.55,.9));
  float coverage=max(bank,reverse);
  float sand=.5+.5*sin(field*9.+uv.x*.7);
  vec3 color=depth*.065+primary*coverage*sand*.075;
  color+=primary*line*coverage*at(vec3(.2,.42,.7));
  color+=highlight*major*coverage*at(vec3(.25,.4,.6));
  color+=primary*gaussian(field-.84,.15)*coverage*.04;
  return color;
}
float arch(vec2 p,float width,float rise,float spring){
  vec2 q=vec2(p.x,(p.y-spring)*width/rise);
  float top=abs(length(q)-width)/max(.1,length(q*vec2(1.,width/rise))/max(length(q),.0001));
  float sides=abs(abs(p.x)-width);
  return p.y<spring?top:sides;
}
vec3 vault(vec2 uv){
  vec2 p=uv-vec2(.5,0.);
  vec3 color=depth*.065;
  for(int i=0;i<9;i++){
    float id=float(i),width=at(vec3(.34,.26,.18))+id*.045+.003*sin(time+id*.3),spring=at(vec3(.64,.65,.69))+id*.012;
    float rise=width*at(vec3(.95,1.2,1.45));
    float d=arch(p,width,rise,spring);
    float visibility=1.-smoothstep(at(vec3(3.5,6.5,9.))-1.,at(vec3(3.5,6.5,9.)),id);
    float pulse=.8+.2*sin(time+uv.y*3.+id*.5);
    color+=primary*gaussian(d,.012)*.15*visibility;
    color+=mix(primary,highlight,mod(id,3.)<.5?.6:.05)*gaussian(d,.0015)*.8*visibility*pulse;
    float glass=gaussian(d-.018,.009)*(.35+.65*noise(uv*vec2(17.,8.)+id));
    color+=primary*glass*.15*visibility;
    float joints=gaussian(fract((uv.y-spring)*10.)-.5,.025)*gaussian(d,.02)*step(spring,uv.y);
    color+=highlight*joints*.035*visibility;
  }
  color+=primary*(gaussian(uv.x-.08,.09)+gaussian(uv.x-.92,.09))*gaussian(uv.y-.7-.02*sin(time),.7)*.1;
  return color;
}
vec3 scene(vec2 uv){
  if(family< -1.5)return texture2D(previousFrame,vec2(uv.x,1.-uv.y)).rgb;
  if(family< -.5)return primary;
  vec3 color;
  if(family<.5)color=cloud(uv);else if(family<1.5)color=silk(uv);
  else if(family<2.5)color=particles(uv,false);else if(family<3.5)color=particles(uv,true);
  else if(family<4.5)color=halo(uv);else if(family<5.5)color=glass(uv);
  else if(family<6.5)color=streams(uv);else if(family<7.5)color=rays(uv);
  else if(family<8.5)color=neon(uv);else if(family<9.5)color=cross(uv);
  else if(family<10.5)color=orbit(uv);else if(family<11.5)color=ocean(uv);
  else if(family<12.5)color=ridges(uv);else if(family<13.5)color=caustics(uv);
  else if(family<14.5)color=petals(uv);else if(family<15.5)color=mist(uv);
  else if(family<16.5)color=constellations(uv);else if(family<17.5)color=eclipse(uv);
  else if(family<18.5)color=dunes(uv);else color=vault(uv);
  if(family>11.5)color*=.45+.55*smoothstep(.12,.62,length((uv-.5)*vec2(1.1,.9)));
  // Exposure shoulder and restrained edge falloff preserve bloom without flat clipping.
  color=1.-exp(-max(color,vec3(0.))*1.5);
  float vignette=1.-.24*smoothstep(.25,.85,length(uv-.5));
  color*=vignette;
  return color;
}
void main(){
  vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
  vec3 result=vec3(0.);
  for(int i=0;i<4;i++){
    if(weights[i]>.00001){family=families[i];seed=seeds[i];time=times[i];look=looks[i];primary=primaries[i];highlight=highlights[i];depth=depths[i];result+=scene(uv)*weights[i];}
  }
  gl_FragColor=vec4(result,1.);
}`;
  const renderers=new WeakMap();
  function create(doc,canvas=doc.createElement('canvas'),preserve=true){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:preserve,powerPreference:'high-performance'});
    if(!gl)throw new Error('Motion backgrounds need GPU rendering.');
    canvas.addEventListener('webglcontextlost',event=>event.preventDefault());
    canvas.addEventListener('webglcontextrestored',()=>renderers.delete(doc));
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const locations={};for(const name of ['resolution','times[0]','looks[0]','weights[0]','families[0]','seeds[0]','primaries[0]','highlights[0]','depths[0]','previousFrame'])locations[name]=gl.getUniformLocation(program,name);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.LINEAR);
    for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
    gl.uniform1i(locations.previousFrame,0);
    return {canvas,gl,locations,program,buffer,texture,times:new Float32Array(4),looks:new Float32Array(4),weights:new Float32Array(4),families:new Float32Array(4),seeds:new Float32Array(4),primaries:new Float32Array(12),highlights:new Float32Array(12),depths:new Float32Array(12)};
  }
  const rgb=hex=>Array.isArray(hex)?hex:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  function render(renderer,preset,layers,width,height){
    const {gl,locations:l,canvas}=renderer;if(gl.isContextLost())return;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);gl.uniform2f(l.resolution,width,height);
    const {times,looks,weights,primaries,highlights,depths,families:familyValues,seeds}=renderer;
    times.fill(0);looks.fill(0);weights.fill(0);primaries.fill(0);highlights.fill(0);depths.fill(0);
    const visible=layers.filter(l=>l.weight>.00001).sort((a,b)=>b.weight-a.weight).slice(0,4);
    const total=visible.reduce((sum,l)=>sum+l.weight,0)||1;
    visible.forEach((layer,i)=>{
      times[i]=(layer.phase-Math.floor(layer.phase))*Math.PI*2;looks[i]=layer.look??{a:0,b:1,c:2}[layer.variant||'a'];weights[i]=layer.weight/total;
      familyValues[i]=layer.snapshot?-2:families[(layer.preset||preset).id];seeds[i]=(layer.preset||preset).seed;
      primaries.set(rgb(layer.colors[0]),i*3);highlights.set(rgb(layer.colors[1]),i*3);depths.set(rgb(layer.colors[2]),i*3);
    });
    gl.uniform1fv(l['times[0]'],times);gl.uniform1fv(l['looks[0]'],looks);gl.uniform1fv(l['weights[0]'],weights);
    gl.uniform1fv(l['families[0]'],familyValues);gl.uniform1fv(l['seeds[0]'],seeds);
    gl.uniform3fv(l['primaries[0]'],primaries);gl.uniform3fv(l['highlights[0]'],highlights);gl.uniform3fv(l['depths[0]'],depths);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function draw(canvas,preset,phase){
    if(families[preset.id]===undefined)return false;
    const doc=canvas.ownerDocument;let renderer=renderers.get(doc);
    if(renderer===false)return false;
    if(!renderer){try{renderer=create(doc);renderers.set(doc,renderer);}catch{renderers.set(doc,false);return false;}}
    if(renderer.gl.isContextLost())return false;
    render(renderer,preset,[{colors:preset.colors,variant:preset.variant,look:preset.look,phase,weight:1}],canvas.width,canvas.height);
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderer.canvas,0,0);return true;
  }
  function surface(canvas,preset){
    let renderer=create(canvas.ownerDocument,canvas,false),stopped=false;
    canvas.addEventListener('webglcontextrestored',()=>{if(!stopped)renderer=create(canvas.ownerDocument,canvas,false);});
    return {render(layers){if(!stopped)render(renderer,preset,layers,canvas.width,canvas.height);},snapshot(){const {gl,texture}=renderer;if(stopped||gl.isContextLost())return false;gl.bindTexture(gl.TEXTURE_2D,texture);gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGB,0,0,canvas.width,canvas.height,0);return true;},stop(){if(stopped)return;stopped=true;renderer.gl.deleteTexture(renderer.texture);renderer.gl.deleteBuffer(renderer.buffer);renderer.gl.deleteProgram(renderer.program);renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();}};
  }
  window.ProMaxOptics={draw,families,surface};
})();
