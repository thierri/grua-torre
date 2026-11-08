// Motor do modo apresentação: cenas como dados (câmera, holofote, destaque, legenda, comandos, eventos).
// Funciona nos dois formatos: qualquer chave com sufixo 916 (cam916, spots916, capPos916…) vale no 9:16.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lastAt = (list, t) => { let v; if (list) for (const [ti, x] of list) if (ti <= t) v = x; return v; };

export class Presentation {
  constructor(app, scenes) {
    this.app = app;
    this.scenes = scenes;
    this.active = false;
    this.i = 0;
    this.t = 0;
    this.auto = false;
    this.paused = false;
    this.ui = 'full';
    this.e = {
      cap: document.getElementById('caption'), spot: document.getElementById('spot'), link: document.getElementById('linkBadge'),
      hint: document.getElementById('presHint'), bar: document.getElementById('presBar'), speed: document.getElementById('speedBadge'),
    };
    this.hintT = 0;
    this.keys();
  }

  get sc() { return this.scenes[this.i]; }
  opt(k) { const s = this.sc; return this.app.fmt === 'f916' && s[k + '916'] !== undefined ? s[k + '916'] : s[k]; }

  start(i = 0) {
    this.active = true;
    this.app.stage.classList.add('pres');
    this.app.showDrawer(false);
    this.go(i);
    this.showHint();
  }

  stop() {
    this.active = false;
    const a = this.app;
    a.stage.classList.remove('pres', 'clean');
    a.controls.script = null;
    a.controls.auto = null;
    for (const k of ['cap', 'spot', 'link', 'hint', 'bar', 'speed']) this.e[k].classList.remove('show');
    this.speed = 1;
    a.scene.setFocus(null);
    a.scene.setInsets(['winch', 'legend']);
    a.scene.placeInsets(null);
    a.setLayers({ ropes: true, forces: true, labels: true, values: true });
    a.reset();
    a.scene.setCam(a.scene.defaultCam(), true);
    a.layout();
  }

  go(i) {
    this.i = clamp(i, 0, this.scenes.length - 1);
    const sc = this.sc, a = this.app;
    this.t = 0;
    this.fired = new Set();
    this.lastNote = null;
    this.lastSpot = undefined;
    this.speed = null;
    this.spotRect = null;
    if (a.onSceneStart) a.onSceneStart(this.i);
    a.reset(sc.prep || {}, sc.prep && sc.prep.params, true);
    a.controls.script = {};
    a.controls.auto = null;
    this.ui = sc.ui || 'full';
    a.stage.classList.toggle('clean', this.ui === 'clean');
    a.layout();
    a.setLayers({ ropes: true, forces: true, labels: true, values: true, ...(sc.layers || {}) });
    a.scene.setInsets(this.opt('insets') || []);
    a.scene.placeInsets(this.opt('insetPos') || null);
    a.showDrawer(false);
    a.info.show(null, a.st, a.P);
    this.applyCam(true);
    a.scene.setFocus(this.opt('focus') || null);
    this.caption(sc.title, sc.text, true);
    this.update(0);
    a.resetFx();
  }

  caption(title, text, force) {
    const c = this.e.cap;
    const pos = this.opt('capPos') || (this.ui === 'clean' ? 'left' : 'info');
    // vídeo em pé: sem legenda (não há espaço livre; ela cobriria os comandos ou a grua). A narração diz o mesmo.
    c.className = this.app.video && this.app.fmt === 'f916' ? 'p-' + pos : 'show p-' + pos;
    if (force || title !== undefined) c.querySelector('.ct').textContent = title ?? this.sc.title;
    c.querySelector('.cx').innerHTML = text || '';
    if (!this.app.video) { void c.offsetWidth; c.classList.add('fade'); }
  }

  camAt(t) {
    const a = this.app;
    let c = lastAt(this.opt('cams'), t) ?? this.opt('cam');
    if (typeof c === 'function') c = c(a.st, a.fmt);
    if (!c || c === 'default') c = a.scene.defaultCam();
    if (a.fmt === 'f916' && !this.sc.cam916 && !this.sc.cams916 && c.w916) c = { ...c, w: c.w916 };
    return c;
  }
  applyCam(now) { this.app.scene.setCam(this.camAt(this.t), now); }

