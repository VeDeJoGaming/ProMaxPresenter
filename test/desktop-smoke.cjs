const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function pdfFixture() {
  const content = 'BT /F1 24 Tf 20 100 Td (PDF presentation test) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function run() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'promax-desktop-test-'));
  const env = { ...process.env, PROMAX_TEST_DATA: directory };
  delete env.ELECTRON_RUN_AS_NODE;
  const errors = [];
  let app;
  const deadline = setTimeout(() => {
    console.error('Desktop smoke exceeded two minutes. Stopping this test process.');
    app?.process().kill();
    process.exit(1);
  }, 120000);
  deadline.unref();
  async function closeApp() {
    if (!app) return;
    const closing = app;
    app = null;
    let timeout;
    const child = closing.process();
    const exited = child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve));
    try {
      await Promise.race([
        Promise.all([closing.close(), exited]),
        new Promise((_resolve, reject) => { timeout = setTimeout(() => {
          closing.process().kill();
          reject(new Error('Electron did not close within ten seconds'));
        }, 10000); })
      ]);
    } finally { clearTimeout(timeout); }
  }
  async function launch() {
    console.log('Desktop check: launching an isolated app process.');
    const executablePath = process.argv[2];
    app = await electron.launch({
      executablePath,
      args: executablePath ? [`--user-data-dir=${directory}`] : [path.join(__dirname, '..')], env, timeout: 60000
    });
    const userData = await app.evaluate(({ app }) => app.getPath('userData'));
    assert.equal(path.resolve(userData).toLowerCase(), path.resolve(directory).toLowerCase(), 'Tests must use an isolated profile');
    const page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('.song').first().waitFor();
    return page;
  }
  try {
    let page = await launch();
    console.log('Desktop check: main window opened.');
    assert.equal(await page.evaluate(() => typeof require), 'undefined');
    const prefs = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration };
    });
    assert.deepEqual(prefs, { sandbox: true, contextIsolation: true, nodeIntegration: false });
    const hasFeed = process.argv[2] && await fs.access(path.join(path.dirname(process.argv[2]), 'resources', 'app-update.yml')).then(() => true, () => false);
    assert.equal((await page.evaluate(() => window.proMaxDesktop.getUpdateState())).status, hasFeed ? 'idle' : 'disabled');
    await page.locator('#new-song').click();
    await page.locator('#title').fill('Smoke test song');
    await page.locator('#lyrics').fill('[Verse 1]\nFirst line\nSecond line\n\n[Chorus]\nTogether');
    await page.locator('#build').click();
    assert.equal(await page.locator('.slide-card').count(), 2);
    const popupPromise = app.waitForEvent('window', { timeout: 30000 });
    await page.locator('#open-output').click();
    const output = await popupPromise;
    await output.locator('#stage').waitFor();
    await page.locator('.thumbnail').first().click();
    assert.equal(await output.locator('.screen-text').innerText(), 'First line\nSecond line');
    await output.locator('body').press('ArrowRight');
    assert.equal(await output.locator('.screen-text').innerText(), 'Together');
    await output.locator('body').dblclick();
    await output.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.locator('#blackout').click();
    assert.equal(await output.locator('.screen-text').count(), 0);
    await page.locator('#restore').click();
    assert.equal(await output.locator('.screen-text').innerText(), 'Together');
    await output.close();
    console.log('Desktop check: presentation and fullscreen passed.');

    // Sharing is opt-in: cancel first, then import the same file deliberately.
    const incoming = { version: 1, songs: [{ title: 'Shared song', lyrics: 'Shared lyrics', lines: 4, slides: [{ text: 'Shared lyrics', section: 'Verse', key: 'v' }] }] };
    const upload = { name: 'shared-library.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) };
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#import').setInputFiles(upload);
    await page.waitForFunction(() => document.getElementById('import').value === '');
    assert.equal(await page.locator('.song').count(), 2);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#import').setInputFiles(upload);
    await page.getByRole('button', { name: 'Shared song', exact: false }).waitFor();
    assert.equal(await page.locator('.song').count(), 3);
    console.log('Desktop check: library import passed.');

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=', 'base64');
    await page.locator('#background').setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() => document.getElementById('toast').textContent === 'Background saved for offline use');
    const backup = await page.evaluate(() => window.proMaxPrepareUpdate());
    assert.equal(backup.songs.length, 3);
    await fs.mkdir(path.join(__dirname, '..', 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(__dirname, '..', 'test-results', 'desktop.png'), fullPage: true });
    console.log('Desktop check: media storage passed.');
    const pdfWindowPromise = app.waitForEvent('window', { timeout: 30000 });
    await page.locator('#open-output').click();
    const pdfWindow = await pdfWindowPromise;
    await pdfWindow.locator('#stage').waitFor();
    await page.locator('#pdf').setInputFiles({ name: 'presentation.pdf', mimeType: 'application/pdf', buffer: pdfFixture() });
    await pdfWindow.locator('iframe').waitFor();
    await pdfWindow.waitForTimeout(1000);
    await pdfWindow.screenshot({ path: path.join(__dirname, '..', 'test-results', 'pdf.png') });
    assert.ok(pdfWindow.frames().some(frame => frame.url().startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/')), 'Built-in PDF viewer loaded');
    await page.locator('#restore').click();
    await pdfWindow.close();
    console.log('Desktop check: PDF passed. Restarting.');
    await closeApp();
    page = await launch();
    assert.equal(await page.locator('.song').count(), 3);
    assert.equal(await page.locator('#title').inputValue(), 'Smoke test song');
    await page.locator('#preview img.media').waitFor();
    assert.ok(await page.locator('#preview img.media').evaluate(img => img.complete && img.naturalWidth > 0));
    assert.deepEqual(errors, []);
    console.log('Desktop smoke passed: sandbox, updates bridge, songs, projector, fullscreen, navigation, blackout, PDF, import consent, persistent songs and background.');
  } finally {
    try {
      await closeApp();
      const resolved = path.resolve(directory);
      if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('promax-desktop-test-')) throw new Error('Unexpected test directory');
      try { await fs.rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
      catch (error) {
        if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code)) throw error;
        console.warn('Windows is still releasing the isolated test profile; leaving it for temporary-file cleanup.');
      }
    } finally { clearTimeout(deadline); }
  }
}
run().then(() => process.exit(0), error => { console.error(error); process.exit(1); });
