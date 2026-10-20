let editingSlide = null;

function openSlideEditor(index) {
  const song = current(), slide = song.slides[index];
  if (!slide) return;
  editingSlide = { song, slide, index, originalText:slide.text };
  $('slide-editor-title').textContent = `Edit slide ${index + 1}`;
  $('slide-edit-text').value = slide.text;
  $('slide-edit-section').value = slide.section;
  $('slide-edit-key').value = slide.key;
  $('slide-editor').showModal();
  $('slide-edit-text').focus();
}

function commitSlideEdit() {
  if (!editingSlide) return;
  const { song, slide, index } = editingSlide;
  if (!songs.includes(song) || song.slides[index] !== slide) return;
  slide.text = $('slide-edit-text').value.replace(/\r/g, '');
  if(slide.text!==editingSlide.originalText)delete slide.biblePassage;
  slide.section = $('slide-edit-section').value.replace(/[\[\]\r\n]/g, '').trim() || 'Slide';
  slide.key = $('slide-edit-key').value.trim().toLowerCase();
  // Keep the source in step with direct edits so generating slides again
  // retains the edited words and section names.
  song.lyrics = song.slides.map(s => `[${s.section}]\n${s.text}`).join('\n\n');
  if (current() === song) {
    $('lyrics').value = song.lyrics;
    renderSlides();
  }
  save();
  window.ProMaxMeetings?.render();
}

function bindSlideEditor() {
  $('slide-editor-form').onsubmit = event => {
    event.preventDefault();
    commitSlideEdit();
  };
  $('slide-save-live').type='button';
  $('slide-save-live').onclick=()=>{const index=editingSlide?.index;commitSlideEdit();$('slide-editor').close();if(index!==undefined)goLive(index);};
  for(const id of ['slide-edit-text','slide-edit-section','slide-edit-key'])$(id).oninput=commitSlideEdit;
  $('slide-edit-cancel').onclick = () => $('slide-editor').close();
  $('slide-editor').addEventListener('close', () => { editingSlide = null; });
}
