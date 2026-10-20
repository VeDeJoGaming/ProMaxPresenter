# ProMax Presenter 1.0

A local worship presentation workspace. Songs, Bible text, motion backgrounds and local videos work offline. Optional YouTube streaming requires internet. The interface is in English.

## Start

Double-click **Install ProMax.cmd** to install for your Windows user. This adds **ProMaxPresenter** to the Start menu, desktop, and Windows Installed apps. Administrator access is not required. Run it again after building an updated version. Uninstall through Windows Settings; saved songs and settings remain in AppData.

Double-click **Start ProMax.cmd**, or open **dist/ProMax Presenter-win32-x64/ProMax Presenter.exe**. This launches the Electron desktop app. The packaged app does not require Node.js, Edge, Chrome, a server, or internet. To move it to another Windows PC, copy the entire **ProMax Presenter-win32-x64** folder, not just the executable.

The workspace uses a dark glass-inspired theme with warm red-to-yellow accents; presentation backgrounds remain independently configurable. App data is stored separately from the old browser version, under Windows AppData. Existing songs and settings in this desktop app are preserved when updating. PDFs remain session-only. **Settings** provides output-display selection, graphics quality, complete backups and restore. The old browser data is left intact.

## Development

Install Node.js, run `npm install`, then `npm start`. Run `npm test` for parser, recovery and backup integrity tests, `npm run smoke` for desktop presentation tests, and `npm run test:backup` for a full backup/restore round trip. `npm run verify` also tests local video, PowerPoint conversion and smooth playback; it requires the synthetic PowerPoint fixture used by `desktop/feature-smoke.js`. `npm run benchmark` measures all 16 motion backgrounds on the connected output. Run `npm run package` to build the portable Windows app, then **Install ProMax.cmd** to update the installed copy. The original browser version remains available with `node server.js` at http://127.0.0.1:4173, but native display control and PowerPoint conversion are only available in the desktop app.

## Smooth presentation and recovery

Open **Settings** in the header. Choose a specific output display or let ProMax choose automatically. A saved display is remembered, and a disconnected selected display produces a clear message. Change displays while presentation is off.

Changing background styles uses a **1.5-second crossfade**. Motion styles share one GPU canvas; rapid changes begin from the currently displayed blend. Text stays separate and updates immediately. Image and video backgrounds fade from a composited still frame and wait for the new media to decode. Blackout and explicit video, PowerPoint or PDF cues remain immediate.

Motion backgrounds now aim for **60 fps** on the output. **Automatic** starts with a background width of up to 1600 pixels and reduces resolution if sustained frame rate falls below 48 fps; it recovers detail after sustained smooth playback. **Smooth playback** uses up to 1280 pixels. **Maximum detail** uses up to 1920 pixels. Text always renders at native display resolution. Frame rate and background render size appear under the live preview when output is active. Actual performance depends on the computer, display and other running applications.

Operator motion previews use 480 pixels and up to 30 fps. Gallery previews use 640 pixels and 24 fps while hovered or focused. Hidden and covered operator previews pause; output keeps running when the control window loses focus or is minimized. Switching song slides reuses thumbnails and the live animation canvas. Still previews are cached. The output prevents display sleep while presentation is on. Only three upcoming local video cues are preloaded at a time, with the live and selected cue taking priority; the rest stay saved and prepare when selected or played. Blackout freezes local video position and clearing blackout resumes from that point.

Songs, meetings and settings are saved automatically in local storage, with a second recovery copy and additional atomic recovery files in the app-data `recovery` folder. The previous valid copy and up to 12 periodic snapshots are retained. On startup the app validates the library and recovers from the newest valid copy when possible. These automatic library copies do not include media; use a full backup to protect all content.

**Create full backup & restart** asks for a destination folder, closes the app and copies its closed data stores before reopening the workspace. The backup is a normal folder containing `promax-backup.json`, local storage, IndexedDB, converted PowerPoint images and recovery files. It includes songs, meeting folders, Bible text, video files, background media and YouTube links. PDF documents and undo history are session-only; YouTube login sessions and browser caches are excluded. Keep the complete backup folder together. Every backed-up file is recorded with its size and SHA-256 checksum.

