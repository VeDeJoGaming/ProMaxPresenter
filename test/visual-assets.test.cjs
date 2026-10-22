const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
function catalog(){
  const window={};
  const context=vm.createContext({window,URL,document:{currentScript:{src:pathToFileURL(path.join(root,'bundled-visuals.js')).href}}});
  for(const file of ['visual-engine.js','visual-scenes.js','bundled-visuals.js','visuals.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return window;
}
test('expanded catalog retains every released background and ships all assets offline',()=>{
  const {ProMaxVisuals:visuals,ProMaxBundledVisuals:bundled,ProMaxOptics:optics}=catalog();
  assert.equal(visuals.presets.length,42);
  assert.equal(new Set(visuals.presets.map(p=>p.id)).size,42);
  assert.equal(bundled.presets.length,18);
  for(const id of ['golden-hour','amber-silk','floating-gold','starlit-warmth','gentle-halo','molten-glass','dynamic-glass','prism-columns','liquid-cathedral','midnight-facets','velocity-streams','bloom-rays','neon-depth','sacred-light','orbital-dust','still-waters','nordlys','blaa-tide','gyllent-lys','purpurdis','prisme','etterklang']){
    assert.ok(visuals.presets.some(p=>p.id===id),'Released selection must still exist: '+id);
    assert.equal(visuals.resolveId(id),id);
  }
  for(const preset of visuals.presets.filter(p=>p.kind!=='bundled-svg'))assert.equal(typeof optics.families[preset.id],'number',preset.id+' GPU rendering');
  for(const preset of bundled.presets){
    assert.match(preset.file,/^\d\d-[a-z0-9-]+\.svg$/);
    const source=fs.readFileSync(path.join(root,'visuals',preset.file),'utf8');
    const poster=fs.readFileSync(path.join(root,'visuals',preset.file.replace('.svg','.poster.svg')),'utf8');
    assert.match(source,/viewBox="0 0 1920 1080"/,preset.id+' 16:9');
    assert.match(source,/<animate(?:Transform)?\b/,preset.id+' motion');
    assert.doesNotMatch(source,/<script\b|<foreignObject\b|https?:\/\/(?!www\.w3\.org\/2000\/svg)|(?:xlink:)?href\s*=\s*["'](?!#)/i,preset.id+' self-contained');
    assert.doesNotMatch(poster,/<(?:animateTransform|animate|set)\b/,preset.id+' static poster');
    const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,preset.id+' unique SVG IDs');
    for(const ref of source.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.includes(ref[1]),preset.id+' gradient '+ref[1]);
  }
  assert.ok(require('../package.json').build.files.includes('visuals/*.svg'),'Installer includes every loop and poster');
});
