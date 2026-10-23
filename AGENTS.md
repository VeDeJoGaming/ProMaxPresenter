# ProMax project instructions

Keep the same ProMax theme across the desktop app, sharing dialogs, invitation website and visual library. The user's colors are **red and orange**. Use the warm dark surfaces, red branding, orange actions, typography, buttons and panel styling defined in `theme.css`.

`theme.css` is the source of truth. The visual gallery embeds it through `scripts/build-visuals.cjs`; the hosted sharing project uses an identical copy in its `app/theme.css`. Update both when changing the theme. Rebuild the visual gallery and preview the affected surfaces before publication.

Presentation backgrounds may use their own artistic palettes; their surrounding controls and library follow the shared ProMax theme.

## Update the installed local app

After every completed application change, build and update the installed ProMax Presenter on the current computer and verify that the installed app runs the changed code. Preserve all user content and settings. Updating source files or pushing to GitHub alone does not complete the task. Do not interrupt an active presentation. If installation or verification is blocked, explicitly report that the installed app is not yet updated and record the remaining steps in `FORTSETT-HER.md`. This local update does not authorize publishing a release or merging into main.

## Continue between PC and laptop

Read `FORTSETT-HER.md` at the start of work. The shared development branch is `work/pc-laptop` on origin. Before editing, fetch origin and fast-forward this branch when the checkout is clean. Preserve uncommitted edits and reconcile divergent history without resetting or force-pushing.

The user has requested that completed development work be available on the other computer even when this one is off. At the end of each completed task, review the diff and new files, run appropriate checks, update `FORTSETT-HER.md` with the current state and any unfinished work, commit the reviewed project files, and push `work/pc-laptop`. Verify the remote commit before reporting synchronization complete. If a push fails, keep local work and explicitly say it has not reached the other computer yet. Do not merge into main or publish a release merely to synchronize work.

Never commit private songs, Bible contents, imported media, user profiles, access keys, transfer folders or backups. App contents must use the authenticated Shared library service; GitHub holds only application source, original visual assets and development notes. Never automatically upload an entire user profile to a shared song group.