**Restore backup & restart** validates the selected backup, restarts, creates a separate safety backup of the current data, verifies the staged files and restores the content. It remaps converted-slide paths when restoring into a different app-data folder. An incomplete or changed backup is rejected before replacing data. The settings window also provides **Open data folder**.

## Meeting folders and automatic saving

Create a folder with **＋** beside **Meetings**. **Add songs** lets you search and add existing songs; **Create song** creates a new song for the folder. In Bible, select verses and choose **Add passage to meeting**. Videos and PowerPoint have **＋ Meeting** actions, and Quick Cues can add a text slide. The folder contains only its own running order. Drag to reorder entries, or drag to another folder to move them. Hold Ctrl during the drag to copy instead. Use × or Delete to remove a selected entry without deleting its source. Choose an item to prepare it, then click a slide or Play to present it. **All songs** opens the general song library. Folder names, ordering, content and edits save automatically and return after restarting.

Inside a folder, the left sidebar contains only that folder’s songs, Bible passages, text, videos, YouTube links and presentations. Selecting an item opens its own slides or video page in the center; selecting does not change the live presentation. Click a slide or Show on presentation to send it live. The last selected item is restored when reopening the folder. Use Back to Meetings to return to the folder browser, and Add content to choose Bible passages, videos or PowerPoint. Live controls remain on the right. Lyrics, appearance and quick cues can be folded away. There are no Save, Export library or Import library buttons.

## Present

While presentation is active, the desktop output stays above ordinary application windows and the Windows taskbar. Opening or focusing another app does not cover it. The output is also excluded from Windows Peek, so hovering another app's taskbar thumbnail does not fade out the presentation. The output has no separate taskbar button and cannot be minimized manually; use **Presentation on** in the control window to release the display. Windows security screens (such as Ctrl+Alt+Delete or UAC) remain controlled by Windows.

### Editing controls

**Ctrl+Z** undoes saved edits, deletion, imports and rearranging. **Ctrl+Shift+Z** or **Ctrl+Y** redoes them. Text fields retain their native text undo. Recent undo history (up to 100 edit groups) stays available until the app closes. Deleted video files remain recoverable during that session.

Select the bottom of a slide or an item in the sidebar, then press **Delete** to remove it, **Ctrl+D** to duplicate it, or **Alt+↑ / Alt+↓** to move it. **F2** edits a song slide or renames a song, folder or meeting entry. **Ctrl+F** focuses the Bible search or sidebar search; **Ctrl+S** saves immediately alongside automatic saving. **F1** or **Shortcuts** opens the shortcut guide.

Drag song slides, prepared Bible/text slides, PowerPoint slides, songs, folders and meeting entries to reorder them. Drag songs, Bible results, videos, YouTube cards or PowerPoint headings onto a folder or its running order to add them. Folder targets appear while dragging from inside a folder. Organizing content, including undo and redo, keeps the current live cue playing.

### Motion background library

In **Look & Feel**, click **Browse motion backgrounds**. The curated library has 16 rebuilt styles. Velocity Streams, Bloom Rays, Neon Depth, Sacred Light, Orbital Dust and Still Waters lead the gallery, followed by improved clouds, silk, bokeh, stars, halos and glass. The gallery compares A/B/C side by side; hover a tile to see all three move. Removed styles map saved selections to the closest retained background.

A/B/C share the same framing and object positions. Their differences primarily come from light intensity, additional particles or frames, and faster movement. Existing frames, rings, glass ribs, stars and light sources retain their geometry. The ocean keeps a fixed horizon and moves one sun continuously downward; the cross gradually fills and changes its glow at a fixed size. Live backgrounds render directly on the GPU with optical bloom, refraction, procedural atmosphere and reflective water. **Follow song sections** maps verses to A, choruses to B and bridges/pre-choruses to C. Turn it off to select a look manually. Choose Original, a palette, My color or My gradient (main, highlight, depth). Movement can follow the style default, be very calm, gentle or energetic. Color, look and movement changes interpolate one continuous scene over 5 seconds while text changes in 0.18 seconds. Transitions can reverse or change targets midway without restarting the animation or displaying duplicate objects. All animations loop continuously; periods range from 12 to 100 seconds depending on movement and A/B/C. Slide thumbnails are still frames and gallery previews animate on hover or keyboard focus. Choices save automatically. Artwork is original and rendered locally without downloads or internet.

