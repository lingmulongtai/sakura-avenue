// Shared page motion: the page head enters in sequence, then each block of a section rises in as it
// scrolls into view. Classes are removed once a block has arrived, so sticky players and hover
// transforms work as before. Nothing is hidden for reduced motion or without IntersectionObserver.
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!RM && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion');
  const settle = el => el.addEventListener('transitionend', () => el.classList.remove('reveal', 'in'), { once: true });
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      settle(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  for (const section of document.querySelectorAll('main section:not(section section)')) {
    const host = section.classList.contains('wrap') ? section : section.querySelector(':scope > .wrap') || section;
    [...host.children].forEach((el, i) => {
      if (el.matches('script, style, [hidden]')) return;
      el.style.setProperty('--reveal-delay', `${Math.min(i, 3) * 0.08}s`);
      el.classList.add('reveal');
      io.observe(el);
    });
  }
}
