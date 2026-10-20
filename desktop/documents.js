const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);

async function importPowerPoint(source, userData) {
  if (!['.ppt', '.pptx', '.pps', '.ppsx'].includes(path.extname(source).toLowerCase())) {
    throw new Error('Choose a PowerPoint presentation (.ppt or .pptx).');
  }
  const destination = path.join(userData, 'presentations', require('node:crypto').randomUUID());
  await fs.mkdir(destination, { recursive: true });
  try {
    // PowerShell needs a real filesystem path outside Electron's archive.
    const script = path.join(__dirname, 'import-powerpoint.ps1').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', script, '-Source', source, '-Destination', destination],
      { windowsHide: true, timeout: 180000, maxBuffer: 1024 * 1024 });
    const slides = (await fs.readdir(destination)).filter(name => /^slide-\d+\.png$/.test(name)).sort();
    if (!slides.length) throw new Error('The presentation contains no slides.');
    return { id: path.basename(destination), title: path.basename(source, path.extname(source)),
      slides: slides.map(name => pathToFileURL(path.join(destination, name)).href) };
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw new Error(error.killed ? 'PowerPoint import timed out. Close any PowerPoint dialog and try again.' :
      'Could not import this presentation. Microsoft PowerPoint must be installed and able to open the file.');
  }
}

module.exports = { importPowerPoint };
