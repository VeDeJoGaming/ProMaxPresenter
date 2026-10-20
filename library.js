(function (root) {
  const fail = () => { throw new Error('This is not a valid ProMax library file.'); };
  function normalizeLibrary(data) {
    if (!data || !Array.isArray(data.songs) || data.songs.length > 10000) return fail();
    if (data.version !== undefined && data.version !== 1) return fail();
    const songs = data.songs.map(song => {
      if (!song || typeof song.title !== 'string' || song.title.length > 1000 || typeof song.lyrics !== 'string' ||
          song.lyrics.length > 1000000 || !Array.isArray(song.slides) || song.slides.length > 10000) return fail();
      return {
        id: typeof song.id === 'string' ? song.id : '', title: song.title, lyrics: song.lyrics,
        lines: [2, 4, 6, 8].includes(song.lines) ? song.lines : 4,
        ...(song.shared && typeof song.shared.groupId === 'string' && typeof song.shared.songId === 'string' &&
          Number.isSafeInteger(song.shared.revision) && song.shared.revision > 0 && /^[a-f0-9]{64}$/.test(song.shared.baseline) ?
          { shared: {groupId:song.shared.groupId,songId:song.shared.songId,revision:song.shared.revision,baseline:song.shared.baseline} } : {}),
        slides: song.slides.map(slide => {
          if (!slide || typeof slide.text !== 'string' || slide.text.length > 100000 || typeof slide.section !== 'string' ||
              slide.section.length > 1000 || typeof slide.key !== 'string' || slide.key.length > 1) return fail();
          return { text: slide.text, section: slide.section, key: slide.key.toLowerCase().trim() };
        })
      };
    });
    const source = data.settings || {};
    const settings = {
      color: /^#[\da-f]{6}$/i.test(source.color) ? source.color : '#142a39',
      fontSize: typeof source.fontSize === 'number' && source.fontSize >= 3 && source.fontSize <= 9 ? source.fontSize : 5,
      align: source.align === 'left' ? 'left' : 'center'
    };
    return { songs, selected: typeof data.selected === 'string' ? data.selected : '', settings };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeLibrary };
  else root.ProMaxLibrary = { normalizeLibrary };
})(typeof window === 'undefined' ? globalThis : window);
