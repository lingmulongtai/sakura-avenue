import {$, RM} from '../core/util.js';

/* ================= RETRY STEPPER ================= */
const rsteps = [...document.querySelectorAll('.rstep')];
let ri = 0, rTimer = null, rManual = false;
const rShow = i => rsteps.forEach((el, k) => el.classList.toggle('on', k === i));
rsteps.forEach((el, i) => { el.tabIndex = 0; const go = () => { rManual = true; clearInterval(rTimer); ri = i; rShow(i); }; el.addEventListener('click', go); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
rShow(0);
if (!RM && 'IntersectionObserver' in window) {
  new IntersectionObserver(es => es.forEach(e => {
    if (rManual) return;
    clearInterval(rTimer);
    if (e.isIntersecting) rTimer = setInterval(() => { ri = (ri + 1) % rsteps.length; rShow(ri); }, 1900);
  }), {threshold:.4}).observe($('rsteps'));
}
