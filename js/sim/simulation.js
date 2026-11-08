// Física da grua martelo. Puro JS sobre o objeto de estado `st` (sem DOM).
// Carrinho e guincho com rampas de inversor, pêndulo da carga, limitador de momento,
// fins de curso, vento e esforços na estrutura por equilíbrio de momentos.

import { G, GEO, MASS, DRIVE, LOADS, LIMITS, DEFAULTS } from '../config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const qMax = (falls) => (falls === 4 ? 8 : 4);
export const capacity = (r, falls) => Math.min(qMax(falls), GEO.Mcap / Math.max(r, 0.1));
export const hookMass = (falls) => (falls === 4 ? MASS.hook4 : MASS.hook2);

// Altura da superfície mais alta sob o intervalo [x0, x1] (chão, base da torre, laje do prédio)
export function surfaceAt(x0, x1) {
  let s = 0;
  const b = GEO.building;
  if (x1 > b.x0 && x0 < b.x1) s = Math.max(s, b.top);
  const f = GEO.base;
  if (x1 > f.x0 && x0 < f.x1) s = Math.max(s, f.top);
  return s;
}

export function createState(P = DEFAULTS, prep = {}) {
  const loads = LOADS.map((d) => {
    const o = (prep.loads && prep.loads[d.id]) || {};
    const x = o.x ?? d.x;
    const L = { ...d, mass: (P.masses && P.masses[d.id]) ?? d.mass, x, resting: true };
    L.y = o.y ?? surfaceAt(x - d.w / 2, x + d.w / 2);
    return L;
  });
  const st = {
    t: 0,
    power: !!prep.power,
    estop: false,
    input: { trolley: 0, hoist: 0, horn: false },
    tr: { r: prep.r ?? 10, v: 0, a: 0, vt: 0, brake: true, hz: 0, amps: 0, gear: 0, s: 0 },
    ho: { L: 0, v: 0, vt: 0, brake: true, hz: 0, amps: 0, gear: 0, kw: 0, slip: 0, ropeS: 0, mt: 0 },
    sw: { th: 0, om: 0 },
    hook: { x: 0, y: 0, tip: 0 },
    load: null,
    loads,
    wind: { v: P.wind, ang: 0, gust: 0, ph: [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28] },
    lim: { meas: 0, cap: 4, util: 0, uLoad: 0, uMom: 0, pre: false, cut: false, danger: false,
           windPre: false, windStop: false, top: false, slack: false, zone: false, rEnd: false },
    s: { M: 0, N: 0, Tjib: 0, Tcj: 0, Ff: 0, Fb: 0 },
    can: { attach: -1, release: false },
    ev: [],
  };
  const hookY = prep.h ?? 20; // altura do ponto do gancho
  st.ho.L = clamp(GEO.pivotY - hookY, GEO.Lmin, GEO.pivotY - 0.5);
  if (prep.attach) {
    const i = loads.findIndex((l) => l.id === prep.attach);
    if (i >= 0) {
      const l = loads[i];
      st.load = i;
      if (prep.hanging) {
        l.resting = false;
      } else {
        // gancho logo acima da carga, lingas esticadas
        l.x = st.tr.r;
        l.y = surfaceAt(l.x - l.w / 2, l.x + l.w / 2);
        st.ho.L = GEO.pivotY - (l.y + l.h) - (prep.slack ? 0.6 : GEO.sling + 0.02);
      }
    }
  }
  update(st, P);
  return st;
}

function stepIdx(u) {
  const a = Math.abs(u);
  return a < 0.08 ? 0 : a < 0.35 ? 1 : a < 0.6 ? 2 : a < 0.85 ? 3 : 4;
}

