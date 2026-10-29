# ProMax Presenter

Windows presentation software for worship meetings. Version 1.4 adds quick opening, song favorites, an indexed Bible reader, explicit group Bible sharing, operator notes and meeting checks.

## Install

Download the published installer from [GitHub Releases](https://github.com/VeDeJoGaming/ProMaxPresenter/releases/latest). Locally built installers are in `dist/`. Node.js is not needed. Existing installations can use **Update** after a release is published. Close the presentation window before updating.

Your songs, folders, imported Bible and media stay local. This development branch includes **29 motion backgrounds and 12 still artwork families**, including Paint Sweeps, Winter Reverie, Stellar Awakening, Empty Tomb, Three Crosses and Bethlehem Night. Open **Look & feel → Browse backgrounds** to search, filter categories, star favorites and compare backgrounds with sample lyrics. The procedural families have A/B/C looks; the two recolorable artwork families use manual material colors. No separate visual download is needed.

## Features

- **Ctrl+K** searches song titles and lyrics, meetings, imported Bible references/text, local videos, PowerPoint and saved YouTube links. Use the content filters to narrow results. Bible results open their chapter with the verse marked; media opens for preparation. Opening a result keeps the live cue unchanged.
- Personal song favorites: mark the selected song with **☆ Favorite** and use **★ Favorites** to filter the library.
- Operator notes for meetings and individual running-order items save automatically, support undo/redo and stay off the presentation screen.
- **Running sheet** adds a planned start time and minutes per item, shows timings in the sidebar and exports a PDF or plain text. Missing durations leave later start times unknown. Operator notes are excluded from export until explicitly selected; switch between whole-meeting and selected-item notes in the notes panel.
- Alphabetical Norwegian song ordering and automatic cleanup of empty, inactive drafts; song order in meetings stays as arranged.
- Search song titles and lyrics in the library and meeting picker; title matches come first, with lyric excerpts and support for accents and Nordic letters.
- **Check meeting** checks the running order for missing songs, ungenerated slides, missing video files and local PowerPoint slide images; flags online YouTube entries and offers undoable replacements or slide generation without changing the live cue.
- Meeting folders and running orders with songs, Bible passages, text, video, YouTube and PowerPoint; drag/drop, undo/redo and automatic saving.
- Song sections, slide editing, keyboard shortcuts, quick text, countdown, PDF and blackout.
- Indexed Bible search, full chapter context, previous/next chapter navigation across books, Shift-click range selection and Clear selection; local video library and native YouTube preview/output.
- PowerPoint import through installed Microsoft PowerPoint on Windows.
- Native fullscreen presentation on the selected external screen. Use **Extend displays** in Windows, select the screen in Settings and press **Presentation off** to open output.
- Built-in offline motion backgrounds, custom media, and A/B/C looks, palettes and section-following for the original procedural styles.
- Full backup/restore in Settings, including IndexedDB media and converted presentations. Update backups also preserve meeting folders and all presentation settings.
- Optional invitation-only shared song library and explicit Bible sharing without accounts. Choose Off, Receive only, or Receive & share. Receive & share automatically uploads all own songs and edits on sync, including new songs and named drafts; received songs stay local.

The app retains the stable application identity and profile folder (`ProMax Presenter`, `com.promax.presenter`). When an early reduced GitHub library and an original recovery copy coexist, songs from both and the original meeting folders are reunited. Keep backups before migrating between computers. Installation cannot recover data that is absent from that computer.

## Development

```sh
npm ci
npm test
npm run test:desktop
npm run test:shared
npm run test:visuals
npm run test:backup
npm start
```

`npm run verify` exercises native output and the original feature suite on a Windows desktop with Microsoft PowerPoint. Tests use separate profiles. The shared-library test covers three computers, including restoring the owner's access and downloading their own previously shared songs. `npm run start:browser` serves the browser UI at localhost:4173; native display, updater and shared-group access require the desktop app.

`npm run dist:release` builds a Windows installer with the GitHub update feed and all backgrounds. A version increase on `main` triggers a verified release; manually dispatched builds produce drafts. See [PUBLISERING.md](PUBLISERING.md).

Private libraries, app profiles, transfer packages, tokens and imported Bible texts must never be committed or bundled. [SHARED-LIBRARY.md](SHARED-LIBRARY.md) documents group sharing. [ORIGINAL-FEATURES.md](ORIGINAL-FEATURES.md) preserves the original feature guide.
