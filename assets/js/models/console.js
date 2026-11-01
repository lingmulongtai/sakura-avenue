// The live console under the viewer. It samples the same motion plan the robot plays, so the traces,
// the phase strip and every number on it agree with the pose on screen. Nothing here is typed in.
import { L } from '../core/i18n.js';
import { PHASES } from './motion.js';

const LANES = [
  ['yaw', '旋回', 'Turret', v => `${Math.round(v)}°`],
  ['lift', '昇降', 'Lift', v => `${Math.round(v)} mm`],
  ['reach', '伸縮', 'Reach', v => `${Math.round(v)} mm`],
  ['grip', 'グリッパー', 'Gripper', v => `${Math.round(v)}%`],
  ['turn', 'ターンテーブル', 'Carousel', v => `${Math.round(((v % 360) + 360) % 360)}°`],
  ['drive', '横移動', 'Strafe', v => `${Math.round(v * 1000)} mm`],
];
const SAMPLES = 480;
const valueOf = (s, key) => key === 'drive' ? -s.offset : s.pose[key];
const activityOf = (s, key) => key === 'drive' ? s.drive : s.activity[key];

export function createConsole({ onScrub, onSpeed }) {
  const $ = id => document.getElementById(id);
  const root = $('scope'), canvas = $('scope-chart'), strip = $('scope-phases'), scrub = $('scope-scrub');
  const g = canvas.getContext('2d');
  let plan = null, series = [], ranges = [], blocks = [], shown = null, colors = {};
  const api = { holding: false };

  const readColors = () => {
    const cs = getComputedStyle(root);
    for (const name of ['ink', 'muted', 'line', 'sakura', 'f-num', 'f-body']) colors[name] = cs.getPropertyValue(`--${name}`).trim();
  };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    if (shown) draw(...shown);
  };
  new ResizeObserver(resize).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { readColors(); if (shown) draw(...shown); });

  function draw(time, s) {
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    const dpr = W / canvas.clientWidth, narrow = canvas.clientWidth < 520;
    const left = (narrow ? 64 : 104) * dpr, right = (narrow ? 50 : 66) * dpr;
    const pw = W - left - right, h = H / LANES.length, pad = 4 * dpr;
    const head = left + pw * time / plan.duration;
    g.clearRect(0, 0, W, H);
    LANES.forEach(([key, ja, en, format], n) => {
      const y0 = n * h, [lo, hi] = ranges[n], data = series[n];
      const active = activityOf(s, key) > 0.04;
      const yOf = v => y0 + h - pad - (v - lo) / (hi - lo) * (h - pad * 2);
      g.fillStyle = colors.line; g.fillRect(left, y0 + h - 0.5 * dpr, pw, dpr);
      g.textBaseline = 'middle';
      g.font = `${active ? 900 : 700} ${(narrow ? 10 : 11) * dpr}px ${colors['f-body']}`;
      g.fillStyle = active ? colors.sakura : colors.muted;
      g.textAlign = 'left';
      g.fillText(L(ja, en), 0, y0 + h / 2);
      const path = new Path2D();
      for (let i = 0; i <= SAMPLES; i++) {
        const x = left + pw * i / SAMPLES, y = yOf(data[i]);
        if (i) path.lineTo(x, y); else path.moveTo(x, y);
      }
      g.lineJoin = 'round';
      g.lineWidth = 1.25 * dpr; g.strokeStyle = colors.line; g.stroke(path);
      g.save();
      g.beginPath(); g.rect(left, y0, head - left, h); g.clip();
      g.lineWidth = 1.6 * dpr; g.strokeStyle = active ? colors.sakura : colors.ink; g.stroke(path);
      g.restore();
      const v = valueOf(s, key);
      g.beginPath(); g.arc(head, yOf(v), (active ? 3.4 : 2.6) * dpr, 0, Math.PI * 2);
      g.fillStyle = active ? colors.sakura : colors.ink; g.fill();
      g.font = `700 ${(narrow ? 10 : 11) * dpr}px ${colors['f-num']}`;
      g.fillStyle = active ? colors.sakura : colors.ink;
      g.textAlign = 'right';
      g.fillText(format(v), W, y0 + h / 2);
    });
    g.fillStyle = colors.sakura;
    g.globalAlpha = 0.5; g.fillRect(head - 0.5 * dpr, 0, dpr, H); g.globalAlpha = 1;
  }

  api.setPlan = next => {
    plan = next;
    series = LANES.map(() => new Float32Array(SAMPLES + 1));
    for (let i = 0; i <= SAMPLES; i++) {
      const s = plan.at(i / SAMPLES * plan.duration);
      LANES.forEach(([key], n) => { series[n][i] = valueOf(s, key); });
    }
    ranges = series.map(data => {
      let lo = Infinity, hi = -Infinity;
      for (const v of data) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      return hi - lo < 1e-6 ? [lo - 1, hi + 1] : [lo, hi];
    });
    blocks = plan.phases.map(p => {
      const block = document.createElement('i');
      block.dataset.phase = p.phase;
      block.style.flex = `${p.t1 - p.t0} 1 0`;
      return block;
    });
    strip.replaceChildren(...blocks);
    $('scope-duration').textContent = `/ ${plan.duration.toFixed(1)} s`;
    root.hidden = false;
    readColors();
    resize();
  };

  api.update = (time, s) => {
    shown = [time, s];
    const p = s.phase;
    const phase = $('scope-phase');
    phase.textContent = L(...PHASES[p.phase]);
    phase.parentElement.dataset.phase = p.phase;
    $('scope-cycle').textContent = p.cycle >= 0 ? `${p.cycle + 1} / ${plan.cycles}` : '';
    $('scope-placed').textContent = String(s.placed);
    $('scope-count').textContent = `/ ${s.bottles.length}`;
    $('scope-time').textContent = time.toFixed(1);
    plan.phases.forEach((q, n) => {
      blocks[n].classList.toggle('on', q === p);
      blocks[n].classList.toggle('done', q.t1 < time && q !== p);
    });
    if (!api.holding) scrub.value = String(Math.round(time / plan.duration * 1000));
    draw(time, s);
  };

  api.hide = () => { root.hidden = true; shown = null; };

  const seek = () => { if (plan) onScrub(Number(scrub.value) / 1000 * plan.duration); };
  scrub.addEventListener('pointerdown', () => { api.holding = true; });
  window.addEventListener('pointerup', () => { api.holding = false; });
  scrub.addEventListener('input', seek);
  document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    onSpeed(Number(b.dataset.speed));
  }));
  return api;
}