// Passo de física (dt pequeno, 1/240 s)
export function step(st, P, dt) {
  st.t += dt;
  const falls = P.falls === 4 ? 4 : 2;
  const hookM = hookMass(falls);
  const on = st.power && !st.estop;
  const { tr, ho, sw, lim } = st;
  const Ld = st.load != null ? st.loads[st.load] : null;
  const b = GEO.building;

  // ---------- vento ----------
  const W = st.wind;
  let wv = P.wind;
  if (P.gusts && wv > 0) {
    const n = Math.sin(st.t * 0.37 + W.ph[0]) + 0.6 * Math.sin(st.t * 1.13 + W.ph[1]) + 0.35 * Math.sin(st.t * 2.7 + W.ph[2]);
    wv *= 1 + 0.2 * n;
  }
  if (W.gust > 0) {
    W.gust = Math.max(0, W.gust - dt);
    const k = Math.sin(Math.PI * (1 - W.gust / 5));
    wv += 45 * k * k;
  }
  W.v = Math.max(0, wv);
  const wms = W.v / 3.6;
  const q = 0.5 * 1.225 * wms * wms; // Pa
  W.ang += wms * dt * 1.6;
  lim.windPre = W.v >= LIMITS.windPre;
  lim.windStop = lim.windStop ? W.v >= LIMITS.windStop - 4 : W.v >= LIMITS.windStop;

  // ---------- carga medida (célula de carga) ----------
  let meas = 0;
  let Dtop = 0;
  if (Ld && Ld.resting) {
    Dtop = Math.hypot(Ld.x - tr.r, GEO.pivotY - (Ld.y + Ld.h));
    if (ho.L <= Dtop - GEO.sling + 0.06) meas = Ld.mass;
  } else if (Ld) meas = Ld.mass;

  // ---------- limitador de momento ----------
  const qm = qMax(falls);
  lim.meas = meas;
  lim.cap = capacity(tr.r, falls);
  lim.uLoad = meas / qm;
  lim.uMom = (meas * tr.r) / GEO.Mcap;
  lim.util = Math.max(lim.uLoad, lim.uMom);
  lim.pre = lim.util >= (lim.pre ? 0.88 : LIMITS.pre);
  const over = lim.cut ? lim.util >= 0.985 : lim.util >= LIMITS.cut;
  lim.cut = P.limiter && over;
  lim.danger = !P.limiter && lim.util > 1.0;

  // ---------- zona proibida (prédio): carga baixa não entra na obra pelo lado ----------
  // Prevê onde a carga para (frenagem do carrinho + balanço) e bloqueia antes de bater.
  let zoneOut = false, zoneIn = false;
  {
    const hang = Ld && !Ld.resting;
    const hw = hang ? Ld.w / 2 : 0.4;
    const cx = hang ? Ld.x : st.hook.x;
    const bottom = hang ? Ld.y : st.hook.tip;
    if (bottom < b.top + 0.15 && !(Ld && Ld.resting)) {
      const Lp = hang ? ho.L + GEO.sling + Ld.h / 2 : ho.L;
      const swing = Math.abs(Lp * Math.sin(sw.th)) + 0.25;
      const stop = (tr.v * tr.v) / (2 * DRIVE.trolleyA);
      if (cx < b.x0) zoneOut = tr.r + Math.max(0, Math.sign(tr.v)) * stop + swing + hw > b.x0;
      if (cx > b.x1) zoneIn = tr.r - Math.max(0, -Math.sign(tr.v)) * stop - swing - hw < b.x1;
    }
  }
  lim.zone = zoneOut || zoneIn;

  // ---------- carrinho ----------
  {
    const ti = on ? st.input.trolley : 0;
    let g = stepIdx(ti);
    const dir = Math.sign(ti);
    if (dir > 0 && (lim.cut || lim.windStop || zoneOut)) g = 0;
    if (dir < 0 && zoneIn) g = 0;
    if (dir > 0 && (lim.pre || lim.windPre) && g > 2) g = 2;
    tr.gear = g * dir;
    let vt = dir * DRIVE.steps[g] * DRIVE.trolleyV;
    if (vt > 0) vt = tr.r >= GEO.rMax ? 0 : Math.min(vt, Math.max(0.1, (GEO.rMax - tr.r) / 3));
    if (vt < 0) vt = tr.r <= GEO.rMin ? 0 : Math.max(vt, -Math.max(0.1, (tr.r - GEO.rMin) / 3));
    tr.vt = vt;
    const aMax = on ? DRIVE.trolleyA : 1.2;
    const dv = clamp(vt - tr.v, -aMax * dt, aMax * dt);
    tr.v += dv;
    tr.a = dv / dt;
    tr.r += tr.v * dt;
    if (tr.r > GEO.rMax) { tr.r = GEO.rMax; tr.v = 0; }
    if (tr.r < GEO.rMin) { tr.r = GEO.rMin; tr.v = 0; }
    const brk = vt === 0 && Math.abs(tr.v) < 0.006;
    if (brk) tr.v = 0;
    if (brk !== tr.brake) st.ev.push({ type: brk ? 'trBrakeOn' : 'trBrakeOff' });
    tr.brake = brk;
    tr.s += tr.v * dt;
    lim.rEnd = tr.r >= GEO.rMax - 0.05 || tr.r <= GEO.rMin + 0.05;
  }

  // ---------- guincho de elevação ----------
  const mt = (Ld && !Ld.resting ? Ld.mass : meas) + hookM; // t pendurada no cabo
  ho.mt = mt;
  {
    // limite inferior: cabo frouxo (gancho ou carga apoiados)
    let Llow = GEO.pivotY - 0.5;
    if (Ld && Ld.resting) Llow = Math.min(Llow, Dtop - 0.35);
    lim.slack = ho.L >= Llow - 0.02 || st.hook.rest;
    lim.top = ho.L <= GEO.Lmin + 0.05;

    const hi = on ? st.input.hoist : 0;
    let g = stepIdx(hi);
    const dir = Math.sign(hi);
    if (dir > 0 && (lim.cut || lim.windStop || lim.top)) g = 0;
    if (dir > 0 && (lim.pre || lim.windPre) && g > 2) g = 2;
    if (dir < 0 && lim.slack) g = 0;
    ho.gear = g * dir;
    const vNom = DRIVE.hoistRope / falls;
    const vPow = DRIVE.hoistP / (mt * G);
    const vmax = dir > 0 ? Math.min(vNom, vPow) : vNom;
    let vt = dir * DRIVE.steps[g] * vmax;
    if (vt > 0) vt = Math.min(vt, Math.max(0.08, (ho.L - GEO.Lmin) / 3));
    ho.vt = vt;
    const aMax = on ? DRIVE.hoistA : 4;
    const dv = clamp(vt - ho.v, -aMax * dt, aMax * dt);
    ho.v += dv;
    ho.L -= ho.v * dt;
    // batentes
    if (ho.L < GEO.Lmin) { ho.L = GEO.Lmin; ho.v = Math.min(ho.v, 0); }
    if (ho.L > Llow) { ho.L = Llow; ho.v = Math.max(ho.v, 0); }
    // carga acima do limite não sai do chão
    if (Ld && Ld.resting && lim.cut) {
      const Lt = Dtop - GEO.sling + 0.001;
      if (ho.L < Lt) { ho.L = Lt; ho.v = Math.min(ho.v, 0); }
    }
    const brk = vt === 0 && Math.abs(ho.v) < 0.006;
    if (brk) ho.v = 0;
    if (brk !== ho.brake) {
      st.ev.push({ type: brk ? 'hoBrakeOn' : 'hoBrakeOff', mt });
      if (brk && P.brakeWorn && mt > 1) ho.slip = 0.12 * mt;
    }
    ho.brake = brk;
    if (ho.brake && ho.slip > 0) {
      const d = Math.min(ho.slip, 0.45 * dt);
      ho.L = Math.min(Llow, ho.L + d);
      ho.slip -= d;
      ho.slipping = d > 0;
    } else ho.slipping = false;
    ho.ropeS += ho.v * falls * dt;

    // motores (valores de painel)
    const rated = ((qm + hookM) * G) / falls; // kN por cabo na carga nominal
    const Frope = (mt * G) / falls;
    ho.hz = (Math.abs(ho.v * falls) / DRIVE.hoistRope) * DRIVE.hzMax;
    ho.amps = ho.brake || !on ? 0 : 8 + 72 * (Frope / rated) * (1 + (dv / dt) / 4);
    ho.kw = mt * G * ho.v;
    tr.hz = (Math.abs(tr.v) / DRIVE.trolleyV) * DRIVE.hzMax;
    tr.amps = tr.brake || !on ? 0 : 3 + 8 * Math.abs(tr.a) / DRIVE.trolleyA + 3 * (mt / 8) + 2 * Math.abs(tr.v);
  }

  // ---------- carga apoiada x pendurada ----------
  if (Ld && Ld.resting) {
    const top = Ld.y + Ld.h;
    const D = Math.hypot(Ld.x - tr.r, GEO.pivotY - top);
    sw.th = Math.atan2(Ld.x - tr.r, GEO.pivotY - top);
    sw.om = 0;
    // só sai do chão quando o cabo puxa (gancho subindo); engatar descendo não levanta a carga
    if (!lim.cut && ho.L < D - GEO.sling && ho.v > -0.01) {
      Ld.resting = false;
      ho.L = D - GEO.sling - 0.01;
      st.ev.push({ type: 'lift', mass: Ld.mass });
    }
  }

  // ---------- pêndulo ----------
  const hanging = Ld && !Ld.resting;
  const Lp = hanging ? ho.L + GEO.sling + Ld.h / 2 : ho.L + 0.4;
  if (!(Ld && Ld.resting)) {
    const mkg = (hanging ? Ld.mass + hookM : hookM) * 1000;
    const A = hanging ? Ld.area : 0.6;
    const Fw = q * 1.2 * A;
    const Ldot = -ho.v;
    const thdd = (-G * Math.sin(sw.th) - tr.a * Math.cos(sw.th) - 2 * Ldot * sw.om + (Fw / mkg) * Math.cos(sw.th)) / Lp
      - 0.012 * sw.om;
    const om0 = sw.om, th0 = sw.th;
    sw.om += thdd * dt;
    sw.th += sw.om * dt;
    if (hanging) {
      // batida na lateral do prédio: a carga encosta na parede e volta com perda
      const lx = tr.r + Lp * Math.sin(sw.th);
      const by = GEO.pivotY - Lp * Math.cos(sw.th) - Ld.h / 2;
      const hw = Ld.w / 2;
      if (by < b.top - 0.05 && lx + hw > b.x0 && lx - hw < b.x1) {
        const fromLeft = Ld.x < (b.x0 + b.x1) / 2;
        const target = fromLeft ? b.x0 - hw - 0.01 : b.x1 + hw + 0.01;
        sw.th = Math.asin(clamp((target - tr.r) / Lp, -0.95, 0.95));
        const into = fromLeft ? om0 > 0 : om0 < 0;
        if (into && Math.abs(om0 * Lp) > 0.03) st.ev.push({ type: 'bump', v: Math.abs(om0 * Lp) });
        sw.om = into ? -0.3 * om0 : 0;
      }
      void th0;
    }
    if (st.hook.rest) sw.om *= 0.9;
  }

  update(st, P, dt);
}

