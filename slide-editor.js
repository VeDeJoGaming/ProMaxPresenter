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
  $('slide-editor-form').querySelector(':scope > p').textContent='Line breaks control the layout. Edits save automatically. Close keeps your changes; Show slide updates the presentation.'+(editingSlide.song?' Song edits also update Lyrics; Generate slides applies the lines-per-slide setting again.':'');
  $('slide-editor-title').textContent = `Edit slide ${index + 1}`;
  $('slide-edit-text').value = slide.text;
  $('slide-edit-section').value = slide.section||slide.label||'Slide';
  $('slide-edit-key').value = slide.key||'';
  updateSlideImageEditor();
  $('slide-editor').showModal();
  $('slide-edit-text').focus();
}

function updateSlideImageEditor(){
  const image=$('slide-image-preview');if(!image)return;
  const source=editingSlide?.slide.image;
  image.hidden=!source;if(source)image.src=source;else image.removeAttribute('src');
  $('slide-remove-image').disabled=!source;
}

async function importSlideImage(file){
  const target=editingSlide;if(!target||!file)return;
  const image=new Image(),url=URL.createObjectURL(file);
  try{
    image.src=url;await image.decode();
    const scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const source=canvas.toDataURL('image/webp',.85);
    if(editingSlide!==target)return;
    target.slide.image=source;commitSlideEdit();updateSlideImageEditor();
  }catch{notify('Bildet kunne ikke åpnes. Velg en PNG-, JPEG- eller WebP-fil.');}
  finally{URL.revokeObjectURL(url);}
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
  const images=document.createElement('section');images.id='slide-image-editor';images.setAttribute('aria-label','Bilde på lysbildet');
  const controls=document.createElement('div');controls.className='slide-image-actions';
  const picker=ProMaxFilePicker.create({text:'Legg til / bytt bilde',key:'slide-image',accept:'image/png,image/jpeg,image/webp,image/gif',onFiles:files=>importSlideImage(files[0])});
  const remove=document.createElement('button');remove.id='slide-remove-image';remove.type='button';remove.textContent='Fjern bilde';
  remove.onclick=()=>{if(!editingSlide)return;delete editingSlide.slide.image;commitSlideEdit();updateSlideImageEditor();};
  const preview=document.createElement('img');preview.id='slide-image-preview';preview.alt='Bilde på dette lysbildet';preview.hidden=true;
  const hint=document.createElement('p');hint.textContent='Bildet gjelder bare dette lysbildet. Lagres automatisk.';
  controls.append(picker,remove);images.append(controls,preview,hint);$('slide-editor-form').querySelector('.slide-edit-fields').before(images);
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
