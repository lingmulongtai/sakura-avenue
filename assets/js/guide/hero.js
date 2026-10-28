import {$, RM} from '../core/util.js';

/* ================= HERO MINI AVENUE ================= */
const mini = $('mini');
const MSEQ = ['red','red','blue','red','blue','red','red','blue','blue','red','blue','blue'];
const mcells = MSEQ.map((c, i) => {
  const d = document.createElement('div'); d.className = 'cell on';
  d.innerHTML = `<i>${i + 1}</i><span class="dot" style="--c:${c === 'red' ? '#E8213A' : '#2F5BFF'}"></span>` + (i === 11 ? '<svg class="flower" viewBox="-20 -20 40 40"><g>' + [0,72,144,216,288].map(a => `<path transform="rotate(${a})" d="M0 -2C5 -6 6 -14 0 -18C-6 -14 -5 -6 0 -2Z"/>`).join('') + '</g><circle r="3.2"/></svg>' : '');
  mini.appendChild(d); return d;
});
mcells[11].classList.add('bloom');
if (!RM) {
  let step = -1;
  const tick = () => {
    step++;
    if (step === 0) { mcells.forEach(c => c.classList.remove('on', 'bloom')); setTimeout(tick, 700); return; }
    if (step <= 12) { mcells[step - 1].classList.add('on'); if (step === 12) setTimeout(() => mcells[11].classList.add('bloom'), 250); setTimeout(tick, step === 12 ? 4200 : 420); return; }
    step = -1; tick();
  };
  setTimeout(tick, 2600);
}