// Posições derivadas, pouso, engate e esforços (também chamado na criação)
export function update(st, P, dt = 0) {
  const falls = P.falls === 4 ? 4 : 2;
  const hookM = hookMass(falls);
  const { tr, ho, sw } = st;
  const Ld = st.load != null ? st.loads[st.load] : null;
  const H = st.hook;

  if (Ld && Ld.resting) {
    const top = Ld.y + Ld.h;
    sw.th = Math.atan2(Ld.x - tr.r, GEO.pivotY - top);
  }
  H.x = tr.r + ho.L * Math.sin(sw.th);
  H.y = GEO.pivotY - ho.L * Math.cos(sw.th);
  H.tip = H.y - 0.35;
  H.rest = false;

  if (Ld && !Ld.resting) {
    const Lp = ho.L + GEO.sling + Ld.h / 2;
    Ld.x = tr.r + Lp * Math.sin(sw.th);
    Ld.y = GEO.pivotY - Lp * Math.cos(sw.th) - Ld.h / 2;
    const s = surfaceAt(Ld.x - Ld.w / 2, Ld.x + Ld.w / 2);
    if (Ld.y < s && Ld.y > s - 0.8) {
      const v = Math.max(0, -ho.v) + Math.abs(sw.om * Lp) * 0.3;
      Ld.y = s;
      Ld.resting = true;
      sw.om = 0;
      st.ev.push({ type: 'land', v, mass: Ld.mass });
    }
  } else if (!Ld) {
    // gancho vazio apoia no chão ou em cima de uma carga
    let s = surfaceAt(H.x - 0.3, H.x + 0.3);
    for (const l of st.loads) if (Math.abs(H.x - l.x) < l.w / 2) s = Math.max(s, l.y + l.h);
    if (H.tip <= s) {
      H.rest = true;
      const c = Math.max(0.2, Math.cos(sw.th));
      ho.L = (GEO.pivotY - (s + 0.35)) / c;
      H.y = s + 0.35;
      H.x = tr.r + ho.L * Math.sin(sw.th);
      H.tip = s;
      if (ho.v < 0) ho.v = 0;
    }
  }

  // engate possível? (gancho vazio, logo acima de uma carga apoiada)
  st.can.attach = -1;
  if (!Ld) {
    st.loads.forEach((l, i) => {
      const top = l.y + l.h;
      if (l.resting && Math.abs(H.x - l.x) < Math.max(0.9, l.w / 2) && H.tip >= top - 0.05 && H.tip <= top + GEO.sling + 1.2)
        st.can.attach = i;
    });
  }
  st.can.release = !!(Ld && Ld.resting && st.lim.meas === 0);

  // ---------- esforços na estrutura ----------
  const C = P.counterweight;
  const meas = st.lim.meas;
  const lx = Ld ? Ld.x : tr.r;
  const wms = st.wind.v / 3.6;
  const q = 0.5 * 1.225 * wms * wms;
  const Mwind = (q * 70 * 32) / 9810; // treliça vista de lado, t·m
  const M =
    MASS.jib[0] * MASS.jib[1] + MASS.trolley * tr.r + hookM * H.x + meas * lx +
    MASS.cj[0] * MASS.cj[1] + MASS.winch[0] * MASS.winch[1] + C * MASS.cwArm +
    MASS.head[0] * MASS.head[1] + MASS.cab[0] * MASS.cab[1] + Mwind;
  const N = MASS.jib[0] + MASS.trolley + hookM + meas + MASS.cj[0] + MASS.winch[0] + C + MASS.head[0] + MASS.cab[0] +
    MASS.mastPerM * GEO.mastTop;
  const bw = 2 * GEO.towerHalf;
  const r0 = GEO.towerHalf;
  const [tx, ty] = GEO.jibTie, [ax, ay] = GEO.apex, [cx, cy] = GEO.cjTie;
  const Mj = MASS.jib[0] * (MASS.jib[1] - r0) + MASS.trolley * (tr.r - r0) + hookM * (H.x - r0) + meas * (lx - r0);
  const Tjib = (Mj / (tx - r0)) * (Math.hypot(tx - ax, ay - ty) / (ay - ty));
  const Mc = MASS.cj[0] * (-MASS.cj[1] - r0) + MASS.winch[0] * (-MASS.winch[1] - r0) + C * (-MASS.cwArm - r0);
  const Tcj = (Mc / (-cx - r0)) * (Math.hypot(cx - ax, ay - cy) / (ay - cy));
  Object.assign(st.s, { M, N, Tjib, Tcj, Ff: N / 2 + M / bw, Fb: N / 2 - M / bw });
}

// Engatar / soltar (botão do operador)
export function attach(st, P) {
  if (st.load != null || st.can.attach < 0) return false;
  st.load = st.can.attach;
  st.ev.push({ type: 'attach' });
  update(st, P);
  return true;
}
export function release(st, P) {
  if (!st.can.release) return false;
  st.load = null;
  st.ev.push({ type: 'detach' });
  update(st, P);
  return true;
}
