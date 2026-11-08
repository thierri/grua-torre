export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export function txt(parent, x, y, s, attrs = {}) {
  const t = el('text', { x, y, ...attrs }, parent);
  t.textContent = s;
  return t;
}

// Escala de esforço/pressão: azul → verde → amarelo → laranja → vermelho (u de 0 a 1)
const STOPS = [
  [0.0, [56, 120, 230]],
  [0.3, [40, 190, 170]],
  [0.5, [90, 205, 90]],
  [0.7, [240, 205, 60]],
  [0.85, [250, 140, 40]],
  [1.0, [240, 50, 50]],
];
export function pColor(u) {
  u = Math.max(0, Math.min(1, u));
  for (let i = 1; i < STOPS.length; i++) {
    if (u <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
      const k = (u - a) / (b - a);
      const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return 'rgb(240,50,50)';
}

export const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');

// Metros → px da cena (1400 × 784)
export const S = 12, OX = 330, OY = 740;
export const X = (x) => OX + x * S;
export const Y = (y) => OY - y * S;