### Dynamic Glass

Choose **Dynamic Glass** in the **Glass** collection. Select Gold, Blue, Purple, Rose, Green or Silver under Look & Feel. **Follow song sections** automatically chooses A for verses, B for choruses/refrains and C for bridges (including Norwegian Vers, Refreng and Bro). Disable it to choose A/B/C manually. Background changes interpolate for 5 seconds while lyrics appear with a separate 180 ms fade. The seamless loop continues between slides and follows the selected movement speed. Colors and preferences are saved locally.

### Song and presentation controls

Each song slide has an **Edit** button. Changes to text, section and shortcut save automatically as you type. **Close** returns to the workspace; **Show slide** presents the edited slide. Editing alone keeps the current live output unchanged. Edits update Lyrics too; Generate slides reapplies the selected lines-per-slide setting.

1. Create a song and paste lyrics. Blank lines start a new slide. Section headings support brackets (`[Verse 1]`, `[Chorus]`, `[Bridge]`) and colons (`Vers 1:`, `Refreng:`, `Vers 2:`, `Bro:`). English colon headings such as `Verse 1:` and `Chorus:` also work. Headings become section labels and do not appear in the slide text. Norwegian verses use the V shortcut, refrains use C, and bridges use B. Click **Generate slides** after pasting or editing lyrics.
2. Choose the maximum lines per slide and click **Generate slides**. Changes to lyrics need regeneration.
3. Click **Presentation off** to turn the output on. With two displays in Windows Extend mode, the desktop app opens a borderless window in native fullscreen on the other display. With more displays, it prefers a non-primary display other than the control screen. Click **Presentation on** to close the output and release the display. Closing the output, disconnecting its display, or quitting the app also closes/resets the presentation. No browser fullscreen permission or double-click is required in the desktop app.
4. Click a slide, use arrow keys or Space, or assign any single-character shortcut below a thumbnail. Matching shortcuts cycle through slides. Escape toggles blackout when outside a text field; fullscreen may consume Escape first.
5. Use temporary text, countdown, or a local PDF. Click a song slide to resume the song.

Songs and settings are saved in this browser's local storage. Background images and videos are copied into IndexedDB; videos loop muted. Meeting folders, their running orders, quick text drafts and slide edits save automatically. Import/export library buttons are removed. Keep original media files. Clearing browser data removes the local library and background. PDFs are held for the current session, with controls provided by the browser viewer. Media and PDF require no internet after selection.

## Bible import and presentation

Open the **Bible** tab and select **Import Bible text**. Import your own Bibelen 2011 or other translation as JSON, CSV, TSV, plain verse text, OSIS XML (verses containing their text), or Zefania XML. No Bible text is bundled or downloaded. PDF, EPUB and encrypted Bible applications are not supported import sources.

JSON format: `{"name":"Bibelen 2011","verses":[{"book":"Johannes","chapter":3,"verse":16,"text":"Your verse text"}]}`. Nested JSON with `books`, `chapters` and `verses` is also supported. CSV/TSV columns are `book,chapter,verse,text`; CSV accepts comma or semicolon delimiters and quoted text. Plain text uses one verse per line, such as `Johannes 3:16 Your verse text`. Norwegian book names, common Norwegian abbreviations, and OSIS book identifiers are recognized.

