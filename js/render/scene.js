// Desenho da grua (SVG): construído uma vez, atributos atualizados por quadro.
import { el, txt, pColor, fmt, X, Y, S } from './svg.js';
import { GEO, MASS } from '../config.js';

const D = (r) => (r * 180) / Math.PI;
const pts = (arr) => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
const STRUCT = '#f2b632';
const STRUCT2 = '#c98f12';
const ROPE = '#aeb8c4';

export class Scene {
  constructor(svg, overlay) {
    this.svg = svg;
    this.ov = overlay;
    this.cam = { cx: 700, cy: 392, w: 1400 };
    this.camT = { ...this.cam };
    this.rw = 1400; this.rh = 784;
    this.layers = { ropes: true, forces: true, labels: true, values: true };
    this.insetsOn = ['winch', 'legend'];
    this.onPick = null;
    this.fx = { motorAng: 0, gearAng: 0, drumAng: 0, trDrumAng: 0, blink: 0 };
    this.build();
    svg.addEventListener('click', (e) => {
      const t = e.target.closest('[data-comp]');
      if (t && this.onPick) this.onPick(t.getAttribute('data-comp'));
    });
  }

  comp(id, parent = this.gMain, extra = {}) {
    return el('g', { 'data-comp': id, class: 'dimmable', ...extra }, parent);
  }

