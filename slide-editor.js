let editingSlide = null;

function openSlideEditor(index) {
  const song = current(), slide = song?.slides[index];
  if (!slide) return;
  editingSlide = { song, slide, index, originalText:slide.text };
  showSlideEditor(slide,index);
}

function openPreparedSlideEditor(folderId,itemId,slideId) {
  const folder=meetingFolders.find(f=>f.id===folderId),item=folder?.items.find(i=>i.id===itemId);
  if(!item||!['text','bible'].includes(item.type))return;
  const index=item.slides.findIndex(s=>s.id===slideId),slide=item.slides[index];
  if(!slide)return;
  editingSlide={folder,item,slide,index,originalText:slide.text};
  showSlideEditor(slide,index);
}

function showSlideEditor(slide,index) {
  $('slide-editor').querySelector('p').textContent='Line breaks control the layout. Edits save automatically. Close keeps your changes; Show slide updates the presentation.'+(editingSlide.song?' Song edits also update Lyrics; Generate slides applies the lines-per-slide setting again.':'');
  $('slide-editor-title').textContent = `Edit slide ${index + 1}`;
  $('slide-edit-text').value = slide.text;
  $('slide-edit-section').value = slide.section||slide.label||'Slide';
  $('slide-edit-key').value = slide.key||'';
  $('slide-editor').showModal();
  $('slide-edit-text').focus();
}

function commitSlideEdit() {
  if (!editingSlide) return;
  const { song, folder, item, slide, index } = editingSlide;
  if(song?(!songs.includes(song)||song.slides[index]!==slide):(!meetingFolders.includes(folder)||!folder.items.includes(item)||item.slides[index]!==slide))return;
  slide.text = $('slide-edit-text').value.replace(/\r/g, '');
  if(slide.text!==editingSlide.originalText)delete slide.biblePassage;
  slide.section = $('slide-edit-section').value.replace(/[\[\]\r\n]/g, '').trim() || 'Slide';
  slide.key = $('slide-edit-key').value.trim().toLowerCase();
  // Keep the source in step with direct edits so generating slides again
  // retains the edited words and section names.
  if(song){
    song.lyrics = song.slides.map(s => `[${s.section}]\n${s.text}`).join('\n\n');
    if (current() === song) {
      $('lyrics').value = song.lyrics;
      renderSlides();
    }
  }else{
    slide.label=slide.section;
    window.ProMaxMeetings?.refresh();
  }
  scheduleSave();
  window.ProMaxMeetings?.render();
}

function bindSlideEditor() {
  $('slide-editor-form').onsubmit = event => {
    event.preventDefault();
    commitSlideEdit();
  };
  $('slide-save-live').type='button';
  $('slide-save-live').onclick=()=>{
    const edit=editingSlide;if(!edit)return;
    commitSlideEdit();$('slide-editor').close();
    if(edit.song){if(songs.includes(edit.song)&&edit.song.slides[edit.index]===edit.slide){selectSong(edit.song.id);goLive(edit.index);}}
    else if(meetingFolders.includes(edit.folder)&&edit.folder.items.includes(edit.item)&&edit.item.slides[edit.index]===edit.slide){
      ProMaxFeatures.showDeck({type:'bible',meetingItemId:edit.item.id,title:edit.item.title,slides:edit.item.slides},edit.index);
    }
  };
  for(const id of ['slide-edit-text','slide-edit-section','slide-edit-key'])$(id).oninput=commitSlideEdit;
  $('slide-edit-cancel').onclick = () => $('slide-editor').close();
  $('slide-editor').addEventListener('close', () => { editingSlide = null; });
}
