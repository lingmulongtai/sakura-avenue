// Glossary: filter the term cards by category and by a search that ignores case, width and kana type.
import {L, langHooks} from '../core/i18n.js';
import {$} from '../core/util.js';

const terms = [...document.querySelectorAll('.term')];
const secs = [...document.querySelectorAll('.gl-sec')];
const fold = s => s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
terms.forEach(t => { t.hay = fold(t.textContent + ' ' + (t.dataset.yomi || '')); });
let cat = '';

function apply() {
  const q = fold($('glQ').value.trim());
  let n = 0;
  for (const t of terms) {
    const on = (!cat || t.dataset.cat === cat) && (!q || t.hay.includes(q));
    t.hidden = !on;
    if (on) n++;
  }
  secs.forEach(s => { s.hidden = !s.querySelector('.term:not([hidden])'); });
  document.querySelectorAll('#glCats .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  $('glCount').textContent = L(`${n} / ${terms.length} 語`, `${n} of ${terms.length} terms`);
  $('glEmpty').hidden = n > 0;
}
function labels() {
  $('glQ').placeholder = L('用語をさがす（例：進入、五分咲き、retry）', 'Search terms (e.g. entry, Half Bloom, リトライ)');
  $('glQ').setAttribute('aria-label', L('用語を検索', 'Search terms'));
  $('glCats').setAttribute('aria-label', L('分類', 'Category'));
  apply();
}
$('glQ').addEventListener('input', apply);
$('glCats').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { cat = b.dataset.cat; apply(); } });
// A link to #t-... should always land on a visible card.
function reveal() {
  const t = location.hash.startsWith('#t-') && document.getElementById(location.hash.slice(1));
  if (!t) return;
  if (t.hidden) { cat = ''; $('glQ').value = ''; apply(); t.scrollIntoView(); }
  t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
}
window.addEventListener('hashchange', reveal);
labels(); reveal();
langHooks.push(labels);
