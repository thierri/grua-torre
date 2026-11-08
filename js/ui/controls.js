// Comandos do operador: energia, emergência, buzina, joysticks (toque/mouse), teclado, controle de videogame,
// botão de engate. O roteiro da apresentação escreve no mesmo lugar (override) e pode usar um piloto automático.
import { DRIVE } from '../config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const THR = [0.08, 0.35, 0.6, 0.85];
const ICON_PWR = '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>';
const ICON_HORN = '<svg viewBox="0 0 24 24"><path d="M3 9h4l7-5v16l-7-5H3z"/><path d="M17 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

export class Controls {
  constructor(root, app) {
    this.app = app;
    this.root = root;
    this.user = { trolley: 0, hoist: 0, horn: false };
    this.kb = { trolley: 0, hoist: 0, tDir: 0, hDir: 0 };
    this.script = null;   // { trolley, hoist, horn } escrito pelo roteiro
    this.auto = null;     // { r, h, catch } piloto automático do roteiro
    root.innerHTML = `
      <div class="cgrp">
        <div class="cb"><button class="pwr" id="btnPower" data-spot="power" aria-label="Energia">${ICON_PWR}</button><label>Energia</label></div>
        <div class="cb"><button class="estop" id="btnEstop" data-spot="estop" aria-label="Emergência"><span></span></button><label>Emergência</label></div>
        <div class="cb"><button class="horn" id="btnHorn" aria-label="Buzina">${ICON_HORN}</button><label>Buzina</label></div>
      </div>
      <div class="joy h" id="joyT" data-spot="joyT">
        <div class="jl"><b>Carrinho</b><span class="g">parado</span></div>
        <div class="pad">${this.marks('h')}<div class="knob"></div></div>
        <div class="ends"><span>◀ para dentro</span><span>para fora ▶</span></div>
      </div>
      <div class="cmid" data-spot="hookbtn">
        <button class="hookbtn" id="btnHook">Engatar carga</button>
        <div id="hookMsg"></div>
        <div class="keys"><kbd>←</kbd><kbd>→</kbd> carrinho · <kbd>↑</kbd><kbd>↓</kbd> gancho<br><kbd>L</kbd> energia · <kbd>G</kbd> engatar · <kbd>B</kbd> buzina · <kbd>X</kbd> emergência</div>
      </div>
      <div class="joy v" id="joyH" data-spot="joyH">
        <div class="pad">${this.marks('v')}<div class="knob"></div></div>
        <div class="vcol"><div class="jl"><b>Gancho</b></div><span class="g">parado</span>
        <div class="ends"><span>▲ sobe</span><span>▼ desce</span></div></div>
      </div>
      <div class="info" id="info"></div>`;
    const $ = (s) => root.querySelector(s);
    this.e = {
      power: $('#btnPower'), estop: $('#btnEstop'), horn: $('#btnHorn'), hook: $('#btnHook'), msg: $('#hookMsg'),
      joyT: $('#joyT'), joyH: $('#joyH'),
    };
    this.e.power.addEventListener('click', () => app.power(!app.st.power));
    this.e.estop.addEventListener('click', () => app.estop(!app.st.estop));
    const horn = (v) => (e) => { e.preventDefault(); this.user.horn = v; };
    this.e.horn.addEventListener('pointerdown', horn(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.e.horn.addEventListener(ev, horn(false));
    this.e.hook.addEventListener('click', () => app.hookAction());
    this.joy(this.e.joyT, 'h', (v) => (this.user.trolley = v));
    this.joy(this.e.joyH, 'v', (v) => (this.user.hoist = v));
    this.keys();
  }

  marks(axis) {
    const travel = axis === 'h' ? 0.8 : 0.72;
    let s = `<span class="mk z" style="${axis === 'h' ? 'left:50%' : 'top:50%'}"></span>`;
    for (const t of THR.slice(1)) for (const sg of [-1, 1]) {
      const p = 50 + sg * t * 50 * travel;
      s += `<span class="mk" style="${axis === 'h' ? `left:${p}%` : `top:${p}%`}"></span>`;
    }
    return s;
  }

  joy(root, axis, set) {
    const pad = root.querySelector('.pad');
    let id = null;
    const move = (e) => {
      const r = pad.getBoundingClientRect();
      const kn = pad.querySelector('.knob').getBoundingClientRect();
      if (axis === 'h') {
        const travel = (r.width - kn.width) / 2;
        set(clamp((e.clientX - (r.left + r.width / 2)) / travel, -1, 1));
      } else {
        const travel = (r.height - kn.height) / 2;
        set(clamp(-(e.clientY - (r.top + r.height / 2)) / travel, -1, 1));
      }
    };
    pad.addEventListener('pointerdown', (e) => {
      id = e.pointerId; pad.setPointerCapture(id); root.classList.add('active'); move(e); e.preventDefault();
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId === id) { id = null; set(0); root.classList.remove('active'); } };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }

  keys() {
    const map = { ArrowLeft: ['t', -1], KeyA: ['t', -1], ArrowRight: ['t', 1], KeyD: ['t', 1], ArrowUp: ['h', 1], KeyW: ['h', 1], ArrowDown: ['h', -1], KeyS: ['h', -1] };
    this.held = new Set();
    window.addEventListener('keydown', (e) => {
      if (this.app.pres && this.app.pres.active) return;
      if (e.target.tagName === 'INPUT') return;
      if (map[e.code]) { this.held.add(e.code); e.preventDefault(); }
      if (e.repeat) return;
      if (e.code === 'KeyL') this.app.power(!this.app.st.power);
      if (e.code === 'KeyX') this.app.estop(!this.app.st.estop);
      if (e.code === 'KeyG') this.app.hookAction();
      if (e.code === 'KeyB') this.user.hornKey = true;
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
      if (e.code === 'KeyB') this.user.hornKey = false;
    });
    window.addEventListener('blur', () => this.held.clear());
    this.map = map;
  }

  resetFx() {
    this.user = { trolley: 0, hoist: 0, horn: false };
    this.kb = { trolley: 0, hoist: 0 };
    this.held && this.held.clear();
  }

  // escreve st.input a cada quadro
  apply(st, P, dt) {
    // teclado: a deflexão cresce enquanto a tecla está apertada (degrau a degrau)
    let td = 0, hd = 0;
    for (const c of this.held || []) { const [a, s] = this.map[c]; if (a === 't') td += s; else hd += s; }
    const ramp = (cur, dir) => (dir === 0 ? 0 : Math.sign(cur) !== dir && cur !== 0 ? 0 : clamp(cur + dir * 0.9 * dt, -1, 1));
    this.kb.trolley = td ? ramp(this.kb.trolley || td * 0.2, td) : 0;
    this.kb.hoist = hd ? ramp(this.kb.hoist || hd * 0.2, hd) : 0;

    // controle de videogame
    let gpT = 0, gpH = 0;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of gps || []) {
      if (!g) continue;
      if (Math.abs(g.axes[0]) > 0.12) gpT = g.axes[0];
      if (g.axes.length > 3 && Math.abs(g.axes[3]) > 0.12) gpH = -g.axes[3];
    }

    let inp;
    if (this.script) {
      inp = { trolley: this.script.trolley || 0, hoist: this.script.hoist || 0, horn: !!this.script.horn };
      const a = this.auto;
      if (a) {
        if (a.r != null && !this.script.trolley) {
          const e = a.r - st.tr.r;
          inp.trolley = Math.abs(e) < 0.12 ? 0 : clamp(e / (a.rk || 5), -(a.tmax || 1), a.tmax || 1);
        }
        if (a.catch) {
          const l = st.load != null && !st.loads[st.load].resting ? st.loads[st.load] : null;
          const lx = l ? l.x : st.hook.x;
          const e = lx - st.tr.r + (a.r != null ? 0 : 0);
          inp.trolley = Math.abs(e) < 0.04 ? 0 : clamp(e * 0.55, -1, 1);
        }
        if (a.h != null && !this.script.hoist) {
          const e = a.h - st.hook.y;
          inp.hoist = Math.abs(e) < 0.1 ? 0 : clamp(e / (a.hk || 4), -(a.hmax || 1), a.hmax || 1);
        }
      }
    } else {
      const pick = (...v) => v.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
      inp = {
        trolley: pick(this.user.trolley, this.kb.trolley, gpT),
        hoist: pick(this.user.hoist, this.kb.hoist, gpH),
        horn: this.user.horn || !!this.user.hornKey,
      };
    }
    Object.assign(st.input, inp);
  }

  // atualiza a interface (knobs, rótulos, botões)
  render(st) {
    const tk = this.e.joyT.querySelector('.knob'), hk = this.e.joyH.querySelector('.knob');
    const padT = this.e.joyT.querySelector('.pad'), padH = this.e.joyH.querySelector('.pad');
    const tw = (padT.offsetWidth - tk.offsetWidth) / 2, hh = (padH.offsetHeight - hk.offsetHeight) / 2;
    tk.style.transform = `translateX(${(st.input.trolley * tw).toFixed(1)}px)`;
    hk.style.transform = `translateY(${(-st.input.hoist * hh).toFixed(1)}px)`;
    const gear = (g, inp, pos, neg) => {
      if (Math.abs(inp) >= THR[0] && g === 0) return 'bloqueado';
      if (g === 0) return 'parado';
      return `${g > 0 ? pos : neg} · ${Math.abs(g)}ª`;
    };
    const gt = gear(st.tr.gear, st.input.trolley, 'fora', 'dentro');
    const gh = gear(st.ho.gear, st.input.hoist, 'sobe', 'desce');
    const et = this.e.joyT.querySelector('.g'), eh = this.e.joyH.querySelector('.g');
    if (et.textContent !== gt) et.textContent = gt;
    if (eh.textContent !== gh) eh.textContent = gh;
    this.e.power.classList.toggle('on', st.power && !st.estop);
    this.e.estop.classList.toggle('on', st.estop);
    this.e.horn.classList.toggle('on', !!st.input.horn);

    // botão de engate
    const b = this.e.hook;
    let label, cls = '', msg;
    if (st.load != null) {
      const l = st.loads[st.load];
      if (st.can.release) { label = 'Soltar carga'; cls = 'rel'; msg = `${l.name} apoiada. Pode soltar.`; }
      else { label = 'Carga presa'; msg = l.resting ? 'Desça mais um pouco para afrouxar as lingas.' : `${l.name} no gancho.`; }
    } else if (st.can.attach >= 0) {
      const l = st.loads[st.can.attach];
      label = 'Engatar carga'; cls = 'ready'; msg = `${l.name} · ${String(l.mass).replace('.', ',')} t`;
    } else {
      label = 'Engatar carga';
      msg = st.power ? 'Desça o gancho logo acima de uma carga.' : 'Ligue a energia para operar.';
    }
    if (b.textContent !== label) b.textContent = label;
    b.className = 'hookbtn ' + cls;
    if (this.e.msg.textContent !== msg) this.e.msg.textContent = msg;
  }
}

export { THR, DRIVE };
