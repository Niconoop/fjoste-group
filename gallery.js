// Gallery script
// Configure images: paths are relative to site root. Edit this array to list files from img/galerie.
// Example:
// { file: 'img/galerie/truck1.jpg', caption: 'Bei Sonnenuntergang' }

const GALLERY_IMAGES = [
  { file: 'img/galerie/eut2_hq_69333f3c.png', caption: 'Das ist ein Test' },
  { file: 'img/galerie/eut2_hq_6934202b.png', caption: '' },
  { file: 'img/galerie/eut2_hq_69345798.png', caption: '' },
  { file: 'img/galerie/eut2_hq_694869e1.png', caption: '' },
  { file: 'img/galerie/eut2_hq_694869f6.png', caption: '' },
  { file: 'img/galerie/eut2_hq_69486a5d.png', caption: '' },
  { file: 'img/galerie/eut2_hq_69486b3a.png', caption: '' },
  { file: 'img/galerie/eut2_hq_69486b6e.png', caption: '' },
  { file: 'img/galerie/eut2_hq_69486bed.png', caption: '' },
  { file: 'img/galerie/eut2_hq_694b1b3b.png', caption: '' },
  { file: 'img/galerie/eut2_hq_694bc59f.png', caption: '' }
];

function createCard(item, idx){
  const article = document.createElement('article'); article.className = 'member-card';
  const img = document.createElement('img'); img.className = 'member-avatar'; img.src = item.file; img.alt = item.caption || `Bild ${idx+1}`;
  const caption = document.createElement('div'); caption.className = 'member-role'; caption.textContent = item.caption || '';
  caption.dataset.index = idx;
  // open lightbox on click
  img.addEventListener('click', ()=> openLightbox(item));
  article.appendChild(img);
  article.appendChild(caption);
  return article;
}

function renderGallery(){
  const root = document.getElementById('gallery');
  root.innerHTML = '';
  if(!GALLERY_IMAGES.length){
    root.innerHTML = '<div class="empty">Keine Bilder konfiguriert. Bearbeite <code>gallery.js</code> und füge Bildobjekte hinzu.</div>';
    return;
  }
  GALLERY_IMAGES.forEach((it, idx)=> {
    const card = createCard(it, idx);
    root.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', ()=> {
  // create lightbox modal and expose opener before rendering gallery
  const overlay = document.createElement('div'); overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<div class="lightbox" role="dialog"><button class="close-btn" aria-label="Schließen">✕</button><img src="" alt=""><div class="caption"></div></div>`;
  document.body.appendChild(overlay);
  const box = overlay.querySelector('.lightbox');
  const boxImg = box.querySelector('img');
  const boxCaption = box.querySelector('.caption');
  const closeBtn = box.querySelector('.close-btn');
  function closeLightbox(){ overlay.classList.remove('open'); document.removeEventListener('keydown', onEscLightbox); }
  function onEscLightbox(e){ if(e.key === 'Escape') closeLightbox(); }
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeLightbox(); });
  closeBtn.addEventListener('click', closeLightbox);
  // expose global opener so createCard can reference it
  window.openLightbox = function(item){
    boxImg.src = item.file;
    boxImg.alt = item.caption || '';
    boxCaption.textContent = item.caption || '';
    overlay.classList.add('open');
    document.addEventListener('keydown', onEscLightbox);
  };

  renderGallery();
});