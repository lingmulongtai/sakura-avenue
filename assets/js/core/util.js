export const NS = 'http://www.w3.org/2000/svg';
export const W = 7000, PAD = 110, VB = W + PAD * 2;
export const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const easeIO = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
export const easeOut = p => 1 - Math.pow(1 - p, 3);
export const backOut = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
export function s(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