Results update automatically as you type, with no Search button. Enter **Mat** to see Matteus starting at 1:1, or **Mat 1.1** for a specific verse. Search by reference, for example **Joh 3:16–18**, a whole chapter such as **Johannes 3**, or words in the verse text. Click a result to present it immediately. Select several verses and choose **Show selected passage** to present them in groups of two, using the previous/next buttons or arrow keys. Choose **Add passage to song library** to keep a passage as a reusable slide deck. Slides show small raised verse numbers and a compact reference (for example Matteus 16:26-27). The translation name is omitted from the slide. Long text automatically scales down to fit. Imported Bible text remains available offline after restarting.

## Local video library

### YouTube

In **Videos**, paste a YouTube link and optionally name it. Standard, short, Shorts, Live and embed links are supported, including start times. Links save automatically and can be added to a meeting. The desktop app now uses an isolated Chromium browser with the ordinary YouTube website and quality menu. **Prepare** plays silently in the operator preview for about ten seconds, then pauses and seeks back to the starting point. Choose the desired resolution using YouTube's gear menu. Status shows the actual decoded resolution and buffered seconds. **Show on presentation** transfers that same browser view to the native presentation window without loading a second page; returning to lyrics transfers it back and mutes it. Blackout hides and pauses the browser. The output stays above other applications. A colour-theme refresh triggered by moving the browser is suppressed to preserve playback state.

This warm-up can improve startup, but does not guarantee a particular resolution, uninterrupted streaming or the absence of ads. Some videos or locations may require responding to YouTube consent or other prompts in the preview. The browser has its own saved session and does not read Chrome's profile. Its remote page has no access to the app's Node.js or desktop bridge. The standalone web version retains the official embedded-player fallback, which only cues the player.

YouTube may still show ads. **Attach local copy** lets you choose a local video file for the entry. The app then prioritizes that saved local file, using native video preloading without YouTube ads or internet streaming. This does not download the YouTube video; supply the video file yourself. Links and attached-file associations are saved locally. Unused players are released so preparing links does not create an unlimited collection of background players.

Open **Videos**, then **Add local videos**. Files are copied into the local app library and prepared using video preloading. Saved videos are restored on startup. Up to three upcoming cues are prepared; additional videos prepare when selected or played. **Ready** means the first frames can be played; preparation of a large file may take longer. MP4 and WebM are recommended; codec support determines whether other formats can be played.

Choose **Play**, **Pause/Resume**, **Restart**, **Stop**, **Loop**, or **Mute audio**. Preview is always muted. Audio plays only from the presentation window, so turn presentation on before playing an audible cue. Blackout hides and silences the video; clearing blackout resumes at the current cue position. Video cues retain their original aspect ratio with black bars where needed. Clicking a song slide returns to lyrics. Imported files remain available even if their original is moved or deleted.

## PowerPoint import

Open **PowerPoint**, then **Import PowerPoint** and choose a `.pptx`, `.ppt`, `.ppsx`, or `.pps` file. Microsoft PowerPoint must be installed for conversion. The app saves each slide as a 1920-pixel-wide image with its original aspect ratio, so the imported deck works offline and does not need the original file or PowerPoint for subsequent playback. Click a thumbnail to present it, then use previous/next or the arrow keys to navigate. Import preserves the rendered slide layout; animations, transitions, embedded videos and audio are not played. Export to PDF remains available as an alternative.

Songs and settings are saved in local storage; imported Bible text and video files use IndexedDB under the app's Windows AppData directory. Converted PowerPoint slides are saved under the same app data directory in `presentations`. Use **Settings → Create full backup & restart** to preserve all saved content. Automatic recovery files cover songs, meetings and settings; complete backups also include the Bible database, video library, PowerPoint slides and background files. Uninstalling or updating the app preserves app data.

## Scope

Includes lyrics, sections, custom slide shortcuts, meeting folders and running orders, undo/redo, native fullscreen output with display selection, static/video backgrounds, 16 motion backgrounds, adaptive graphics quality, temporary text, countdown, PDF viewing, Bible import/search/passage presentation, local videos, optional YouTube playback, PowerPoint slide import, complete backup/restore, library recovery and Windows installation.

The presentation window uses its full dimensions: select a projector resolution with the aspect ratio you need. Preview thumbnails use 16:9. Browser autoplay is muted; if playback is blocked, interact with the presentation window.

