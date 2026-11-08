// Painel de instrumentos: limitador de momento, curva de carga, relógios, momento na base e luzes.
import { el, txt, pColor, fmt } from './svg.js';
import { capacity, qMax } from '../sim/simulation.js';
import { GEO } from '../config.js';

const LIGHTS = [
  ['power', 'Energia', 'g'],
  ['pre', 'Pré-alarme 90%', 'y'],
  ['cut', 'Corte 100%', 'r'],
  ['end', 'Fim de curso', 'y'],
  ['slack', 'Cabo frouxo', 'y'],
  ['zone', 'Zona proibida', 'y'],
  ['wind', 'Vento forte', 'y'],
  ['estop', 'Emergência', 'r'],
];

export class Panel {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <section class="card lmi" data-spot="lmi">
        <div class="hd"><span>Limitador de momento</span><b id="lmiState">OK</b></div>
        <div class="nums">
          <div><label>Carga no gancho</label><b id="vLoad">0,00</b><i>t</i></div>
          <div><label>Raio</label><b id="vR">0,0</b><i>m</i></div>
          <div><label>Altura do gancho</label><b id="vH">0,0</b><i>m</i></div>
          <div><label>Máx. neste raio</label><b id="vCap">0,00</b><i>t</i></div>
        </div>
        <div class="ubar"><div class="fill"></div><span class="m90"></span><span class="m100"></span><small>uso da capacidade</small><b id="vUtil">0%</b></div>
      </section>
      <section class="card chart" data-spot="chart">
        <div class="hd"><span>Curva de carga</span><b id="chartFalls">2 cabos</b></div>
        <svg id="loadChart" viewBox="0 0 496 190"></svg>
      </section>
      <section class="card dials" data-spot="dials"><svg id="dials" viewBox="0 0 496 118"></svg></section>
      <section class="card base" data-spot="base">
        <div class="hd"><span>Momento na base da torre</span><b id="vM">0 t·m</b></div>
        <div class="mbar"><div class="fill"></div><span class="zero"></span></div>
        <div class="mlab"><span>◀ para trás (contrapeso)</span><span>para frente (carga) ▶</span></div>
      </section>
      <section class="card lights" data-spot="lights">
        ${LIGHTS.map(([k, n, c]) => `<div class="lt ${c}" data-k="${k}"><i></i>${n}</div>`).join('')}
      </section>`;
    const $ = (s) => root.querySelector(s);
    this.e = {
      state: $('#lmiState'), load: $('#vLoad'), r: $('#vR'), h: $('#vH'), cap: $('#vCap'),
      util: $('#vUtil'), ufill: $('.ubar .fill'), falls: $('#chartFalls'), M: $('#vM'), mfill: $('.mbar .fill'),
    };
    this.lights = {};
    root.querySelectorAll('.lt').forEach((l) => (this.lights[l.dataset.k] = l));
    this.buildChart($('#loadChart'));
    this.buildDials($('#dials'));
    this.resetFx();
  }

  buildChart(svg) {
    this.ch = { svg, x0: 46, x1: 484, y0: 160, y1: 12, rMax: 60, qTop: 9 };
    const c = this.ch;
    const gx = (r) => c.x0 + (r / c.rMax) * (c.x1 - c.x0);
    const gy = (q) => c.y0 - (q / c.qTop) * (c.y0 - c.y1);
    c.gx = gx; c.gy = gy;
    for (let q = 0; q <= 8; q += 2) {
      el('line', { x1: c.x0, y1: gy(q), x2: c.x1, y2: gy(q), stroke: '#ffffff', 'stroke-opacity': 0.06 }, svg);
      txt(svg, c.x0 - 8, gy(q) + 4, `${q} t`, { 'font-size': 12, fill: '#8da0b6', 'text-anchor': 'end' });
    }
    for (let r = 0; r <= 60; r += 10) {
      el('line', { x1: gx(r), y1: c.y0, x2: gx(r), y2: c.y1, stroke: '#ffffff', 'stroke-opacity': 0.06 }, svg);
      txt(svg, gx(r), c.y0 + 17, `${r} m`, { 'font-size': 12, fill: '#8da0b6', 'text-anchor': 'middle' });
    }
    c.area = el('path', { fill: '#3ecf72', 'fill-opacity': 0.12 }, svg);
    c.other = el('polyline', { fill: 'none', stroke: '#8da0b6', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.6 }, svg);
    c.pre = el('polyline', { fill: 'none', stroke: '#f2b632', 'stroke-width': 1, 'stroke-dasharray': '3 3', 'stroke-opacity': 0.7 }, svg);
    c.curve = el('polyline', { fill: 'none', stroke: '#3ecf72', 'stroke-width': 2.4 }, svg);
    c.otherTxt = txt(svg, 0, 0, '', { 'font-size': 11, fill: '#8da0b6' });
    c.vline = el('line', { y1: c.y0, y2: c.y1, stroke: '#4fa3ff', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    c.hline = el('line', { x1: c.x0, stroke: '#4fa3ff', 'stroke-width': 1, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.6 }, svg);
    c.dot = el('circle', { r: 7, stroke: '#fff', 'stroke-width': 2 }, svg);
    c.dotTxt = txt(svg, 0, 0, '', { 'font-size': 12.5, fill: '#fff', 'font-weight': 700 });
    this.chFalls = null;
  }

  drawCurves(falls) {
    const c = this.ch;
    const line = (f, k = 1) => {
      const p = [];
      for (let r = GEO.rMin; r <= 60.01; r += 0.5) p.push(`${c.gx(r).toFixed(1)},${c.gy(capacity(r, f) * k).toFixed(1)}`);
      return p;
    };
    const p = line(falls);
    c.curve.setAttribute('points', p.join(' '));
    c.pre.setAttribute('points', line(falls, 0.9).join(' '));
    c.other.setAttribute('points', line(falls === 4 ? 2 : 4).join(' '));
    c.area.setAttribute('d', `M${c.gx(GEO.rMin)},${c.y0} L${p.join(' L')} L${c.gx(60)},${c.y0} Z`);
    const o = falls === 4 ? 2 : 4;
    c.otherTxt.textContent = `${o} cabos`;
    c.otherTxt.setAttribute('x', c.gx(o === 4 ? 9 : 4)); c.otherTxt.setAttribute('y', c.gy(o === 4 ? 8 : 4) - 6);
    this.e.falls.textContent = `${falls} cabos no moitão`;
    this.chFalls = falls;
  }

  buildDials(svg) {
    const specs = [
      { k: 'wind', name: 'Vento', unit: 'km/h', max: 100, zones: [[50, 72, '#f2b632'], [72, 100, '#ff4d4d']] },
      { k: 'hhz', name: 'Elevação', unit: 'Hz', max: 90 },
      { k: 'hamp', name: 'Corrente', unit: 'A', max: 100, zones: [[85, 100, '#ff4d4d']] },
      { k: 'thz', name: 'Carrinho', unit: 'Hz', max: 90 },
    ];
    this.dials = specs.map((s, i) => {
      const cx = 62 + i * 124, cy = 62, R = 44;
      const a0 = (-220 * Math.PI) / 180, a1 = (40 * Math.PI) / 180;
      const ang = (v) => a0 + (a1 - a0) * Math.max(0, Math.min(1, v / s.max));
      const arc = (va, vb, rr) => {
        const A = ang(va), B = ang(vb);
        return `M${cx + rr * Math.cos(A)},${cy + rr * Math.sin(A)} A${rr},${rr} 0 ${B - A > Math.PI ? 1 : 0} 1 ${cx + rr * Math.cos(B)},${cy + rr * Math.sin(B)}`;
      };
      el('path', { d: arc(0, s.max, R), fill: 'none', stroke: '#26313d', 'stroke-width': 6 }, svg);
      for (const [a, b, col] of s.zones || []) el('path', { d: arc(a, b, R), fill: 'none', stroke: col, 'stroke-width': 6, 'stroke-opacity': 0.8 }, svg);
      for (let k = 0; k <= 10; k++) {
        const A = ang((s.max * k) / 10);
        el('line', { x1: cx + (R - 9) * Math.cos(A), y1: cy + (R - 9) * Math.sin(A), x2: cx + (R - 4) * Math.cos(A), y2: cy + (R - 4) * Math.sin(A), stroke: '#6f8297', 'stroke-width': 1 }, svg);
      }
      const needle = el('line', { x1: cx, y1: cy, x2: cx, y2: cy - R + 10, stroke: '#ff8a3d', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx, cy, r: 4.5, fill: '#c3cad4' }, svg);
      const val = txt(svg, cx, cy + 24, '0', { 'font-size': 15, fill: '#fff', 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-weight': 600 });
      txt(svg, cx, cy + 50, `${s.name} (${s.unit})`, { 'font-size': 12, fill: '#8da0b6', 'text-anchor': 'middle' });
      return { ...s, cx, cy, R, ang, needle, val, v: 0 };
    });
  }

  resetFx() {
    if (this.dials) this.dials.forEach((d) => (d.v = 0));
    this.chFalls = null;
  }

  update(st, P, dt) {
    const falls = P.falls === 4 ? 4 : 2;
    if (this.chFalls !== falls) this.drawCurves(falls);
    const L = st.lim, e = this.e;
    const hh = st.load != null ? st.loads[st.load] : null;
    e.load.textContent = fmt(L.meas, 2);
    e.r.textContent = fmt(st.tr.r, 1);
    e.h.textContent = fmt(Math.max(0, st.hook.y), 1);
    e.cap.textContent = fmt(L.cap, 2);
    const u = L.util;
    e.util.textContent = `${Math.round(u * 100)}%`;
    e.ufill.style.width = `${Math.min(100, (u / 1.2) * 100)}%`;
    e.ufill.style.background = u >= 1 ? '#ff4d4d' : u >= 0.9 ? '#f2b632' : '#3ecf72';
    let s = 'OK', cls = '';
    if (!P.limiter) { s = L.danger ? 'DESLIGADO · SOBRECARGA' : 'DESLIGADO'; cls = 'off'; }
    else if (L.cut) { s = 'CORTE'; cls = 'cut'; }
    else if (L.pre) { s = 'PRÉ-ALARME'; cls = 'pre'; }
    if (e.state.textContent !== s) e.state.textContent = s;
    e.state.className = cls;

    // curva de carga
    const c = this.ch;
    const x = c.gx(st.tr.r), y = c.gy(Math.min(L.meas, c.qTop));
    c.vline.setAttribute('x1', x); c.vline.setAttribute('x2', x);
    c.hline.setAttribute('x2', x); c.hline.setAttribute('y1', y); c.hline.setAttribute('y2', y);
    c.dot.setAttribute('cx', x); c.dot.setAttribute('cy', y);
    c.dot.setAttribute('fill', u >= 1 ? '#ff4d4d' : u >= 0.9 ? '#f2b632' : '#4fa3ff');
    const right = x > 380;
    c.dotTxt.setAttribute('x', right ? x - 12 : x + 12);
    c.dotTxt.setAttribute('y', Math.max(24, y - 10));
    c.dotTxt.setAttribute('text-anchor', right ? 'end' : 'start');
    c.dotTxt.textContent = hh || L.meas > 0 ? `${fmt(L.meas, 1)} t a ${fmt(st.tr.r, 0)} m` : `gancho vazio · ${fmt(st.tr.r, 0)} m`;

    // relógios
    const vals = { wind: st.wind.v, hhz: st.ho.hz, hamp: st.ho.amps, thz: st.tr.hz };
    const k = dt > 0 ? 1 - Math.exp(-8 * dt) : 1;
    for (const d of this.dials) {
      d.v += (vals[d.k] - d.v) * k;
      const A = d.ang(d.v), rr = d.R - 10;
      d.needle.setAttribute('x2', d.cx + rr * Math.cos(A));
      d.needle.setAttribute('y2', d.cy + rr * Math.sin(A));
      d.val.textContent = fmt(vals[d.k], 0);
    }

    // momento na base
    const M = st.s.M, f = Math.max(-1, Math.min(1, M / 150));
    e.M.textContent = `${M >= 0 ? '+' : '−'}${fmt(Math.abs(M), 0)} t·m`;
    e.mfill.style.left = `${f >= 0 ? 50 : 50 + f * 50}%`;
    e.mfill.style.width = `${Math.abs(f) * 50}%`;
    e.mfill.style.background = pColor(Math.abs(M) / 150);

    // luzes
    const on = {
      power: st.power && !st.estop,
      pre: L.pre && !L.cut,
      cut: L.cut || L.danger,
      end: L.top || L.rEnd,
      slack: L.slack && st.power,
      zone: L.zone,
      wind: L.windPre,
      estop: st.estop,
    };
    const blink = Math.floor(st.t * 3) % 2 === 0;
    for (const k2 in this.lights) {
      let v = !!on[k2];
      if (v && (k2 === 'pre' || (k2 === 'wind' && L.windStop))) v = blink;
      this.lights[k2].classList.toggle('on', v);
      if (k2 === 'wind') {
        this.lights[k2].classList.toggle('r', L.windStop);
        this.lights[k2].classList.toggle('y', !L.windStop);
      }
    }
  }
}
