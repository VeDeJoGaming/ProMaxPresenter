const test=require('node:test'),assert=require('node:assert/strict');
const {validate,sourceFile}=require('../desktop/pptx-editor.cjs');
test('PPTX editing rejects unsupported commands, invalid properties and paths outside managed copies',async()=>{
  assert.throws(()=>validate({action:'shell'}));
  assert.throws(()=>validate({action:'update',slide:1,shape:2,values:{width:-1}}));
  assert.throws(()=>validate({action:'update',slide:1,shape:2,values:{color:'red'}}));
  assert.throws(()=>validate({action:'update',slide:1,shape:2,values:{code:'anything'}}));
  assert.throws(()=>validate({action:'deleteSlide',slide:0}));
  assert.doesNotThrow(()=>validate({action:'update',slide:1,shape:2,values:{text:'Ærlig tekst',left:12,bold:true,color:'#ff8a3d'}}));
  await assert.rejects(()=>sourceFile('C:\\example','file:///C:/example/secret.pptx'));
});
