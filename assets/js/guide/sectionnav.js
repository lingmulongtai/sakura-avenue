import {RM} from '../core/util.js';

/* ================= NAV ================= */
const navLinks = [...document.querySelectorAll('.navlinks a')];
if ('IntersectionObserver' in window) {
  const secs = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const vis = new Map();
  const io2 = new IntersectionObserver(es => {
    es.forEach(e => vis.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, br = 0; vis.forEach((r, id) => { if (r > br) { br = r; best = id; } });
    navLinks.forEach(a => {
      const on = !!best && a.getAttribute('href') === '#' + best;
      if ((a.getAttribute('aria-current') === 'true') === on) return;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) { const nav = a.parentElement; nav.scrollTo({left:a.offsetLeft - nav.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior:RM ? 'auto' : 'smooth'}); }
    });
  }, {threshold:[0, .1, .2, .35, .5], rootMargin:'-60px 0px -30% 0px'});
  secs.forEach(sec => sec && io2.observe(sec));
}
