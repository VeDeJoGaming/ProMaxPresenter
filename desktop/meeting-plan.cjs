const path=require('node:path'),fs=require('node:fs/promises');
const {normalize,toHTML}=require('../meeting-plan');
function registerMeetingPlan({ipcMain,BrowserWindow,dialog,app,getControl}){
  let busy=false;
  ipcMain.handle('meeting:export-plan',async(event,request)=>{
    const control=getControl();if(event.sender!==control?.webContents)throw Error('Invalid window.');
    if(busy)return {error:'A running sheet export is already open.'};busy=true;let window,temporary;
    try{
      const plan=normalize(request),html=toHTML(plan);if(Buffer.byteLength(html)>2000000)throw Error('This running sheet is too large to export. Shorten the operator notes.');
      const title=plan.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Meeting';
      const choice=await dialog.showSaveDialog(control,{title:'Save running sheet as PDF',defaultPath:path.join(app.getPath('documents'),title+' - Running sheet.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});
      if(choice.canceled)return {canceled:true};if(!choice.filePath)throw Error('Choose a destination for the PDF.');
      const destination=choice.filePath.toLowerCase().endsWith('.pdf')?choice.filePath:choice.filePath+'.pdf';
      window=new BrowserWindow({show:false,width:900,height:1200,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,javascript:false}});
      window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
      await window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
      const pdf=await window.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,generateTaggedPDF:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:'<div style="font:9px Arial,sans-serif;color:#70564b;width:100%;text-align:center">ProMax Presenter · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
      temporary=path.join(path.dirname(destination),'.promax-plan-'+require('node:crypto').randomUUID()+'.tmp');
      await fs.writeFile(temporary,pdf,{flag:'wx'});await fs.rename(temporary,destination);temporary=null;return {saved:true};
    }catch(error){return {error:error.message||'Could not save the PDF.'};}
    finally{if(window&&!window.isDestroyed())window.destroy();if(temporary)await fs.unlink(temporary).catch(()=>{});busy=false;}
  });
}
module.exports={registerMeetingPlan};
