# ProMax Presenter

Offline song and worship presentation for Windows, with optional private group sharing. Your library and backgrounds remain available on your computer. No account is required.

## Install and update

Install the setup file from the project's GitHub Releases. An installed release checks for updates shortly after startup. Click **Update** to download, back up your library, install and restart. Close the presentation window first. Songs and background media are kept across updates. Without internet, presenting continues normally.

Local test installers have updates disabled until built with a real release repository. See [PUBLISERING.md](PUBLISERING.md) for the complete Norwegian publishing guide and signing setup.

## Present

1. Create a song and paste lyrics. Blank lines start a new slide. Use [Verse 1], [Chorus] and [Bridge] headings.
2. Choose lines per slide and click **Generate slides**. Regenerate after changing lyrics.
3. Click **Open presentation**, move the window to your projector, and double-click for fullscreen.
4. Click a slide, use arrow keys or Space, or assign a one-character shortcut below a thumbnail. Repeated shortcuts cycle through matching slides. Escape toggles blackout outside text fields; fullscreen may consume Escape first.
5. Use temporary text, a countdown, or a local PDF. **Return to selected slide** resumes the song.

Images and muted looping videos are copied into local storage for offline use. PDFs last for the current session and use the built-in PDF viewer. Export PowerPoint to PDF first. The presentation fills its window; preview thumbnails use 16:9.

## Back up or share songs

**Export library** saves songs and settings as JSON, without media. Send that file to someone else to share manually. **Import library** previews how many songs will be added and asks before importing. It preserves existing songs. No library is uploaded automatically.

Keep exported backups and original media. Desktop data lives in %APPDATA%/ProMax Presenter; deleting this folder removes your library. The ten most recent pre-update song backups are kept in its backups folder.

To move from the browser edition, export there and import in the desktop edition. Select background media again.

## Development

Node.js 24 is recommended. Run npm ci, then npm start. Check with npm test and npm run test:desktop. Build a local Windows installer with npm run dist.

The original browser edition remains available via **Start ProMax.cmd** or npm run start:browser at http://127.0.0.1:4173. Its songs are stored in that browser. It does not receive desktop updates.

Bible import/search, YouTube support, service playlists, native PowerPoint import and per-song backgrounds are future ideas. No copyrighted Bible text is bundled. Source redistribution rights have not yet been chosen (UNLICENSED).

## Shared library

Create a private group or join with an invitation in the Windows app. Choose **Off**, **Receive only**, or **Receive & share**. Uploading your existing songs always requires a separate choice. See [the shared library guide](SHARED-LIBRARY.md) for invitations, offline use, access recovery and service operation.

## Visual backgrounds and theme

Six original animated SVG backgrounds are in `visuals/`. Open `visuals/index.html` for a preview, then choose a background with **Add image or video background** in ProMax. Releases include a matching visual pack ZIP. Run `node scripts/build-visuals.cjs` to rebuild the gallery.

The desktop app, sharing page and visual gallery use the same palette and controls from `theme.css`. The theme rules for future changes are recorded in [AGENTS.md](AGENTS.md).

