const fs = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('../library-data.js');

async function backupLibrary(directory, data, version) {
  const library = parse(data);
  const body = JSON.stringify({ version: 1, appVersion: version, savedAt: new Date().toISOString(), ...library }, null, 2);
  if (Buffer.byteLength(body) > 20 * 1024 * 1024) throw new Error('Library backup is too large');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `before-update-${Date.now()}.json`);
  await fs.writeFile(`${file}.tmp`, body, { flag: 'wx' });
  await fs.rename(`${file}.tmp`, file);
  const backups = (await fs.readdir(directory)).filter(name => /^before-update-\d+\.json$/.test(name)).sort();
  await Promise.all(backups.slice(0, -10).map(name => fs.unlink(path.join(directory, name))));
  return file;
}
module.exports = { backupLibrary };
