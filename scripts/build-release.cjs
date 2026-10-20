const { build, Platform, Arch } = require('electron-builder');
const fs = require('node:fs');
const path = require('node:path');
const packageInfo = require('../package.json');

function releaseSettings(env = process.env, local = {}) {
  const slug = env.GITHUB_REPOSITORY || local.repository || '';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
    throw new Error('Choose your GitHub repository first. See PUBLISERING.md. Local test installers can be built with npm run dist.');
  }
  const version = env.RELEASE_VERSION || packageInfo.version;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('Use a stable version such as 1.0.1 (without v).');
  const [owner, repo] = slug.split('/');
  return { owner, repo, version };
}

async function run() {
  const configFile = path.join(__dirname, '..', 'release-config.local.json');
  const defaultConfig = path.join(__dirname, '..', 'release-config.json');
  const local = JSON.parse(fs.readFileSync(fs.existsSync(configFile) ? configFile : defaultConfig, 'utf8'));
  const { owner, repo, version } = releaseSettings(process.env, local);
  console.log(`Building ProMax ${version}. Updates: https://github.com/${owner}/${repo}/releases`);
  await build({
    targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64), publish: 'never',
    config: {
      extraMetadata: { version },
      forceCodeSigning: process.env.PROMAX_REQUIRE_SIGNING === 'true',
      publish: [{ provider: 'github', owner, repo, releaseType: 'draft' }]
    }
  });
}
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { releaseSettings };
