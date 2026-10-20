const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdateController } = require('../desktop/update-controller.cjs');

function setup(options = {}) {
  const updater = new EventEmitter();
  const calls = [];
  updater.checkForUpdates = async () => { calls.push('check'); updater.emit('checking-for-update'); updater.emit('update-available', { version: '1.0.1' }); };
  updater.downloadUpdate = async () => { calls.push('download'); updater.emit('download-progress', { percent: 54.5 }); updater.emit('update-downloaded', { version: '1.0.1' }); };
  updater.quitAndInstall = (...args) => { calls.push(['install', ...args]); };
  const states = [];
  const controller = createUpdateController({ updater, enabled: true, version: '1.0.0', publishState: s => states.push(s), beforeInstall: async backup => calls.push(backup ? 'backup' : 'guard'), ...options });
  return { updater, calls, states, controller };
}
test('one Update action downloads, backs up, and installs in order', async () => {
  const { updater, controller, calls, states } = setup();
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  await controller.check();
  assert.equal(controller.getState().status, 'available');
  assert.deepEqual(calls, ['check']);
  await controller.install();
  assert.deepEqual(calls, ['check', 'guard', 'download', 'backup', ['install', true, true]]);
  assert.ok(states.some(s => s.status === 'downloading' && s.percent === 55));
  assert.equal(controller.getState().status, 'installing');
});
test('opening a presentation during download postpones installation and resumes without downloading twice', async () => {
  let blocked = true;
  const { controller, calls } = setup({ beforeInstall: async backup => {
    if (backup && blocked) throw Object.assign(new Error('Close presentation'), { code: 'PRESENTATION_OPEN' });
  } });
  await controller.check(); await controller.install();
  assert.equal(controller.getState().status, 'ready');
  assert.ok(!calls.some(Array.isArray));
  blocked = false;
  await controller.install();
  assert.equal(calls.filter(c => c === 'download').length, 1);
  assert.equal(controller.getState().status, 'installing');
});
test('a live presentation prevents the download from starting', async () => {
  const { controller, calls } = setup({ beforeInstall: async () => { throw Object.assign(new Error('Close presentation'), { code: 'PRESENTATION_OPEN' }); } });
  await controller.check(); await controller.install();
  assert.equal(controller.getState().status, 'available');
  assert.deepEqual(calls, ['check']);
});
test('failed backup cannot restart the application', async () => {
  const { controller, calls } = setup({ beforeInstall: async backup => { if (backup) throw Object.assign(new Error('Save failed'), { code: 'SAVE_FAILED' }); } });
  await controller.check(); await controller.install();
  assert.equal(controller.getState().status, 'ready');
  assert.ok(!calls.some(Array.isArray));
});
test('network failure is recoverable and does not install', async () => {
  const { controller, updater, calls } = setup();
  updater.checkForUpdates = async () => { throw Error('Offline'); };
  await controller.check();
  assert.equal(controller.getState().status, 'error');
  updater.checkForUpdates = async () => updater.emit('update-not-available');
  await controller.check();
  assert.equal(controller.getState().status, 'current');
  assert.deepEqual(calls, []);
});
test('duplicate clicks cannot start overlapping downloads or installs', async () => {
  const { controller, updater, calls } = setup();
  let finish;
  updater.downloadUpdate = () => new Promise(resolve => { calls.push('download'); finish = () => { updater.emit('update-downloaded', { version: '1.0.1' }); resolve(); }; });
  await controller.check();
  const first = controller.install();
  await new Promise(resolve => setImmediate(resolve));
  await controller.install(); await controller.check();
  finish(); await first;
  assert.equal(calls.filter(c => c === 'download').length, 1);
  assert.equal(calls.filter(Array.isArray).length, 1);
});
test('unconfigured builds cannot contact an update provider', async () => {
  const { controller, calls } = setup({ enabled: false });
  await controller.check(); await controller.install();
  assert.equal(controller.getState().status, 'disabled');
  assert.deepEqual(calls, []);
});
test('failed download never installs, and can be retried after a new check', async () => {
  const { controller, updater, calls } = setup();
  updater.downloadUpdate = async () => { throw Error('Connection lost'); };
  await controller.check(); await controller.install();
  assert.equal(controller.getState().status, 'error');
  assert.ok(!calls.some(Array.isArray));
  await controller.check();
  assert.equal(controller.getState().status, 'available');
});
