import { DEFAULTS, SITE_LINK } from './config.js';
import { createState, step, attach, release } from './sim/simulation.js';
import { Scene } from './render/scene.js';
import { Panel } from './render/panel.js';
import { Controls } from './ui/controls.js';
import { Info } from './ui/info.js';
import { Params } from './ui/params.js';
import { Sound } from './audio/sound.js';
import { Presentation } from './present/presentation.js';
import { SCENES } from './present/scenes.js';

const qs = new URLSearchParams(location.search);
const VIDEO = qs.has('video') || window.__VIDEO_MODE === true;
const PHYS_DT = 1 / 240;
const clone = (o) => JSON.parse(JSON.stringify(o));
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ICON = {
  layers: '<svg viewBox="0 0 24 24"><path d="M12 3 2 8l10 5 10-5z"/><path d="m2 13 10 5 10-5"/></svg>',
  snd: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M10.3 2h3.4l.5 2.6 2 .9 2.2-1.5 2.4 2.4-1.5 2.2.9 2 2.6.5v3.4l-2.6.5-.9 2 1.5 2.2-2.4 2.4-2.2-1.5-2 .9-.5 2.6h-3.4l-.5-2.6-2-.9-2.2 1.5-2.4-2.4 1.5-2.2-.9-2L2 13.7v-3.4l2.6-.5.9-2L4 5.6 6.4 3.2l2.2 1.5 2-.9z" fill="currentColor" fill-rule="evenodd"/><circle cx="12" cy="12" r="3.2" fill="#141f2b"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
};

