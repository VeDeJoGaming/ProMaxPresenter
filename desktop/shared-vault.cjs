const fs = require('node:fs/promises');
const path = require('node:path');
function createSharedVault(file, safeStorage) {
  async function available() {
    if (!await safeStorage.isAsyncEncryptionAvailable()) throw Error('Windows could not protect your group access. Please try again after restarting Windows.');
  }
  return {
    async read() {
      let bytes; try { bytes=await fs.readFile(file); } catch(e) { if(e.code==='ENOENT')return null;throw e; }
      await available(); const result=await safeStorage.decryptStringAsync(bytes);
      return JSON.parse(result.result);
    },
    async write(value) {
      await available(); await fs.mkdir(path.dirname(file),{recursive:true});
      const bytes=await safeStorage.encryptStringAsync(JSON.stringify(value));
      await fs.writeFile(file+'.tmp',bytes); await fs.rename(file+'.tmp',file);
    },
    async clear() { await fs.rm(file,{force:true}); }
  };
}
module.exports={createSharedVault};