  build() {
    const svg = this.svg;
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: 'gSky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#13202e' }, lg);
    el('stop', { offset: 1, 'stop-color': '#0b1118' }, lg);
    const hatch = el('pattern', { id: 'pBrick', width: 10, height: 6, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 10, height: 6, fill: '#3a3536' }, hatch);
    el('path', { d: 'M0 3H10M5 0V3M0 3V6', stroke: '#4c4546', 'stroke-width': 0.8 }, hatch);
    const soil = el('pattern', { id: 'pSoil', width: 14, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 14, height: 14, fill: '#33261b' }, soil);
    el('circle', { cx: 3, cy: 4, r: 1, fill: '#4a3626' }, soil);
    el('circle', { cx: 10, cy: 10, r: 1.3, fill: '#4a3626' }, soil);

    // fundo: grade de 5 m
    const bg = el('g', { class: 'bgx' }, svg);
    el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: 'url(#gSky)' }, bg);
    for (let x = -30; x <= 85; x += 5) el('line', { x1: X(x), y1: Y(70), x2: X(x), y2: Y(0), stroke: '#ffffff', 'stroke-opacity': 0.035 }, bg);
    for (let y = 0; y <= 70; y += 5) el('line', { x1: X(-30), y1: Y(y), x2: X(85), y2: Y(y), stroke: '#ffffff', 'stroke-opacity': 0.035 }, bg);

    this.gMain = el('g', {}, svg);
    this.buildGround();
    this.buildBuilding();
    this.buildTower();
    this.buildCounterJib();
    this.buildJib();
    this.buildMoving();
    this.buildForces();
    this.buildLabels();
    this.buildOverlay();
  }

  buildGround() {
    const g = el('g', { class: 'bgx' }, this.gMain);
    el('rect', { x: X(-40), y: Y(0), width: 110 * S + 600, height: 6 * S + 200, fill: 'url(#pSoil)' }, g);
    el('line', { x1: X(-40), y1: Y(0), x2: X(90), y2: Y(0), stroke: '#6b4f37', 'stroke-width': 2 }, g);
    // régua de raio no chão
    const rr = el('g', { class: 'L-labels' }, g);
    for (let x = 0; x <= 60; x += 5) {
      el('line', { x1: X(x), y1: Y(0) + 2, x2: X(x), y2: Y(0) + (x % 10 ? 7 : 11), stroke: '#a78a6d', 'stroke-width': 1 }, rr);
      if (x % 10 === 0 && x > 0) txt(rr, X(x), Y(0) + 23, `${x} m`, { 'font-size': 12, fill: '#b39a80', 'text-anchor': 'middle' });
    }
    txt(rr, X(0), Y(0) + 23, 'raio', { 'font-size': 12, fill: '#b39a80', 'text-anchor': 'middle' });

    const f = this.comp('foundation');
    const b = GEO.base;
    el('rect', { x: X(b.x0), y: Y(b.top), width: (b.x1 - b.x0) * S, height: (b.top + 3) * S, fill: '#6c7480', stroke: '#9aa3ae', 'stroke-width': 1.2 }, f);
    for (const x of [-0.9, -0.5, 0.5, 0.9]) el('line', { x1: X(x), y1: Y(b.top), x2: X(x), y2: Y(-2.4), stroke: '#c8cfd8', 'stroke-width': 1, 'stroke-dasharray': '3 2' }, f);
    // escala de altura ao lado da torre
    const hs = el('g', { class: 'L-labels' }, this.gMain);
    for (let y = 10; y <= 40; y += 10) {
      el('line', { x1: X(1.4), y1: Y(y), x2: X(1.9), y2: Y(y), stroke: '#6f8297', 'stroke-width': 1 }, hs);
      txt(hs, X(2.1), Y(y) + 4, `${y} m`, { 'font-size': 11.5, fill: '#6f8297', 'text-anchor': 'start' });
    }
  }

  buildBuilding() {
    const B = GEO.building;
    const g = this.comp('building');
    const cols = [24, 29.5, 35, 40.5, 46];
    const fill = '#243140', line = '#3d5064';
    // vedação nos andares de baixo
    for (let i = 0; i < 3; i++) {
      const y0 = i * B.fh, y1 = y0 + B.fh;
      el('rect', { x: X(B.x0), y: Y(y1), width: (B.x1 - B.x0) * S, height: B.fh * S, fill: 'url(#pBrick)', opacity: 0.75 }, g);
      for (let k = 0; k < cols.length - 1; k++) {
        const xm = (cols[k] + cols[k + 1]) / 2;
        el('rect', { x: X(xm - 1.3), y: Y(y0 + 2.4), width: 2.6 * S, height: 1.4 * S, fill: '#0e161f', stroke: line }, g);
      }
    }
    for (const x of cols) el('rect', { x: X(x - 0.2), y: Y(B.top - 0.3), width: 0.4 * S, height: (B.top - 0.3) * S, fill: fill, stroke: line }, g);
    for (let i = 1; i <= B.floors; i++) {
      const y = i * B.fh;
      el('rect', { x: X(B.x0 - 0.3), y: Y(y + 0.3), width: (B.x1 - B.x0 + 0.6) * S, height: 0.3 * S, fill: '#4a596a', stroke: '#62758a', 'stroke-width': 1 }, g);
    }
    // escoras e arranques no último andar
    for (let x = B.x0 + 1; x < B.x1; x += 2.2) el('line', { x1: X(x), y1: Y(B.fh * (B.floors - 1) + 0.3), x2: X(x), y2: Y(B.top - 0.3), stroke: '#7a6a52', 'stroke-width': 1 }, g);
    for (const x of cols) el('line', { x1: X(x), y1: Y(B.top), x2: X(x), y2: Y(B.top + 1.2), stroke: '#b26b4a', 'stroke-width': 1.5 }, g);
  }

  buildTower() {
    const t = this.comp('tower');
    const h = GEO.towerHalf, top = GEO.mastTop;
    const zz = [];
    let s = 0;
    for (let y = GEO.base.top; y <= top + 0.01; y += 2.4) zz.push([s++ % 2 ? h : -h, y]);
    el('polyline', { points: pts(zz), fill: 'none', stroke: STRUCT2, 'stroke-width': 1.2 }, t);
    for (let y = GEO.base.top; y <= top + 0.01; y += 4.8) el('line', { x1: X(-h), y1: Y(y), x2: X(h), y2: Y(y), stroke: STRUCT2, 'stroke-width': 1 }, t);
    this.chordB = el('line', { x1: X(-h), y1: Y(GEO.base.top), x2: X(-h), y2: Y(top), stroke: STRUCT, 'stroke-width': 3.2, class: 'stressable' }, t);
    this.chordF = el('line', { x1: X(h), y1: Y(GEO.base.top), x2: X(h), y2: Y(top), stroke: STRUCT, 'stroke-width': 3.2, class: 'stressable' }, t);

    // mesa giratória (travada nesta vista) e cabine
    const tt = this.comp('turntable');
    el('rect', { x: X(-1.7), y: Y(46.4), width: 3.4 * S, height: 2.4 * S, fill: '#4b5a6b', stroke: '#8796a7', 'stroke-width': 1.2 }, tt);
    el('line', { x1: X(-1.7), y1: Y(45.0), x2: X(1.7), y2: Y(45.0), stroke: '#b8c3cf', 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }, tt);
    const cab = this.comp('cab');
    el('path', { d: `M${X(1.7)},${Y(46.2)} H${X(4.2)} L${X(4.6)},${Y(44.6)} L${X(4.2)},${Y(43.4)} H${X(1.7)} Z`, fill: '#e7e9ec', stroke: '#9aa5b1', 'stroke-width': 1.2 }, cab);
    el('path', { d: `M${X(2.6)},${Y(45.8)} H${X(4.0)} L${X(4.3)},${Y(44.6)} H${X(2.6)} Z`, fill: '#5fa8d8', opacity: 0.85 }, cab);

    // torre de cabeça (topo)
    const hd = this.comp('head');
    const [ax, ay] = GEO.apex;
    el('polyline', { points: pts([[-h, 48], [ax, ay], [h, 48]]), fill: 'none', stroke: STRUCT, 'stroke-width': 2.6 }, hd);
    el('polyline', { points: pts([[-h, 48], [0.55, 51.5], [-0.75, 54], [0.3, 56]]), fill: 'none', stroke: STRUCT2, 'stroke-width': 1.1 }, hd);
    el('line', { x1: X(-h), y1: Y(48), x2: X(h), y2: Y(48), stroke: STRUCT, 'stroke-width': 2 }, hd);
    el('circle', { cx: X(ax), cy: Y(ay - 0.4), r: 4, fill: '#8a96a3', stroke: '#c6cfd8' }, hd);

    // tirantes
    const pd = this.comp('pendants');
    this.pendJ = el('line', { x1: X(ax), y1: Y(ay - 0.4), x2: X(GEO.jibTie[0]), y2: Y(GEO.jibTie[1]), stroke: STRUCT, 'stroke-width': 2.6, class: 'stressable' }, pd);
    this.pendC = el('line', { x1: X(ax), y1: Y(ay - 0.4), x2: X(GEO.cjTie[0]), y2: Y(GEO.cjTie[1]), stroke: STRUCT, 'stroke-width': 2.6, class: 'stressable' }, pd);

    // anemômetro e luzes de balizamento
    const an = this.comp('anemometer');
    el('line', { x1: X(ax), y1: Y(ay), x2: X(ax), y2: Y(ay + 1.6), stroke: '#c6cfd8', 'stroke-width': 1.5 }, an);
    this.anemo = el('g', { transform: `translate(${X(ax)},${Y(ay + 1.6)})` }, an);
    this.anemoArm = el('line', { x1: -10, y1: 0, x2: 10, y2: 0, stroke: '#e6edf3', 'stroke-width': 1.5 }, this.anemo);
    this.cupA = el('circle', { cx: -10, cy: 0, r: 2.6, fill: '#e6edf3' }, this.anemo);
    this.cupB = el('circle', { cx: 10, cy: 0, r: 2.6, fill: '#e6edf3' }, this.anemo);
    this.beacons = [
      el('circle', { cx: X(ax), cy: Y(ay + 1.9), r: 2.6, fill: '#ff3b3b' }, this.gMain),
      el('circle', { cx: X(GEO.jibLen), cy: Y(48.3), r: 2.6, fill: '#ff3b3b' }, this.gMain),
      el('circle', { cx: X(GEO.cjEnd), cy: Y(48.6), r: 2.6, fill: '#ff3b3b' }, this.gMain),
    ];
  }

  buildCounterJib() {
    const g = this.comp('counterjib');
    const x0 = GEO.cjEnd, x1 = -GEO.towerHalf, y0 = GEO.cjY0, y1 = GEO.cjY1;
    el('line', { x1: X(x0), y1: Y(y0), x2: X(x1), y2: Y(y0), stroke: STRUCT, 'stroke-width': 2.4 }, g);
    el('line', { x1: X(x0), y1: Y(y1), x2: X(x1), y2: Y(y1), stroke: STRUCT, 'stroke-width': 2.4 }, g);
    const zz = [];
    let s = 0;
    for (let x = x1; x >= x0 - 0.01; x -= 1.5) zz.push([x, s++ % 2 ? y1 : y0]);
    el('polyline', { points: pts(zz), fill: 'none', stroke: STRUCT2, 'stroke-width': 1 }, g);
    el('line', { x1: X(x0), y1: Y(y1 + 1.0), x2: X(x1), y2: Y(y1 + 1.0), stroke: '#8796a7', 'stroke-width': 1 }, g);
    for (let x = x0; x <= x1; x += 3) el('line', { x1: X(x), y1: Y(y1), x2: X(x), y2: Y(y1 + 1.0), stroke: '#8796a7', 'stroke-width': 1 }, g);

    // contrapeso: blocos de concreto
    const cw = this.comp('counterweight');
    this.cwBlocks = [];
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * 0.95;
      this.cwBlocks.push(el('rect', { x: X(x), y: Y(y0), width: 0.92 * S, height: 4.0 * S, fill: '#7f8894', stroke: '#b3bcc6', 'stroke-width': 1 }, cw));
    }
    this.cwText = txt(cw, X(x0 + 2), Y(y0 - 2.2), '', { 'font-size': 12, fill: '#11161c', 'text-anchor': 'middle', 'font-weight': 700, class: 'L-values' });

    // guincho de elevação (simplificado na vista geral)
    const w = this.comp('hoistWinch');
    el('rect', { x: X(-13.4), y: Y(y1 + 0.35), width: 5.3 * S, height: 0.35 * S, fill: '#3b4756' }, w);
    el('rect', { x: X(-13.1), y: Y(y1 + 1.75), width: 2.1 * S, height: 1.4 * S, fill: '#4f6073', stroke: '#9fb0c2', 'stroke-width': 1 }, w);
    for (let x = -12.9; x < -11.1; x += 0.35) el('line', { x1: X(x), y1: Y(y1 + 1.7), x2: X(x), y2: Y(y1 + 0.45), stroke: '#33404e', 'stroke-width': 1 }, w);
    this.wBrake = el('rect', { x: X(-11.0), y: Y(y1 + 1.6), width: 0.3 * S, height: 1.1 * S, fill: '#e0a030' }, w);
    el('rect', { x: X(-10.7), y: Y(y1 + 1.6), width: 0.9 * S, height: 1.2 * S, fill: '#3a4858', stroke: '#9fb0c2', 'stroke-width': 1 }, w);
    const dc = [X(-9.0), Y(y1 + 1.15)];
    el('circle', { cx: dc[0], cy: dc[1], r: 0.85 * S, fill: '#2b3744', stroke: '#c3cad4', 'stroke-width': 1.3 }, w);
    this.wDrum = el('g', { transform: `translate(${dc[0]},${dc[1]})` }, w);
    for (let k = 0; k < 3; k++) el('line', { x1: 0, y1: 0, x2: 0, y2: -0.75 * S, stroke: '#c3cad4', 'stroke-width': 1, transform: `rotate(${k * 120})` }, this.wDrum);
    this.drumC = dc;
  }

  buildJib() {
    const g = this.comp('jib');
    const x0 = GEO.towerHalf, x1 = GEO.jibLen, yb = GEO.jibBot, yt = GEO.jibTop;
    el('line', { x1: X(x0), y1: Y(yb), x2: X(x1), y2: Y(yb), stroke: STRUCT, 'stroke-width': 2.6 }, g);
    el('polyline', { points: pts([[x0, yt], [x1 - 1.5, yt], [x1, yb]]), fill: 'none', stroke: STRUCT, 'stroke-width': 2.2 }, g);
    const zz = [];
    let s = 0;
    for (let x = x0; x <= x1 - 1.5 + 0.01; x += 2) zz.push([x, s++ % 2 ? yt : yb]);
    el('polyline', { points: pts(zz), fill: 'none', stroke: STRUCT2, 'stroke-width': 1 }, g);
    el('line', { x1: X(-GEO.towerHalf), y1: Y(yb), x2: X(x0), y2: Y(yb), stroke: STRUCT, 'stroke-width': 2.6 }, g);
    // guincho do carrinho (no pé da lança)
    const tw = this.comp('trolleyWinch');
    el('rect', { x: X(2.4), y: Y(48.9), width: 1.2 * S, height: 0.9 * S, fill: '#4f6073', stroke: '#9fb0c2', 'stroke-width': 1 }, tw);
    const tc = [X(4.2), Y(48.55)];
    el('circle', { cx: tc[0], cy: tc[1], r: 0.42 * S, fill: '#2b3744', stroke: '#c3cad4', 'stroke-width': 1.1 }, tw);
    this.tDrum = el('line', { x1: tc[0], y1: tc[1], x2: tc[0], y2: tc[1] - 4.5, stroke: '#c3cad4', 'stroke-width': 1 }, tw);
    this.tDrumC = tc;
  }

  buildMoving() {
    // cabos
    this.gRopes = el('g', { class: 'L-ropes' }, this.gMain);
    const hr = this.comp('hoistRope', this.gRopes);
    const tr = this.comp('trolleyRope', this.gRopes);
    const mk = (p, w = 1.3) => {
      const base = el('polyline', { fill: 'none', stroke: ROPE, 'stroke-width': w, 'stroke-linejoin': 'round' }, p);
      const dash = el('polyline', { fill: 'none', stroke: '#ffffff', 'stroke-width': w, 'stroke-dasharray': '3 9', 'stroke-opacity': 0.9 }, p);
      return { base, dash };
    };
    this.rHoist = mk(hr);
    this.rDead = mk(hr);
    this.rFalls = [0, 1, 2, 3].map(() => mk(hr, 1.2));
    this.rTrA = mk(tr, 1);
    this.rTrB = mk(tr, 1);

    // carrinho
    this.gTrolley = this.comp('trolley');
    const t = this.gTrolley;
    el('rect', { x: -0.85 * S, y: -0.95 * S, width: 1.7 * S, height: 0.75 * S, rx: 2, fill: '#55677b', stroke: '#b9c6d3', 'stroke-width': 1.2 }, t);
    for (const x of [-0.5, 0.5]) el('circle', { cx: x * S, cy: -0.12 * S, r: 2.6, fill: '#202a35', stroke: '#c3cad4', 'stroke-width': 1 }, t);
    this.trSheaves = [-0.4, 0.4].map((x) => el('circle', { cx: x * S, cy: 0, r: 3.2, fill: '#1c2530', stroke: '#c3cad4', 'stroke-width': 1 }, t));

    // cargas
    this.gLoads = el('g', {}, this.gMain);
    this.loadEls = [];

    // moitão e gancho (coordenadas locais em px, gancho em 0,0)
    this.gHook = this.comp('hook');
    const h = this.gHook;
    this.hookBlock = el('rect', { x: -9, y: -21, width: 18, height: 15, rx: 3, fill: '#e3a21a', stroke: '#5a3f08', 'stroke-width': 1 }, h);
    el('circle', { cx: 0, cy: -16, r: 4, fill: '#1c2530', stroke: '#e6edf3', 'stroke-width': 0.8 }, h);
    el('line', { x1: 0, y1: -6, x2: 0, y2: -2, stroke: '#9aa5b1', 'stroke-width': 2 }, h);
    el('path', { d: 'M0,-2 C0,3 6,4 5,-1', fill: 'none', stroke: '#d5dbe2', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, h);
    this.slings = el('polyline', { fill: 'none', stroke: '#e0b44a', 'stroke-width': 1.3 }, this.gMain);
  }

  makeLoad(l) {
    const g = this.comp('load-' + l.id, this.gLoads);
    const w = l.w * S, h = l.h * S;
    if (l.kind === 'bucket') {
      el('path', { d: `M${-w / 2},${-h} H${w / 2} L${w * 0.32},${-h * 0.18} L${w * 0.12},0 H${-w * 0.12} L${-w * 0.32},${-h * 0.18} Z`, fill: '#8a949f', stroke: '#d0d7de', 'stroke-width': 1.1 }, g);
      el('rect', { x: -w / 2 + 2, y: -h + 1.5, width: w - 4, height: 3.5, fill: '#b8b2a6' }, g);
      el('path', { d: `M${-w / 2},${-h} Q0,${-h - 9} ${w / 2},${-h}`, fill: 'none', stroke: '#d0d7de', 'stroke-width': 1.2 }, g);
    } else if (l.kind === 'form') {
      el('rect', { x: -w / 2, y: -h, width: w, height: h, fill: '#4f7aa3', stroke: '#b9d2ea', 'stroke-width': 1.1 }, g);
      for (let k = 1; k < 6; k++) el('line', { x1: -w / 2 + (w * k) / 6, y1: -h, x2: -w / 2 + (w * k) / 6, y2: 0, stroke: '#2f5375', 'stroke-width': 1 }, g);
    } else if (l.kind === 'pallet') {
      el('rect', { x: -w / 2, y: -2.5, width: w, height: 2.5, fill: '#9a7446' }, g);
      el('rect', { x: -w / 2 + 1, y: -h, width: w - 2, height: h - 2.5, fill: '#a9a39a', stroke: '#d8d2c8', 'stroke-width': 1 }, g);
      for (let k = 1; k < 4; k++) el('line', { x1: -w / 2 + 1, y1: -2.5 - ((h - 2.5) * k) / 4, x2: w / 2 - 1, y2: -2.5 - ((h - 2.5) * k) / 4, stroke: '#7d776e', 'stroke-width': 0.8 }, g);
      el('line', { x1: 0, y1: -h, x2: 0, y2: -2.5, stroke: '#7d776e', 'stroke-width': 0.8 }, g);
    } else {
      el('rect', { x: -w / 2, y: -h, width: w, height: h, fill: '#8b4a2f', stroke: '#d08a64', 'stroke-width': 1 }, g);
      for (let k = 1; k < 3; k++) el('line', { x1: -w / 2, y1: -(h * k) / 3, x2: w / 2, y2: -(h * k) / 3, stroke: '#5e2d1a', 'stroke-width': 0.8 }, g);
      for (const f of [-0.3, 0.3]) el('rect', { x: f * w - 1.5, y: -h - 0.5, width: 3, height: h + 1, fill: '#d6d6d6' }, g);
    }
    const tag = txt(g, 0, -h - (l.kind === 'bucket' ? 12 : 6), '', { 'font-size': 12, fill: '#e6edf3', 'text-anchor': 'middle', class: 'L-values', 'font-family': 'var(--mono)' });
    return { g, tag };
  }

  buildForces() {
    this.gForces = el('g', { class: 'L-forces' }, this.gMain);
    const m = this.comp('moment', this.gForces);
    this.mArrow = el('g', {}, m);
    this.mPath = el('path', { fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }, this.mArrow);
    this.mHead = el('path', { stroke: 'none' }, this.mArrow);
    this.mText = txt(m, X(6.6), Y(9.6), '', { 'font-size': 13, fill: '#e6edf3', 'text-anchor': 'start', 'font-weight': 600 });
  }

  buildLabels() {
    this.gLabels = el('g', { class: 'L-labels' }, this.gMain);
    const L = (x, y, s, lx, ly, anchor = 'middle') => {
      const g = el('g', {}, this.gLabels);
      if (lx != null) el('polyline', { points: pts([[lx, ly], [x, y]]), fill: 'none', stroke: '#8da0b6', 'stroke-width': 0.8, 'stroke-opacity': 0.7 }, g);
      const t = txt(g, X(x), Y(y) + (anchor === 'middle' ? 0 : 4), s, { 'font-size': 13, fill: '#c9d6e3', 'text-anchor': anchor });
      return { g, t };
    };
    L(-17.5, 39.6, 'Contrapeso');
    L(-10.6, 51.4, 'Guincho de elevação');
    L(-7.5, 44.6, 'Contralança');
    L(-2.0, 55.6, 'Topo', -0.3, 55.6, 'end');
    L(1.4, 59.2, 'Anemômetro', null, null, 'start');
    L(18, 54.4, 'Tirante');
    L(46, 49.4, 'Lança');
    L(7.4, 49.8, 'Guincho do carrinho', 4.6, 49.0, 'start');
    L(5.4, 42.6, 'Cabine', 4.3, 43.6, 'start');
    L(2.4, 35, 'Torre', 1.4, 35, 'start');
    L(4.6, -3.0, 'Base de concreto', 3.6, -2.0, 'start');
    L(35, 21.2, 'Prédio em obra');
    this.lblTrolley = L(0, 0, 'Carrinho', null, null, 'start');
    this.lblHook = L(0, 0, 'Moitão e gancho', null, null, 'start');
  }

  // ---------- quadros fixos (não dão zoom) ----------
  buildOverlay() {
    const ov = this.ov;
    ov.innerHTML = '';
    const defs = el('defs', {}, ov);
    const gr = el('linearGradient', { id: 'gStress', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    for (let i = 0; i <= 10; i++) el('stop', { offset: i / 10, 'stop-color': pColor(i / 10) }, gr);

    // detalhe do guincho de elevação
    const w = el('g', { class: 'inset', 'data-inset': 'winch' }, ov);
    this.inWinch = w;
    el('rect', { x: 0, y: 0, width: 300, height: 214, rx: 12, fill: '#0f1822', 'fill-opacity': 0.94, stroke: '#33465c' }, w);
    txt(w, 14, 22, 'GUINCHO DE ELEVAÇÃO · EM CORTE', { 'font-size': 11.5, fill: '#8da0b6', 'letter-spacing': 0.8 });
    el('line', { x1: 20, y1: 92, x2: 232, y2: 92, stroke: '#7d8a98', 'stroke-width': 3 }, w);
    // motor
    el('rect', { x: 16, y: 60, width: 78, height: 64, rx: 6, fill: '#3b4b5e', stroke: '#9fb0c2' }, w);
    for (let x = 22; x < 90; x += 7) el('line', { x1: x, y1: 62, x2: x, y2: 122, stroke: '#2c3846', 'stroke-width': 2 }, w);
    el('circle', { cx: 55, cy: 92, r: 21, fill: '#253140', stroke: '#c3cad4' }, w);
    this.iRotor = el('g', { transform: 'translate(55,92)' }, w);
    for (let k = 0; k < 4; k++) el('line', { x1: 0, y1: -4, x2: 0, y2: -18, stroke: '#e3a21a', 'stroke-width': 2, transform: `rotate(${k * 90})` }, this.iRotor);
    // freio
    el('rect', { x: 104, y: 64, width: 7, height: 56, fill: '#a8b2bd' }, w);
    this.iShoeT = el('rect', { x: 99, y: 56, width: 17, height: 8, rx: 2, fill: '#e0a030' }, w);
    this.iShoeB = el('rect', { x: 99, y: 120, width: 17, height: 8, rx: 2, fill: '#e0a030' }, w);
    this.iBrakeTxt = txt(w, 108, 150, '', { 'font-size': 11, fill: '#e0a030', 'text-anchor': 'middle' });
    // redutor
    el('rect', { x: 124, y: 58, width: 62, height: 68, rx: 6, fill: '#2e3b49', stroke: '#9fb0c2' }, w);
    this.iG1 = el('circle', { cx: 143, cy: 79, r: 12, fill: '#3c4b5c', stroke: '#c3cad4', 'stroke-width': 4, 'stroke-dasharray': '3 3' }, w);
    this.iG2 = el('circle', { cx: 165, cy: 104, r: 16, fill: '#3c4b5c', stroke: '#c3cad4', 'stroke-width': 4, 'stroke-dasharray': '3 3' }, w);
    // tambor
    el('circle', { cx: 238, cy: 92, r: 38, fill: '#1f2a36', stroke: '#c3cad4', 'stroke-width': 1.5 }, w);
    this.iWraps = el('circle', { cx: 238, cy: 92, r: 30, fill: 'none', stroke: ROPE, 'stroke-width': 6 }, w);
    this.iDrum = el('g', { transform: 'translate(238,92)' }, w);
    for (let k = 0; k < 3; k++) el('line', { x1: 0, y1: 0, x2: 0, y2: -24, stroke: '#9aa5b1', 'stroke-width': 2, transform: `rotate(${k * 120})` }, this.iDrum);
    el('circle', { cx: 238, cy: 92, r: 5, fill: '#9aa5b1' }, w);
    this.iRope = el('line', { x1: 238, y1: 62, x2: 292, y2: 40, stroke: ROPE, 'stroke-width': 2.4 }, w);
    this.iRopeDash = el('line', { x1: 238, y1: 62, x2: 292, y2: 40, stroke: '#fff', 'stroke-width': 2.4, 'stroke-dasharray': '3 7' }, w);
    for (const [x, s] of [[55, 'Motor'], [143 + 12, 'Redutor'], [238, 'Tambor']]) txt(w, x, 140, s, { 'font-size': 12, fill: '#c9d6e3', 'text-anchor': 'middle' });
    txt(w, 108, 138, 'Freio', { 'font-size': 12, fill: '#c9d6e3', 'text-anchor': 'middle' });
    this.iVals1 = txt(w, 14, 178, '', { 'font-size': 13, fill: '#f2b632', 'font-family': 'var(--mono)' });
    this.iVals2 = txt(w, 14, 198, '', { 'font-size': 12, fill: '#8da0b6' });

    // legenda
    const lg = el('g', { class: 'inset', 'data-inset': 'legend' }, ov);
    this.inLegend = lg;
    el('rect', { x: 0, y: 0, width: 300, height: 150, rx: 12, fill: '#0f1822', 'fill-opacity': 0.94, stroke: '#33465c' }, lg);
    txt(lg, 14, 22, 'LEGENDA', { 'font-size': 11.5, fill: '#8da0b6', 'letter-spacing': 0.8 });
    el('rect', { x: 14, y: 34, width: 120, height: 10, rx: 3, fill: 'url(#gStress)' }, lg);
    txt(lg, 142, 43, 'Esforço: folga → limite', { 'font-size': 12, fill: '#c9d6e3' });
    el('line', { x1: 14, y1: 66, x2: 134, y2: 66, stroke: ROPE, 'stroke-width': 2 }, lg);
    this.lgDash = el('line', { x1: 14, y1: 66, x2: 134, y2: 66, stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '3 9' }, lg);
    txt(lg, 142, 70, 'Cabo correndo', { 'font-size': 12, fill: '#c9d6e3' });
    el('rect', { x: 14, y: 84, width: 120, height: 10, rx: 3, fill: STRUCT }, lg);
    txt(lg, 142, 93, 'Estrutura metálica', { 'font-size': 12, fill: '#c9d6e3' });
    el('rect', { x: 14, y: 106, width: 120, height: 10, rx: 3, fill: '#7f8894' }, lg);
    txt(lg, 142, 115, 'Concreto', { 'font-size': 12, fill: '#c9d6e3' });
    el('path', { d: 'M20,138 A14,14 0 0 1 48,132', fill: 'none', stroke: '#e6edf3', 'stroke-width': 2 }, lg);
    el('path', { d: 'M48,126 L52,136 L42,136 Z', fill: '#e6edf3' }, lg);
    txt(lg, 64, 138, 'Momento na base da torre', { 'font-size': 12, fill: '#c9d6e3' });
  }

  setFormat(fmt, rw, rh) {
    this.fmt = fmt; this.rw = rw; this.rh = rh;
    this.svg.querySelectorAll('text').forEach((t) => {
      if (!t.dataset.fs) t.dataset.fs = t.getAttribute('font-size') || 13;
    });
    this.textK = null;
    this.insetScale = fmt === 'f916' ? 1.25 : 1;
    this.ov.setAttribute('viewBox', `0 0 ${rw} ${rh}`);
    this.placeInsets();
  }

  // pos: posição pedida pela cena (fica guardada até a próxima chamada; null volta ao padrão do formato)
  placeInsets(pos) {
    if (pos !== undefined) this.insetPos = pos;
    const p = this.insetPos || (this.fmt === 'f916'
      ? { winch: [this.rw - 12 - 300 * 1.25, 12], legend: [12, 12] }
      : { winch: [14, 290], legend: [1086, 540] });
    const k = this.insetScale || 1;
    const kl = this.fmt === 'f916' ? 0.93 : 1;
    this.inWinch.setAttribute('transform', `translate(${p.winch[0]},${p.winch[1]}) scale(${k})`);
    this.inLegend.setAttribute('transform', `translate(${p.legend[0]},${p.legend[1]}) scale(${kl})`);
  }

  setInsets(list) {
    this.insetsOn = list;
    this.inWinch.style.display = list.includes('winch') ? '' : 'none';
    this.inLegend.style.display = list.includes('legend') ? '' : 'none';
  }

  defaultCam() {
    return this.fmt === 'f916' ? { cx: 582, cy: 300, w: 1170 } : { cx: 700, cy: 392, w: 1400 };
  }

  setCam(c, now = false) {
    this.camT = { ...c };
    if (now) this.cam = { ...c };
  }

  setLayers(o) {
    Object.assign(this.layers, o);
    const c = this.svg.classList;
    for (const k of ['ropes', 'forces', 'labels', 'values']) c.toggle('hide-' + k, !this.layers[k]);
    c.toggle('forces-off', !this.layers.forces);
  }

  setFocus(list) {
    const on = list && list.length;
    this.svg.classList.toggle('dim', !!on);
    this.svg.querySelectorAll('[data-comp]').forEach((e) => {
      const id = e.getAttribute('data-comp');
      e.classList.toggle('focus', !!on && list.some((f) => id === f || (f.endsWith('*') && id.startsWith(f.slice(0, -1)))));
    });
  }

  setSel(id) {
    this.svg.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    if (id) this.svg.querySelectorAll(`[data-comp="${id}"]`).forEach((e) => e.classList.add('sel'));
  }

  resetFx() {
    this.fx = { motorAng: 0, gearAng: 0, drumAng: 0, trDrumAng: 0, blink: 0 };
    this.cam = { ...this.camT };
  }

  // ---------- por quadro ----------
  update(st, P, dt) {
    // câmera
    const k = 1 - Math.exp(-2.2 * dt);
    for (const a of ['cx', 'cy', 'w']) this.cam[a] += (this.camT[a] - this.cam[a]) * k;
    const vw = this.cam.w, vh = (vw * this.rh) / this.rw;
    this.svg.setAttribute('viewBox', `${(this.cam.cx - vw / 2).toFixed(2)} ${(this.cam.cy - vh / 2).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
    // textos: maiores no 9:16 (a grua inteira cabe em ~390 px de celular) e compensando o zoom da câmera
    const z = Math.max(1, this.defaultCam().w / vw);
    const tk = (this.fmt === 'f916' ? 1.75 : 1) / Math.pow(z, 0.8);
    if (this.textK == null || Math.abs(tk / this.textK - 1) > 0.01) {
      this.textK = tk;
      this.svg.querySelectorAll('text').forEach((t) => t.setAttribute('font-size', ((+t.dataset.fs || 13) * tk).toFixed(1)));
    }

    const falls = P.falls === 4 ? 4 : 2;
    const { tr, ho, sw, hook } = st;
    const r = tr.r;
    const forces = this.layers.forces;

    // esforços
    const s = st.s;
    if (forces) {
      this.chordF.setAttribute('stroke', pColor(s.Ff / 110));
      this.chordB.setAttribute('stroke', pColor(s.Fb / 110));
      this.pendJ.setAttribute('stroke', pColor(s.Tjib / 62));
      this.pendC.setAttribute('stroke', pColor(s.Tcj / 62));
    }
    const nb = Math.max(1, Math.min(6, Math.round(P.counterweight / 4.325)));
    this.cwBlocks.forEach((b, i) => (b.style.display = i < nb ? '' : 'none'));
    this.cwText.textContent = fmt(P.counterweight, 1) + ' t';
    this.cwText.setAttribute('x', X(GEO.cjEnd + (nb * 0.95) / 2));

    // momento na base
    {
      const M = s.M, a = Math.min(1, Math.abs(M) / 150);
      const R = 6.5 * S, cx = X(0), cy = Y(2.5);
      const span = 0.5 + 1.5 * a;
      const dir = M >= 0 ? 1 : -1;
      const a0 = -Math.PI / 2 - (dir * span) / 2, a1 = -Math.PI / 2 + (dir * span) / 2;
      const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
      const col = pColor(Math.abs(M) / 150);
      this.mPath.setAttribute('d', `M${p0[0]},${p0[1]} A${R},${R} 0 0 ${dir > 0 ? 1 : 0} ${p1[0]},${p1[1]}`);
      this.mPath.setAttribute('stroke', col);
      this.mPath.setAttribute('stroke-width', 2.5 + 4 * a);
      const tx = -Math.sin(a1) * dir, ty = Math.cos(a1) * dir;
      const hs = 7 + 5 * a;
      this.mHead.setAttribute('d', `M${p1[0] + tx * hs},${p1[1] + ty * hs} L${p1[0] - ty * hs * 0.6},${p1[1] + tx * hs * 0.6} L${p1[0] + ty * hs * 0.6},${p1[1] - tx * hs * 0.6} Z`);
      this.mHead.setAttribute('fill', col);
      this.mText.textContent = `M = ${fmt(Math.abs(M), 0)} t·m ${M >= 0 ? '→ frente' : '← trás'}`;
    }

    // carrinho
    this.gTrolley.setAttribute('transform', `translate(${X(r).toFixed(2)},${Y(GEO.pivotY).toFixed(2)})`);

    // moitão
    const hx = X(hook.x), hy = Y(hook.y);
    this.gHook.setAttribute('transform', `translate(${hx.toFixed(2)},${hy.toFixed(2)}) rotate(${(-D(sw.th)).toFixed(2)})`);
    const up = [-Math.sin(sw.th), Math.cos(sw.th)], perp = [Math.cos(sw.th), Math.sin(sw.th)];
    const blockTop = [hook.x + up[0] * 1.75, hook.y + up[1] * 1.75];

    // cabos de elevação
    const ry = 46.9;
    const offs = falls === 4 ? [-0.45, -0.15, 0.15, 0.45] : [-0.3, 0.3];
    const boffs = falls === 4 ? [-0.5, -0.17, 0.17, 0.5] : [-0.35, 0.35];
    const dc = this.drumC;
    const drumTop = [-9.0, GEO.cjY1 + 2.0];
    const hoistPts = pts([drumTop, [0, 49.6], [1.8, ry], [r + offs[0], ry], [r + offs[0], GEO.pivotY]]);
    const deadPts = pts([[r + offs[offs.length - 1], GEO.pivotY], [r + offs[offs.length - 1], ry - 0.15], [GEO.jibLen - 0.6, ry - 0.15]]);
    const ro = (-ho.ropeS * S).toFixed(1);
    this.setRope(this.rHoist, hoistPts, ro);
    this.setRope(this.rDead, deadPts, ro);
    this.rFalls.forEach((f, i) => {
      if (i >= falls) { f.base.style.display = f.dash.style.display = 'none'; return; }
      f.base.style.display = f.dash.style.display = '';
      const bx = blockTop[0] + perp[0] * boffs[i] * 0.55, by = blockTop[1] + perp[1] * boffs[i] * 0.55;
      this.setRope(f, pts([[r + offs[i], GEO.pivotY], [bx, by]]), ((i % 2 ? 1 : -1) * ho.ropeS * S * 0.5).toFixed(1));
    });
    // cabo do carrinho (laço fechado)
    const tc = [4.2, 48.55], ty = 46.62;
    const to = (-tr.s * S).toFixed(1);
    this.setRope(this.rTrA, pts([[tc[0] - 0.42, tc[1]], [tc[0] - 0.42, ty], [r - 0.85, ty]]), to);
    this.setRope(this.rTrB, pts([[tc[0] + 0.42, tc[1]], [GEO.jibLen - 1.3, 47.75], [GEO.jibLen - 1.3, ty], [r + 0.85, ty]]), (tr.s * S).toFixed(1));

    // cargas
    if (!this.loadEls.length) {
      this.loadEls = st.loads.map((l) => this.makeLoad(l));
      this.setFormat(this.fmt, this.rw, this.rh);
    }
    st.loads.forEach((l, i) => {
      const e = this.loadEls[i];
      const attachedHanging = st.load === i && !l.resting;
      const rot = attachedHanging ? -D(sw.th) : 0;
      e.g.setAttribute('transform', `translate(${X(l.x).toFixed(2)},${Y(l.y).toFixed(2)}) rotate(${rot.toFixed(2)},0,${(-l.h * S).toFixed(1)})`);
      e.tag.textContent = fmt(l.mass, 1) + ' t';
    });
    // lingas
    if (st.load != null) {
      const l = st.loads[st.load];
      const th = l.resting ? 0 : sw.th;
      const top = [l.x, l.y + l.h];
      const c = Math.cos(th), sn = Math.sin(th);
      const hw = l.w * 0.4;
      const pL = [top[0] - hw * c, top[1] - hw * sn], pR = [top[0] + hw * c, top[1] + hw * sn];
      this.slings.setAttribute('points', pts([pL, [hook.x, hook.y], pR]));
      this.slings.style.display = '';
    } else this.slings.style.display = 'none';

    // guinchos girando
    const fx = this.fx;
    fx.drumAng += (ho.v * falls * dt) / 0.6 * D(1);
    fx.trDrumAng += (tr.v * dt) / 0.35 * D(1);
    this.wDrum.setAttribute('transform', `translate(${dc[0]},${dc[1]}) rotate(${(-fx.drumAng).toFixed(1)})`);
    const tcc = this.tDrumC, ta = fx.trDrumAng / D(1);
    this.tDrum.setAttribute('x2', tcc[0] + Math.sin(ta) * 4.5);
    this.tDrum.setAttribute('y2', tcc[1] - Math.cos(ta) * 4.5);
    this.wBrake.setAttribute('fill', ho.brake ? '#e0a030' : '#4b5a6b');

    // anemômetro
    const ca = Math.cos(st.wind.ang);
    this.anemoArm.setAttribute('x1', -10 * ca); this.anemoArm.setAttribute('x2', 10 * ca);
    this.cupA.setAttribute('cx', -10 * ca); this.cupB.setAttribute('cx', 10 * ca);
    const on = st.power ? (Math.floor(st.t * 1.2) % 2 === 0 ? 1 : 0.25) : 0.25;
    this.beacons.forEach((b) => b.setAttribute('opacity', on));

    // rótulos que acompanham as peças
    this.lblTrolley.t.setAttribute('x', X(r + 1.3)); this.lblTrolley.t.setAttribute('y', Y(44.6));
    const lh = this.lblHook.t;
    const ldx = st.load != null && !st.loads[st.load].resting ? st.loads[st.load].w / 2 + 0.8 : 1.2;
    lh.setAttribute('x', X(hook.x + Math.max(1.2, ldx))); lh.setAttribute('y', Y(hook.y + 1.0));
    this.lblHook.t.style.display = hook.y > 4 ? '' : 'none';

    // detalhe do guincho
    if (this.insetsOn.includes('winch')) {
      fx.motorAng += (ho.hz / 2) * 360 * dt * 0.08 * Math.sign(ho.v || 0);
      this.iRotor.setAttribute('transform', `translate(55,92) rotate(${fx.motorAng.toFixed(1)})`);
      this.iG1.setAttribute('stroke-dashoffset', (fx.motorAng * 0.25).toFixed(1));
      this.iG2.setAttribute('stroke-dashoffset', (-fx.motorAng * 0.12).toFixed(1));
      this.iDrum.setAttribute('transform', `translate(238,92) rotate(${(-fx.drumAng).toFixed(1)})`);
      const wrapR = 22 + Math.max(0, Math.min(10, (GEO.pivotY - ho.L) / 4.4));
      this.iWraps.setAttribute('r', wrapR.toFixed(1));
      this.iWraps.setAttribute('stroke-width', (4 + (wrapR - 22) * 0.6).toFixed(1));
      this.iRope.setAttribute('y1', 92 - wrapR); this.iRopeDash.setAttribute('y1', 92 - wrapR);
      this.iRopeDash.setAttribute('stroke-dashoffset', (-ho.ropeS * 14).toFixed(1));
      const gap = ho.brake ? 0 : 4;
      this.iShoeT.setAttribute('y', 56 - gap); this.iShoeB.setAttribute('y', 120 + gap);
      const sc = ho.brake ? '#e0a030' : '#4b5a6b';
      this.iShoeT.setAttribute('fill', sc); this.iShoeB.setAttribute('fill', sc);
      this.iBrakeTxt.textContent = ho.slipping ? 'patinando!' : ho.brake ? 'aplicado' : 'solto';
      this.iBrakeTxt.setAttribute('fill', ho.slipping ? '#ff4d4d' : ho.brake ? '#e0a030' : '#3ecf72');
      this.iVals1.textContent = `${fmt(ho.hz, 0)} Hz · ${fmt(ho.amps, 0)} A · ${fmt(Math.abs(ho.kw), 0)} kW`;
      this.iVals2.textContent = `cabo ${fmt(Math.abs(ho.v * falls) * 60, 0)} m/min · gancho ${fmt(Math.abs(ho.v) * 60, 0)} m/min · ${falls} cabos`;
    }
    this.lgDash.setAttribute('stroke-dashoffset', (-st.t * 18).toFixed(1));
  }

  setRope(r, p, off) {
    r.base.setAttribute('points', p);
    r.dash.setAttribute('points', p);
    r.dash.setAttribute('stroke-dashoffset', off);
  }
}
