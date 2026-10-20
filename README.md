# ProMax Presenter

Windows presentation software for worship meetings. Version 1.2 restores the complete original application and combines it with GitHub updates and optional private group sharing.

## Install

Download **ProMax-Presenter-Setup-1.2.0.exe** from [GitHub Releases](https://github.com/VeDeJoGaming/ProMaxPresenter/releases/latest). Node.js is not needed. Existing installations can use **Update**. Close the presentation window before updating.

Your songs, folders, imported Bible and media stay local. Installation includes all **22 motion backgrounds**: the 16 original procedural styles and Nordlys, Blå tide, Gyllent lys, Purpurdis, Prisme and Etterklang. Open **Look & feel → Browse motion backgrounds**. No separate visual download is needed.

## Features

- Meeting folders and running orders with songs, Bible passages, text, video, YouTube and PowerPoint; drag/drop, undo/redo and automatic saving.
- Song sections, slide editing, keyboard shortcuts, quick text, countdown, PDF and blackout.
- Imported Bible search and verse selection; local video library and native YouTube preview/output.
- PowerPoint import through installed Microsoft PowerPoint on Windows.
- Native fullscreen presentation on the selected external screen. Use **Extend displays** in Windows, select the screen in Settings and press **Presentation off** to open output.
- Built-in offline motion backgrounds, custom media, and A/B/C looks, palettes and section-following for the original procedural styles.
- Full backup/restore in Settings, including IndexedDB media and converted presentations. Update backups also preserve meeting folders and all presentation settings.
- Optional invitation-only shared song library without accounts. Choose Off, Receive only, or Receive & share. Joining uploads nothing; sharing songs requires an explicit choice.

The app retains the stable application identity and profile folder (`ProMax Presenter`, `com.promax.presenter`). When an early reduced GitHub library and an original recovery copy coexist, songs from both and the original meeting folders are reunited. Keep backups before migrating between computers. Installation cannot recover data that is absent from that computer.

## Development

```sh
npm ci
npm test
npm run test:desktop
npm run test:shared
npm run test:backup
npm start
```

`npm run verify` exercises native output and the original feature suite on a Windows desktop with Microsoft PowerPoint. Tests use separate profiles. `npm run start:browser` serves the browser UI at localhost:4173; native display, updater and shared-group access require the desktop app.

`npm run dist:release` builds a Windows installer with the GitHub update feed and all backgrounds. A version increase on `main` triggers a verified release; manually dispatched builds produce drafts. See [PUBLISERING.md](PUBLISERING.md).

Private libraries, app profiles, transfer packages, tokens and imported Bible texts must never be committed or bundled. [SHARED-LIBRARY.md](SHARED-LIBRARY.md) documents group sharing. [ORIGINAL-FEATURES.md](ORIGINAL-FEATURES.md) preserves the original feature guide.
