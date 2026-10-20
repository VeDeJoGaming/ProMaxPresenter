/* Local GPU optics: signed distance geometry, procedural atmosphere and reflective water.
   Every motion term is periodic. No external media or page content is used. */
(() => {
  const families={'golden-hour':0,'amber-silk':1,'floating-gold':2,'starlit-warmth':3,'gentle-halo':4,'molten-glass':5,'dynamic-glass':5,'prism-columns':5,'liquid-cathedral':5,'midnight-facets':5,'velocity-streams':6,'bloom-rays':7,'neon-depth':8,'sacred-light':9,'orbital-dust':10,'still-waters':11};
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
vec3 scene(vec2 uv){
  if(family< -1.5)return texture2D(previousFrame,vec2(uv.x,1.-uv.y)).rgb;
  if(family< -.5)return primary;
  vec3 color;
  if(family<.5)color=cloud(uv);else if(family<1.5)color=silk(uv);
  else if(family<2.5)color=particles(uv,false);else if(family<3.5)color=particles(uv,true);
  else if(family<4.5)color=halo(uv);else if(family<5.5)color=glass(uv);
  else if(family<6.5)color=streams(uv);else if(family<7.5)color=rays(uv);
  else if(family<8.5)color=neon(uv);else if(family<9.5)color=cross(uv);
  else if(family<10.5)color=orbit(uv);else color=ocean(uv);
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
