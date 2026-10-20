const {BrowserWindow}=require('electron');
module.exports=async function(){
  // An in-memory session leaves the saved library stores closed during copying.
  const win=new BrowserWindow({width:520,height:260,show:false,resizable:false,frame:false,backgroundColor:'#181818',title:'ProMax Presenter — Backup',webPreferences:{partition:'promax-maintenance',sandbox:true,contextIsolation:true,nodeIntegration:false}});
  win.setClosable(false);
  await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>body{margin:0;background:#181818;color:#eee;font:15px Segoe UI,Arial,sans-serif;padding:38px}b{font-size:22px}p{color:#bdbdbd;line-height:1.65}.bar{height:4px;background:#ffffff15;border-radius:4px;overflow:hidden;margin-top:28px}.bar:after{content:'';display:block;width:35%;height:100%;background:linear-gradient(90deg,#ff5748,#ffd46c);animation:slide 1.5s ease-in-out infinite alternate}@keyframes slide{to{transform:translateX(190%)}}</style><b>ProMax Presenter</b><p>Copying and checking your saved content.<br>The workspace opens when this finishes.</p><div class="bar"></div></html>`));
  win.show();return win;
};
