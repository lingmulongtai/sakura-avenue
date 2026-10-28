// Runs before first paint: pick the page language from the saved choice or the browser.
(() => {
  const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  let language = languages.map(value => String(value || '').toLowerCase().split(/[-_]/)[0]).find(value => value === 'ja' || value === 'en') || 'en';
  try { const saved = localStorage.getItem('sakura-avenue-lang'); if (saved === 'ja' || saved === 'en') language = saved; } catch (_) {}
  document.documentElement.lang = language;
  document.documentElement.dataset.lang = language;
})();
