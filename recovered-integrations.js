/* Adapt the shared library to the complete app without replacing its data model. */
window.proMaxPrepareUpdate = () => {
  if (!save()) throw Error('Library could not be saved');
  window.promaxDesktop?.saveLibrary(lastSavedRaw);
  return JSON.parse(lastSavedRaw);
};
window.proMaxSharedHost = {
  snapshot: () => structuredClone(songs),
  selected: () => selected,
  async receive(incoming, groupId, stillAllowed) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = JSON.stringify(songs);
      const result = await ProMaxSharing.merge(songs, incoming, groupId, new Set([selected]));
      if (!stillAllowed()) return null;
      if (before !== JSON.stringify(songs)) continue;
      const previous = songs;
      // Add local slide identities while preserving received-song conflict metadata.
      songs = ProMaxLibraryData.normalize({ songs: result.songs }).songs;
      if (!save()) { songs = previous; throw Error('Could not save incoming songs. Create a backup and free some storage.'); }
      renderLibrary();
      return result;
    }
    throw Error('Songs are being edited. Sync again when you have finished typing.');
  }
};
