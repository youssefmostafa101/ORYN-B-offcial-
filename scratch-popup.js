// ORYN-B: ONE official EmailOctopus embed, moved between the page and scratch popup.
// Do not post emails to the retired first-party endpoint or store API keys in public code.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const overlay = $('launch-scratch-overlay');
  const dialog = $('launch-scratch-dialog');
  const panel = $('launch-scratch-signup');
  const card = $('launch-scratch-card');
  const canvas = $('launch-scratch-canvas');
  const revealButton = $('launch-scratch-reveal');
  const formHost = $('eo-form-host');
  const formHome = $('eo-form-home');
  const popupSlot = $('eo-form-popup-slot');
  if (!overlay || !dialog || !panel || !card || !canvas || !formHost || !formHome || !popupSlot) return;

  const seenKey = 'orynb-scratch-seen-v2';
  let previousFocus = null, hasOpened = false, revealed = false;
  let drawing = false, steps = 0, ctx = null;

  // Keep the actual, provider-managed subscription form as a single DOM instance.
  // Its API, consent processing, success state and list mapping remain in EmailOctopus.
  function moveSignup(intoPopup) {
    const destination = intoPopup ? popupSlot : formHome;
    if (formHost.parentNode !== destination) destination.append(formHost);
  }

  function dismiss() {
    moveSignup(false);
    overlay.hidden = true;
    document.body.style.overflow = '';
    try { sessionStorage.setItem(seenKey, '1'); } catch {}
    if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    card.classList.add('is-revealed');
    revealButton.hidden = true;
    panel.hidden = false;
    moveSignup(true);
    $('launch-scratch-reward').setAttribute(
      'aria-label', 'Buy one, get one free, on launch day'
    );
  }

  function prepareScratch() {
    const bounds = card.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * density);
    canvas.height = Math.round(bounds.height * density);
    ctx = canvas.getContext('2d', {willReadFrequently: true});
    if (!ctx) { reveal(); return; }
    ctx.scale(density, density);
    const gradient = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
    gradient.addColorStop(0, '#b88d52');
    gradient.addColorStop(.52, '#e8d49d');
    gradient.addColorStop(1, '#ae864f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = '#1c3828';
    ctx.textAlign = 'center';
    ctx.font = '800 22px system-ui';
    ctx.fillText('SCRATCH HERE', bounds.width / 2, bounds.height / 2 - 5);
    ctx.font = '600 11px system-ui';
    ctx.fillText('↔ REVEAL THE FIRST DROP ↔', bounds.width / 2, bounds.height / 2 + 25);
  }

  function draw(event) {
    if (!drawing || !ctx || revealed) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 28;
    if (steps++ === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function detectReveal() {
    if (!ctx || steps < 4 || revealed) return;
    const {data, width, height} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let checked = 0, clear = 0;
    for (let y = 0; y < height; y += 14) for (let x = 0; x < width; x += 14) {
      checked++;
      if (data[(y * width + x) * 4 + 3] < 60) clear++;
    }
    if (clear / checked > .32) reveal();
  }

  function show({signupFirst = false} = {}) {
    previousFocus = document.activeElement;
    hasOpened = true;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    dialog.focus();
    if (signupFirst || revealed) {
      if (!revealed) reveal();
      else moveSignup(true);
    } else {
      prepareScratch();
    }
  }

  $('launch-scratch-exit').addEventListener('click', dismiss);
  overlay.addEventListener('click', event => { if (event.target === overlay) dismiss(); });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dismiss(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]), a[href], select:not([disabled])')]
      .filter(el => el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  revealButton.addEventListener('click', reveal);
  canvas.addEventListener('pointerdown', event => {
    drawing = true; steps = 0;
    canvas.setPointerCapture?.(event.pointerId);
    draw(event);
  });
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', () => { drawing = false; detectReveal(); });
  canvas.addEventListener('pointercancel', () => { drawing = false; detectReveal(); });

  const inlineOfferButton = $('eo-view-offer');
  if (inlineOfferButton) inlineOfferButton.addEventListener('click', () => show({signupFirst: true}));

  // A closed scratch modal must not keep appearing within the same browser session.
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem(seenKey) === '1'; } catch {}
  if (!alreadySeen) window.setTimeout(() => {
    if (!hasOpened && !formHome.contains(document.activeElement)) show();
  }, 6500);
})();