class App {
  constructor() {
    this.video = VIDEO;
    this.stage = document.getElementById('stage');
    this.siteLink = SITE_LINK;
    if (VIDEO) this.stage.classList.add('video');
    const fq = qs.get('fmt') || window.__VIDEO_FMT;
    this.forcedFmt = fq === '916' ? 'f916' : fq === '169' ? 'f169' : null;
    this.P = { ...clone(DEFAULTS) };
    this.st = createState(this.P, { r: 8, h: 30 });
    this.acc = 0;

    this.buildTopbar();
    this.scene = new Scene(document.getElementById('scene'), document.getElementById('overlay'));
    this.panel = new Panel(document.getElementById('panel'));
    this.controls = new Controls(document.getElementById('controls'), this);
    this.info = new Info(document.getElementById('info'), document.getElementById('infoCard'));
    this.params = new Params(document.getElementById('drawer'), this);
    this.sound = new Sound();
    this.pres = new Presentation(this, SCENES);

    // modo vídeo: sorteios com semente fixa por cena (mesma cena = mesmos quadros)
    this.onSceneStart = (i) => { if (VIDEO) Math.random = mulberry32(1000 + i); };

    this.scene.onPick = (id) => { this.info.show(id, this.st, this.P); this.scene.setSel(id); };
    document.getElementById('scene').addEventListener('click', (e) => {
      if (!e.target.closest('[data-comp]')) { this.info.show(null, this.st, this.P); this.scene.setSel(null); }
    });
    document.getElementById('infoCard').addEventListener('click', (e) => { if (e.target.closest('.x')) this.scene.setSel(null); });

    this.layout(true);
    this.scene.setCam(this.scene.defaultCam(), true);
    this.info.show(null, this.st, this.P);
    this.params.sync();
    window.addEventListener('resize', () => this.layout());

    // o som só liga depois de um gesto (regra dos navegadores)
    if (!VIDEO) {
      const gate = document.getElementById('audioGate');
      gate.classList.add('show');
      const unlock = () => {
        this.sound.start();
        this.sound.resume();
        gate.classList.remove('show');
      };
      window.addEventListener('pointerdown', unlock, { once: false, capture: true });
      window.addEventListener('keydown', unlock, { once: false, capture: true });
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !this.pres.active && e.target.tagName !== 'INPUT') {
          this.forcedFmt = this.fmt === 'f916' ? 'f169' : 'f916';
          this.layout();
        }
      });
      if (qs.has('pres')) this.pres.start(+qs.get('pres') || 0);
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.tick(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  buildTopbar() {
    const tb = document.getElementById('topbar');
    tb.innerHTML = `
      <div class="brand"><b>Grua de <em>torre</em></b><span>simulador · vista lateral em corte</span></div>
      <div class="layers" id="layers"><label>Camadas</label>
        <button class="tg on" data-show="ropes">Cabos</button>
        <button class="tg on" data-show="forces">Esforços</button>
        <button class="tg on" data-show="labels">Nomes</button>
        <button class="tg on" data-show="values">Valores</button>
      </div>
      <div class="sp"></div>
      <button class="ic" id="btnLayers" aria-label="Camadas">${ICON.layers}</button>
      <div class="sound" data-spot="sound"><button class="ic" id="btnSound" aria-label="Som">${ICON.snd}</button><input type="range" id="vol" min="0" max="1" step="0.01" value="0.75"></div>
      <button class="btn" id="btnParams" data-spot="params">${ICON.gear}Parâmetros</button>
      <button class="btn pri" id="btnPres" data-spot="presbtn">${ICON.play}Apresentação</button>`;
    const $ = (s) => tb.querySelector(s);
    tb.querySelectorAll('.tg').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.show;
      this.setLayers({ [k]: !this.scene.layers[k] });
    }));
    $('#btnLayers').addEventListener('click', () => $('#layers').classList.toggle('open'));
    $('#btnSound').addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      $('#btnSound').innerHTML = this.sound.enabled ? ICON.snd : ICON.mute;
      $('#btnSound').classList.toggle('off', !this.sound.enabled);
    });
    $('#vol').addEventListener('input', (e) => (this.sound.volume = +e.target.value));
    $('#btnParams').addEventListener('click', () => this.showDrawer(!document.getElementById('drawer').classList.contains('open')));
    $('#btnPres').addEventListener('click', () => this.pres.start(0));
  }

  // ---------- formato e escala ----------
  layout(first = false) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const fmt = this.forcedFmt || (vh > vw * 1.05 ? 'f916' : 'f169');
    const changed = fmt !== this.fmt;
    this.fmt = fmt;
    this.stage.classList.toggle('f169', fmt === 'f169');
    this.stage.classList.toggle('f916', fmt === 'f916');
    const W = fmt === 'f916' ? 1080 : 1920, H = fmt === 'f916' ? 1920 : 1080;
    const k = Math.min(vw / W, vh / H);
    this.k = k;
    this.stage.style.transform = `translate(${((vw - W * k) / 2).toFixed(1)}px, ${((vh - H * k) / 2).toFixed(1)}px) scale(${k})`;
    const sw = document.getElementById('sceneWrap');
    const clean = this.stage.classList.contains('clean');
    const rw = clean ? W : fmt === 'f916' ? 1080 : 1400;
    const rh = clean ? H : fmt === 'f916' ? 900 : 784;
    this.scene.setFormat(fmt, rw, rh);
    if ((changed && !first) && !this.pres.active) this.scene.setCam(this.scene.defaultCam(), true);
    if (changed && this.pres.active && !first) this.pres.go(this.pres.i);
    void sw;
  }

  setLayers(o) {
    this.scene.setLayers(o);
    document.querySelectorAll('#topbar .tg').forEach((b) => b.classList.toggle('on', !!this.scene.layers[b.dataset.show]));
  }

  showDrawer(on) {
    document.getElementById('drawer').classList.toggle('open', on);
    if (on) this.params.sync();
  }

  // ---------- ações do operador ----------
  power(on) {
    if (this.st.estop && on) return;
    this.st.power = on;
  }
  estop(on) {
    this.st.estop = on;
    if (on) this.st.power = false;
  }
  hookAction() {
    if (this.st.can.release) release(this.st, this.P);
    else attach(this.st, this.P);
    this.params.sync();
  }
  gust() { this.st.wind.gust = 5; }

  reset(prep = {}, params = null, pres = false) {
    if (pres) {
      if (!this.userP) this.userP = clone(this.P);
      this.P = { ...clone(DEFAULTS), wind: 6, ...(params || {}) };
      this.P.masses = { ...(params && params.masses) };
    } else if (this.userP) {
      this.P = this.userP;
      this.userP = null;
    }
    this.st = createState(this.P, pres ? prep : { r: 8, h: 30, power: this.st ? this.st.power : false, ...prep });
    this.acc = 0;
    this.params.sync();
  }
  defaults() {
    this.P = clone(DEFAULTS);
    this.reset();
  }

  resetFx() {
    this.scene.resetFx();
    this.panel.resetFx();
    this.controls.resetFx();
    this.sound.resetFx();
    this.acc = 0;
  }

  // ---------- um quadro ----------
  tick(dt, scriptDt = dt) {
    if (this.pres.active) this.pres.update(scriptDt);
    this.controls.apply(this.st, this.P, dt);
    const pdt = dt * (this.pres.active && this.pres.speed ? this.pres.speed : 1);
    if (VIDEO) {
      const n = Math.round(pdt / PHYS_DT);
      for (let i = 0; i < n; i++) step(this.st, this.P, PHYS_DT);
    } else {
      this.acc += pdt;
      while (this.acc >= PHYS_DT) { step(this.st, this.P, PHYS_DT); this.acc -= PHYS_DT; }
    }
    this.scene.update(this.st, this.P, dt);
    this.panel.update(this.st, this.P, dt);
    this.controls.render(this.st);
    this.info.render(this.st, this.P);
    this.sound.update(this.st, this.P, dt);
    if (!this.pres.active && this.stParamsSync !== (this.st.load != null)) { this.stParamsSync = this.st.load != null; this.params.sync(); }
  }
}

const app = new App();
window.app = app;
window.sim = {
  get st() { return app.st; },
  get params() { return app.P; },
  scene: app.scene, panel: app.panel, controls: app.controls, sound: app.sound, pres: app.pres,
  reset: (...a) => app.reset(...a),
  tick: (dt, sdt) => app.tick(dt, sdt),
  resetFx: () => app.resetFx(),
  video: VIDEO,
  get fmt() { return app.fmt; },
  setFormat: (f) => { app.forcedFmt = f === '916' || f === 'f916' ? 'f916' : 'f169'; app.layout(); },
};