  // avança o roteiro (dt = tempo do roteiro; 0 durante a espera do vídeo)
  update(dt) {
    if (!this.active) return;
    const sc = this.sc, a = this.app;
    const t0 = this.t;
    if (!this.paused) this.t += dt;
    const t = this.t;

    // comandos: rampas de 0,3 s, como a mão do operador
    const cmd = {};
    for (const [s0, dur, c] of sc.moves || []) {
      const k = clamp((t - s0) / 0.3, 0, 1) * clamp((s0 + dur - t) / 0.3, 0, 1);
      if (k <= 0) continue;
      for (const key in c) {
        if (typeof c[key] === 'boolean') cmd[key] = cmd[key] || c[key];
        else cmd[key] = (cmd[key] || 0) + c[key] * k;
      }
    }
    if (this.hold && dt === 0) Object.assign(cmd, this.hold);
    a.controls.script = cmd;
    const au = lastAt(sc.auto, t);
    a.controls.auto = au || null;

    for (let k = 0; k < (sc.events || []).length; k++) {
      const [te, fn] = sc.events[k];
      if (te <= t && !this.fired.has(k)) { this.fired.add(k); fn(a.st, a.P, a); }
    }

    const note = lastAt(this.opt('notes'), t);
    if (note !== undefined && note !== this.lastNote) { this.lastNote = note; this.caption(undefined, note); }
    else if (note === undefined && this.lastNote !== null && this.lastNote !== undefined) { this.lastNote = null; }

    const f = lastAt(this.opt('focuses'), t);
    if (f !== undefined && f !== this.lastFocus) { this.lastFocus = f; a.scene.setFocus(f); }

    if (this.opt('cams') || typeof this.opt('cam') === 'function') this.applyCam(false);

    // holofote
    const sp = lastAt(this.opt('spots'), t);
    this.spot(sp ?? null, dt);

    // física acelerada (vídeo de obra em 2×), com selo na tela
    const k = lastAt(sc.speed, t) || 1;
    if (k !== this.speed) { this.speed = k; this.e.speed.textContent = `▶▶ ${k}×`; this.e.speed.classList.toggle('show', k !== 1); }

    // selo do link
    const L = sc.link;
    this.e.link.classList.toggle('show', !!L && t >= L[0] && t <= L[1]);
    if (L) this.e.link.innerHTML = `<small>Experimente você mesmo</small>${a.siteLink}`;

    // barra e dica
    this.e.bar.querySelector('i').style.width = `${clamp(t / sc.duration, 0, 1) * 100}%`;
    if (!a.video) {
      this.hintT -= dt;
      this.e.hint.classList.toggle('show', this.hintT > 0);
      this.e.bar.classList.toggle('show', this.hintT > 0);
    }
    if (this.auto && t >= sc.duration && t0 < sc.duration && this.i < this.scenes.length - 1) this.go(this.i + 1);
  }

  rectOf(target) {
    const a = this.app, k = a.k;
    const sr = a.stage.getBoundingClientRect();
    const fromEl = (e, pad = 8) => {
      const r = e.getBoundingClientRect();
      return [(r.left - sr.left) / k - pad, (r.top - sr.top) / k - pad, r.width / k + 2 * pad, r.height / k + 2 * pad];
    };
    if (Array.isArray(target)) return target;
    if (typeof target === 'string') {
      const map = { scene: '#sceneWrap', panel: '#panel', controls: '#controls', topbar: '#topbar' };
      const e = a.stage.querySelector(map[target] || `[data-spot="${target}"]`) || a.stage.querySelector(target);
      return e ? fromEl(e, map[target] ? -4 : 8) : null;
    }
    if (target && target.sel) {
      const e = a.stage.querySelectorAll(target.sel)[target.i || 0];
      return e ? fromEl(e, target.pad ?? 8) : null;
    }
    return null;
  }

  spot(target, dt) {
    const s = this.e.spot;
    if (!target) { s.classList.remove('show'); this.spotRect = null; this.lastSpot = null; return; }
    const r = this.rectOf(target);
    if (!r) return;
    if (!this.spotRect || this.lastSpot === null || this.lastSpot === undefined) this.spotRect = r.slice();
    else {
      const k = dt > 0 ? 1 - Math.exp(-7 * dt) : 0;
      for (let i = 0; i < 4; i++) this.spotRect[i] += (r[i] - this.spotRect[i]) * k;
    }
    this.lastSpot = target;
    const [x, y, w, h] = this.spotRect;
    Object.assign(s.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    s.classList.add('show');
  }

  showHint() {
    if (this.app.video) return;
    const f916 = this.app.fmt === 'f916';
    this.e.hint.innerHTML = f916
      ? 'Toque à direita: próxima cena · à esquerda: anterior · segure 1 s: sair'
      : '<kbd>→</kbd> próxima <kbd>←</kbd> anterior <kbd>R</kbd> repetir <kbd>A</kbd> automático <kbd>H</kbd> painéis <kbd>P</kbd> pausa <kbd>Esc</kbd> sair';
    this.hintT = 3;
  }

  keys() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = e.code;
      if (['ArrowRight', 'Space', 'PageDown'].includes(k)) this.go(this.i + 1);
      else if (['ArrowLeft', 'PageUp'].includes(k)) this.go(this.i - 1);
      else if (k === 'KeyR') this.go(this.i);
      else if (k === 'KeyA') { this.auto = !this.auto; this.flash(this.auto ? 'Automático ligado' : 'Automático desligado'); }
      else if (k === 'KeyP') { this.paused = !this.paused; this.flash(this.paused ? 'Pausado' : 'Continuando'); }
      else if (k === 'KeyH') {
        this.ui = this.ui === 'clean' ? 'full' : 'clean';
        this.app.stage.classList.toggle('clean', this.ui === 'clean');
        this.app.layout();
        this.caption(undefined, this.e.cap.querySelector('.cx').innerHTML);
      } else if (k === 'Escape') this.stop();
      else if (/^Digit\d$/.test(k)) { const n = +k.slice(5); this.go(n === 0 ? 9 : n - 1); }
      else return;
      e.preventDefault();
    });
    // toque: direita avança, esquerda volta, segurar sai
    let down = 0, x = 0;
    const st = this.app.stage;
    st.addEventListener('pointerdown', (e) => { if (this.active) { down = performance.now(); x = e.clientX; } });
    st.addEventListener('pointerup', (e) => {
      if (!this.active || !down) return;
      const held = performance.now() - down;
      down = 0;
      if (e.pointerType === 'mouse') return;
      if (held > 900) { this.stop(); return; }
      const r = st.getBoundingClientRect();
      if (x > r.left + r.width / 3) this.go(this.i + 1); else this.go(this.i - 1);
    });
  }

  flash(s) {
    if (this.app.video) return;
    this.e.hint.textContent = s;
    this.hintT = 1.5;
  }
}
