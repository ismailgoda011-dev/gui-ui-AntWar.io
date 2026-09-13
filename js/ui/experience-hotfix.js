function closePremiumOverlay(){
  document.querySelector('.antwar-ux-overlay .antwar-ux-close')?.click();
}

function syncPremiumControls(){
  const password=document.getElementById('room-password');
  if(password) password.type='password';
  const overlay=document.querySelector('.antwar-ux-overlay');
  if(overlay){
    overlay.querySelectorAll('button').forEach(button=>{
      if(!button.getAttribute('aria-label') && !button.textContent.trim()){
        button.setAttribute('aria-label', button.title || '');
      }
    });
  }
}

document.addEventListener('keydown', event=>{
  if(event.key==='Escape' && document.querySelector('.antwar-ux-overlay')){
    event.preventDefault();
    closePremiumOverlay();
  }
});

new MutationObserver(syncPremiumControls).observe(document.body,{childList:true,subtree:true});
