/* ================= LANGUAGE ================= */
export let LANG = document.documentElement.dataset.lang;
export const L = (ja, en) => LANG === 'en' ? en : ja;
export const tx = p => Array.isArray(p) ? (LANG === 'en' ? p[1] : p[0]) : p;
export const langHooks = [];
export function applyLangAttr() {
  document.documentElement.setAttribute('data-lang', LANG);
  document.documentElement.setAttribute('lang', LANG);
  document.querySelectorAll('.langsw button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
}
export function setLang(l) {
  if (l !== 'ja' && l !== 'en') return;
  try { localStorage.setItem('sakura-avenue-lang', l); } catch (_) {}
  if (l === LANG) return;
  LANG = l;
  applyLangAttr();
  langHooks.forEach(f => f());
}
applyLangAttr();
document.querySelectorAll('.langsw button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
