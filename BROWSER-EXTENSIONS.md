# YouTube extensions and timers

Start a YouTube or local video, open Quick cues, choose Countdown or Stopwatch,
then Start. The timer appears over the current video. Choose any of the nine
positions while it runs. Pause/Resume affects only the timer; Stop removes it
without changing the video. A new presentation cue cancels the timer. Blackout
hides everything while the clock continues, as it does for standalone timers.
Duration, timer mode and placement are saved; running timers are not resumed
after an app restart.

In Settings → Presentation, use Install uBlock Origin for the official Chromium
release from <https://github.com/gorhill/uBlock/releases>. ProMax verifies the
download against the SHA-256 digest and size published by GitHub. Installation
requires internet and applies to this computer's dedicated YouTube session.
Turn off Presentation before changing extensions and prepare the video again.
The extension has its own settings, enable/disable and removal controls.
No extension is silently downloaded on app startup. There is no automatic
extension version update; remove and install again to choose a newer release.

Add extension folder accepts unpacked Chrome extensions with manifest.json.
Electron supports a subset of Chrome APIs; arbitrary store extensions and uBlock
Origin Lite are not claimed to be compatible. Ad blocking on YouTube depends on
YouTube and upstream filter updates and cannot be guaranteed for every video.

## Maintenance

`desktop/browser-extensions.cjs` owns the persistent YouTube partition. Extension
code, storage, installation metadata and downloads live only in the local user
profile, separately from the song library and its sharing/sync data. They are
never put in Git or uploaded to song groups. The controller checks the calling
window and refuses changes while a presentation window exists. Network content
keeps sandboxing, context isolation and Node disabled.

Electron 44 needs compatibility beyond simply calling loadExtension:

- electron-chrome-extensions 4.10.0 (MIT) supplies tab/window/action APIs.
- `desktop/extension-compat.cjs` generates a local preload and API adapter from
  that pinned dependency. uBO's page module graphs are bundled locally with
  esbuild and run as deferred classic scripts. This preserves a single extension
  API/module context for filtering and runtime messaging in Electron.
- Chrome webRequest reports tabId=-1 in this runtime. The adapter uses the
  registered tab API and initiator origin to associate requests with the video
  tab. Extension-origin background traffic stays separate. Undefined optional
  filter properties are omitted before calling the native API.
- The original downloaded/extracted extension is never modified. Only a managed
  local copy is adapted, with upstream GPL notices retained. No uBO source or
  generated uBO bundle is redistributed in the application or repository.
- Startup verifies uBO has finished starting its filter listeners. A failed
  startup is reported as a load error rather than an enabled blocker.

Tests: `test/youtube-timers-desktop.cjs`, `test/browser-extensions-desktop.cjs`,
`test/timer-preview-browser.cjs`, and countdown/stopwatch unit tests. To include
the real official extension in the desktop test, set PROMAX_UBLOCK_FOLDER to an
unmodified extracted Chromium release. The default fixture tests actual network
cancellation, disable/enable, reload, restart and removal without external
requests. All desktop checks use isolated synthetic profiles.
