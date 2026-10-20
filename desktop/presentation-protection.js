const path = require('node:path');
const run = require('node:util').promisify(require('node:child_process').execFile);

async function protectPresentation(window) {
  if (process.platform !== 'win32') return;
  const handle = window.getNativeWindowHandle();
  const id = handle.length === 8 ? handle.readBigUInt64LE().toString() : String(handle.readUInt32LE());
  const script = path.join(__dirname, 'protect-presentation.ps1').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', script, '-WindowHandle', id],
    { windowsHide: true, timeout: 15000 });
  if (result.stdout.trim() !== 'protected') throw new Error('Windows did not confirm presentation Peek protection.');
  return true;
}

module.exports = { protectPresentation };
