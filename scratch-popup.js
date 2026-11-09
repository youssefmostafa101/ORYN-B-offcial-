// ORYN-B: both sign-up forms share ONE server-side EmailOctopus bridge.
// No API keys belong in this file (GitHub Pages is public).
(()=>{
  'use strict';
  const endpoint='https://oryn-b-cinematic-review.proudcabin3.chatgpt.site/api/subscribe';
  const $=id=>document.getElementById(id);
  const overlay=$('launch-scratch-overlay');
  const dialog=$('launch-scratch-dialog');
  const panel=$('launch-scratch-signup');
  const card=$('launch-scratch-card');
  const canvas=$('launch-scratch-canvas');
  const revealButton=$('launch-scratch-reveal');
  const seenKey='orynb-scratch-seen-v1';
  let previousFocus=null,opened=false,revealed=false,drawing=false,steps=0,ctx=null;

  async function subscribe(form,emailInput,statusEl){
    if(!emailInput.value.trim()||!emailInput.checkValidity()){
      statusEl.textContent='Please enter a valid email address.';emailInput.focus();return;
    }
    const consent=form.querySelector('input[name="consent"]');
    if(!consent?.checked){statusEl.textContent='Please agree to receive launch emails.';consent?.focus();return;}
    const submit=form.querySelector('button[type="submit"]');
    submit.disabled=true;statusEl.textContent='Confirming your signup…';
    try{
      const response=await fetch(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(12500),
        body:JSON.stringify({email:emailInput.value.trim(),consent:true,interest:'BOTH',
          website:form.elements.website?.value||'',consentVersion:'oryn-launch-v2'})
      });
      const data=await response.json();
      if(response.status===409){statusEl.textContent='This email is already registered. Existing subscribers do not restart the welcome sequence.';return;}
      if(response.status===429){statusEl.textContent='Too many attempts. Please try again later.';return;}
      if(!response.ok||data.accepted!==true)throw Error('Not accepted by the signup service');
      statusEl.textContent=data.pendingConfirmation
        ?'Check your inbox to confirm your signup and receive the welcome emails.'
        :'You are on the list. Watch your inbox for first-drop updates.';
      try{sessionStorage.setItem(seenKey,'1')}catch{}
      form.reset();
    }catch{
      statusEl.textContent='We could not confirm your signup right now. Please try again later.';
    }finally{submit.disabled=false;}
  }

  const mainForm=$('signupForm');
  const mainStatus=$('signupStatus');
  if(mainForm&&mainStatus){
    mainForm.addEventListener('submit',event=>{
      event.preventDefault();subscribe(mainForm,$('signupEmail'),mainStatus);
    });
  }
  if(!overlay||!dialog||!card||!canvas)return;

  function close(){
    overlay.hidden=true;document.body.style.overflow='';
    try{sessionStorage.setItem(seenKey,'1')}catch{}
    previousFocus?.focus?.();
  }
  function reveal(){
    if(revealed)return;
    revealed=true;card.classList.add('is-revealed');revealButton.hidden=true;panel.hidden=false;
    $('launch-scratch-reward').setAttribute('aria-label','Buy one, get one free on launch day');
  }
  function prepare(){
    const r=card.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
    ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx){reveal();return;}
    ctx.scale(dpr,dpr);
    const grad=ctx.createLinearGradient(0,0,r.width,r.height);
    grad.addColorStop(0,'#b88d52');grad.addColorStop(.52,'#e8d49d');grad.addColorStop(1,'#ae864f');
    ctx.fillStyle=grad;ctx.fillRect(0,0,r.width,r.height);
    ctx.fillStyle='#1c3828';ctx.textAlign='center';
    ctx.font='800 22px system-ui';ctx.fillText('SCRATCH HERE',r.width/2,r.height/2-5);
    ctx.font='600 11px system-ui';ctx.fillText('↔ REVEAL THE FIRST DROP ↔',r.width/2,r.height/2+25);
  }
  function draw(e){
    if(!drawing||!ctx||revealed)return;
    const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    ctx.globalCompositeOperation='destination-out';
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=28;
    if(steps++===0){ctx.beginPath();ctx.moveTo(x,y);}
    else{ctx.lineTo(x,y);ctx.stroke();}
  }
  function checkReveal(){
    if(!ctx||steps<4||revealed)return;
    const {data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let total=0,empty=0;
    for(let y=0;y<height;y+=14)for(let x=0;x<width;x+=14){
      total++;if(data[(y*width+x)*4+3]<60)empty++;
    }
    if(empty/total>.32)reveal();
  }
  function open(){
    if(opened)return;opened=true;previousFocus=document.activeElement;
    overlay.hidden=false;document.body.style.overflow='hidden';dialog.focus();prepare();
  }
  $('launch-scratch-exit').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled]),a[href]')]
      .filter(el=>el.getClientRects().length>0);
    if(!focusable.length)return;
    if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
    if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
  });
  revealButton.addEventListener('click',reveal);
  canvas.addEventListener('pointerdown',e=>{drawing=true;steps=0;canvas.setPointerCapture?.(e.pointerId);draw(e)});
  canvas.addEventListener('pointermove',draw);
  canvas.addEventListener('pointerup',()=>{drawing=false;checkReveal()});
  canvas.addEventListener('pointercancel',()=>{drawing=false;checkReveal()});
  const popupForm=$('launch-scratch-form');
  popupForm.addEventListener('submit',e=>{
    e.preventDefault();subscribe(popupForm,$('launch-scratch-email'),$('launch-scratch-status'));
  });
  const seen=(()=>{try{return sessionStorage.getItem(seenKey)==='1'}catch{return false}})();
  if(!seen)setTimeout(()=>{
    const f=$('signupForm');
    if(!opened&&!f?.contains(document.activeElement))open();
  },6500);
})();
