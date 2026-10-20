const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { normalizeLibrary } = require('../library.js');
const { backupLibrary } = require('../desktop/backup.cjs');
const { releaseSettings } = require('../scripts/build-release.cjs');
const library = { version: 1, songs: [{ id: 'song-1', title: 'Test', lyrics: 'A\nB', lines: 4, slides: [{ text: 'A\nB', section: 'Verse', key: 'v' }] }], selected: 'song-1', settings: { color: '#142a39', fontSize: 5, align: 'left' } };

test('library and selected song survive a backup and restore', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'promax-backup-'));
  try {
    const file = await backupLibrary(directory, library, '1.0.0');
    const restored = normalizeLibrary(JSON.parse(await fs.readFile(file, 'utf8')));
    assert.deepEqual(restored, normalizeLibrary(library));
    assert.equal((await fs.readdir(directory)).length, 1);
    await assert.rejects(backupLibrary(directory, { songs: [{}] }, '1.0.0'));
    assert.equal((await fs.readdir(directory)).length, 1);
  } finally {
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('promax-backup-')) throw Error('Unexpected test directory');
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test('import rejects unsupported versions and malformed slide data', () => {
  for (const data of [null, {}, { ...library, version: 2 }, { songs: [{ ...library.songs[0], slides: [null] }] }, { songs: [{ ...library.songs[0], slides: [{ text: 'A', section: 'v', key: 'xx' }] }] }]) {
    assert.throws(() => normalizeLibrary(data));
  }
});
test('import discards unknown fields and invalid presentation settings', () => {
  const data = normalizeLibrary({ ...library, settings: { color: 'url(https://example.com)', fontSize: Infinity, align: 'bad' }, token: 'secret' });
  assert.deepEqual(data.settings, { color: '#142a39', fontSize: 5, align: 'center' });
  assert.equal(data.token, undefined);
});
test('release builds require an explicit repository and stable version', () => {
  assert.throws(() => releaseSettings({}));
  assert.throws(() => releaseSettings({ GITHUB_REPOSITORY: 'owner/repo', RELEASE_VERSION: 'v1.0.0' }));
  assert.throws(() => releaseSettings({ GITHUB_REPOSITORY: 'https://github.com/owner/repo' }));
  assert.deepEqual(releaseSettings({ GITHUB_REPOSITORY: 'owner/repo', RELEASE_VERSION: '1.2.3' }), { owner: 'owner', repo: 'repo', version: '1.2.3' });
});
