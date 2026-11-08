// Som sintetizado da grua (Web Audio), ligado à física.
// Contínuos: zumbido dos motores e do inversor, redutores, cabos e polias, rodas do carrinho, vento,
// transformador, alarmes e buzina. Eventos: freios, contatores, pouso da carga, engate, rangidos da estrutura.
// O tempo vem de `clock()` quando injetado (gravação offline), senão de ctx.currentTime.

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.75;
    this.clock = null;
    this.seed = 1234567;
    this.prev = null;
    this.creakCool = 0;
  }

  rand() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  get ready() { return !!this.ctx; }
  now() { return this.clock ? this.clock() : this.ctx.currentTime; }

  start(ctx) {
    if (this.ctx) return;
    this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    this.build();
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---------- blocos ----------
  buf(kind) {
    const c = this.ctx, n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = this.rand() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  src(b) { const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; s.start(0); return s; }
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(0); return o; }
  gain(v = 0) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filt(type, f, Q = 0.7) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = Q; return x; }
  chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  set(p, v, tau = 0.04) { p.setTargetAtTime(v, this.now(), tau); }

  build() {
    const c = this.ctx;
    this.white = this.buf('white');
    this.brown = this.buf('brown');
    this.master = this.gain(this.enabled ? this.volume : 0);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    // limitador no fim: estalos curtos passam pelo compressor antes de ele reagir
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
    this.chain(this.master, comp, lim, c.destination);
    this.bus = this.gain(2.3);
    this.bus.connect(this.master);
    this.fx = this.gain(0.6);   // eventos curtos (freios, engate, pouso) mais baixos que os contínuos
    this.fx.connect(this.bus);

    // ambiente da obra (trânsito distante)
    this.amb = this.gain(0.018);
    this.chain(this.src(this.brown), this.filt('lowpass', 260), this.amb, this.bus);

    // transformador e ventilação do painel elétrico (grua energizada)
    this.hum = this.gain(0);
    const hb = this.gain(1);
    for (const [f, a] of [[100, 1], [200, 0.45], [300, 0.25], [400, 0.12]]) {
      const g = this.gain(a);
      this.chain(this.osc('sine', f), g, hb);
    }
    this.chain(hb, this.filt('lowpass', 700), this.hum, this.bus);
    this.fan = this.gain(0);
    this.chain(this.src(this.white), this.filt('bandpass', 1100, 0.8), this.fan, this.bus);

    this.mH = this.motor({ slots: 28, carrier: 2500, gear: 9.5, mag: 1, vol: 1.0, mech: 260 });
    this.mT = this.motor({ slots: 36, carrier: 4000, gear: 11.5, mag: 0.6, vol: 0.55, mech: 420 });

    // cabos e polias
    this.rope = this.gain(0);
    this.chain(this.src(this.white), this.filt('bandpass', 2300, 1.4), this.rope, this.bus);
    this.sheave = this.gain(0);
    this.sheaveO = this.osc('sine', 1650);
    this.chain(this.sheaveO, this.sheave, this.bus);
    // rodas do carrinho
    this.wheels = this.gain(0);
    this.chain(this.src(this.brown), this.filt('bandpass', 170, 1.2), this.wheels, this.bus);

    // vento: rumor grave + assobio na treliça
    this.wind = this.gain(0);
    this.windF = this.filt('lowpass', 400, 0.6);
    this.chain(this.src(this.brown), this.windF, this.wind, this.bus);
    this.whistle = this.gain(0);
    this.whistleF = this.filt('bandpass', 800, 22);
    this.chain(this.src(this.white), this.whistleF, this.whistle, this.bus);

    // freio patinando
    this.slip = this.gain(0);
    this.chain(this.src(this.white), this.filt('bandpass', 950, 3), this.slip, this.bus);

    // alarme (bipe) e buzina
    this.alarm = this.gain(0);
    this.alarmO = this.osc('square', 2400);
    this.chain(this.alarmO, this.filt('bandpass', 2600, 2), this.alarm, this.bus);
    this.horn = this.gain(0);
    const hm = this.gain(1);
    this.chain(this.osc('sawtooth', 415), hm);
    this.chain(this.osc('sawtooth', 523), hm);
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.5 * x); }
    shaper.curve = curve;
    this.chain(hm, shaper, this.filt('lowpass', 2200, 1), this.horn, this.bus);
  }

  // Motor de indução com inversor: zumbido magnético (2·f), harmônico de ranhura (sobe com a rotação),
  // assobio da portadora PWM (modulado), engrenamento do redutor e ruído mecânico.
  motor(o) {
    const m = { o };
    m.out = this.gain(0);
    this.chain(m.out, this.bus);
    m.magO = this.osc('sawtooth', 50);
    m.mag = this.gain(0);
    this.chain(m.magO, this.filt('lowpass', 900, 0.9), m.mag, m.out);
    m.slotO = this.osc('sine', 600);
    m.slot = this.gain(0);
    this.chain(m.slotO, m.slot, m.out);
    m.slot2O = this.osc('sine', 900);
    m.slot2 = this.gain(0);
    this.chain(m.slot2O, m.slot2, m.out);
    m.carO = this.osc('sine', o.carrier);
    m.carMod = this.osc('sine', 100);
    m.carDepth = this.gain(0);
    this.chain(m.carMod, m.carDepth);
    m.carDepth.connect(m.carO.frequency);
    m.car = this.gain(0);
    this.chain(m.carO, m.car, m.out);
    m.gearO = this.osc('triangle', 300);
    m.gear = this.gain(0);
    this.chain(m.gearO, this.filt('bandpass', 600, 1.2), m.gear, m.out);
    m.mechF = this.filt('lowpass', o.mech, 0.8);
    m.mech = this.gain(0);
    this.chain(this.src(this.brown), m.mechF, m.mech, m.out);
    return m;
  }

  setMotor(m, hz, amps, ampsRated) {
    const o = m.o;
    const run = amps > 0 ? 1 : 0;
    const load = Math.min(1.4, amps / ampsRated);
    const sp = Math.min(1, hz / 87);
    const f = Math.max(2, hz);
    this.set(m.out.gain, o.vol * run, 0.03);
    this.set(m.magO.frequency, 2 * f, 0.03);
    this.set(m.mag.gain, 0.05 * o.mag * (0.35 + 0.65 * load) * (0.4 + 0.6 * sp), 0.04);
    this.set(m.slotO.frequency, f * o.slots, 0.03);
    this.set(m.slot.gain, 0.022 * sp * (0.5 + 0.5 * load), 0.04);
    this.set(m.slot2O.frequency, f * o.slots * 1.5, 0.03);
    this.set(m.slot2.gain, 0.008 * sp, 0.04);
    this.set(m.carMod.frequency, 2 * f, 0.03);
    this.set(m.carDepth.gain, 40 + 160 * sp, 0.05);
    this.set(m.car.gain, 0.012 * (0.4 + 0.8 * load) * (1.1 - 0.6 * sp), 0.05);
    this.set(m.gearO.frequency, f * o.gear, 0.03);
    this.set(m.gear.gain, 0.03 * sp * (0.4 + 0.6 * load), 0.05);
    this.set(m.mech.gain, 0.12 * sp * (0.5 + 0.5 * load), 0.05);
    this.set(m.mechF.frequency, o.mech * (0.6 + 0.8 * sp), 0.05);
  }

  // ---------- eventos curtos ----------
  burst(t, { f = 2000, Q = 2, dur = 0.05, a = 0.2, type = 'bandpass' } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.white;
    const g = this.gain(0);
    this.chain(s, this.filt(type, f, Q), g, this.fx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, this.rand() * 2);
    s.stop(t + dur + 0.05);
  }
  tone(t, { f = 100, f1 = null, dur = 0.15, a = 0.2, type = 'sine', fx = true } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.gain(0);
    this.chain(o, g, fx ? this.fx : this.bus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  clack(t, k = 1) {   // solenoide do freio / contator
    this.burst(t, { f: 2600, Q: 1.5, dur: 0.035, a: 0.25 * k });
    this.tone(t, { f: 140, f1: 70, dur: 0.09, a: 0.22 * k });
  }
  click(t, k = 1) { this.burst(t, { f: 4200, Q: 2, dur: 0.018, a: 0.15 * k }); }
  ping(t, f, a = 0.06, dur = 0.5) { this.tone(t, { f, dur, a, type: 'sine' }); this.tone(t, { f: f * 2.76, dur: dur * 0.5, a: a * 0.4 }); }
  jingle(t, n = 5, a = 0.05) {
    for (let i = 0; i < n; i++) this.ping(t + this.rand() * 0.35, 2600 + this.rand() * 2400, a * (0.5 + this.rand() * 0.5), 0.18);
  }
  thud(t, k) {
    this.tone(t, { f: 75, f1: 38, dur: 0.35, a: 0.5 * k });
    this.burst(t, { f: 380, Q: 0.7, dur: 0.18, a: 0.35 * k, type: 'lowpass' });
  }
  clang(t, k) {
    for (const f of [430, 1170, 2210]) this.ping(t, f * (0.97 + this.rand() * 0.06), 0.08 * k, 0.9);
    this.burst(t, { f: 1500, Q: 1, dur: 0.06, a: 0.2 * k });
  }
  creak(t, k) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = 55 + this.rand() * 40;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (0.7 + this.rand() * 0.2), t + 0.5);
    const g = this.gain(0);
    this.chain(o, this.filt('bandpass', 380 + this.rand() * 300, 9), g, this.fx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * k, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.start(t); o.stop(t + 0.7);
    if (this.rand() < 0.5) this.ping(t + 0.2, 700 + this.rand() * 500, 0.03 * k, 0.6);
  }

  // ---------- por quadro ----------
  update(st, P, dt) {
    if (!this.ctx) { st.ev.length = 0; return; }
    const t = this.now();
    this.set(this.master.gain, this.enabled ? this.volume : 0, 0.05);
    const p = this.prev || { power: false, estop: false, rSeg: Math.floor(st.tr.r / 6), M: st.s.M, horn: false };
    const powered = st.power && !st.estop;

    this.set(this.hum.gain, powered ? 0.012 : 0, 0.15);
    this.set(this.fan.gain, powered ? 0.006 : 0, 0.4);

    const falls = P.falls === 4 ? 4 : 2;
    this.setMotor(this.mH, st.ho.hz, st.ho.amps, 80);
    this.setMotor(this.mT, st.tr.hz, st.tr.amps, 14);

    const ropeV = Math.abs(st.ho.v * falls);
    this.set(this.rope.gain, Math.min(0.05, 0.016 * ropeV + 0.02 * Math.abs(st.tr.v)), 0.05);
    const sq = 0.5 + 0.5 * Math.sin(st.t * 2.3) * Math.sin(st.t * 0.7);
    this.set(this.sheave.gain, ropeV > 0.3 ? 0.004 * sq * Math.min(1, ropeV / 2) : 0, 0.08);
    this.set(this.sheaveO.frequency, 1500 + 400 * Math.sin(st.t * 0.9), 0.1);
    this.set(this.wheels.gain, Math.min(0.12, 0.13 * Math.abs(st.tr.v)), 0.05);

    const w = st.wind.v;
    const wk = Math.min(1.6, w / 72);
    this.set(this.wind.gain, 0.015 + 0.13 * wk * wk, 0.15);
    this.set(this.windF.frequency, 220 + w * 9, 0.2);
    this.set(this.whistle.gain, 0.035 * Math.max(0, wk - 0.25) ** 2, 0.2);
    this.set(this.whistleF.frequency, 650 + w * 7, 0.2);

    this.set(this.slip.gain, st.ho.slipping ? 0.12 : 0, 0.02);

    // alarmes: corte (bipe longo), pré-alarme (bipe curto), vento (tom grave)
    const L = st.lim;
    let al = 0, af = 2400;
    if (L.cut || L.danger) { al = st.t % 0.7 < 0.5 ? 1 : 0; af = 2900; }
    else if (L.pre) { al = st.t % 0.5 < 0.15 ? 1 : 0; af = 2400; }
    else if (L.windStop) { al = st.t % 0.8 < 0.4 ? 1 : 0; af = 1300; }
    else if (L.windPre) { al = st.t % 1.6 < 0.15 ? 1 : 0; af = 1300; }
    if (!st.power) al = 0;
    this.set(this.alarm.gain, al * 0.11, 0.006);
    this.set(this.alarmO.frequency, af, 0.005);
    this.set(this.horn.gain, st.input.horn && st.power ? 0.13 : 0, 0.02);

    // eventos por mudança de estado
    if (st.power !== p.power) { this.clack(t, 1.3); if (st.power) { this.tone(t + 0.25, { f: 2400, dur: 0.12, a: 0.06, type: 'square' }); this.tone(t + 0.45, { f: 2400, dur: 0.12, a: 0.06, type: 'square' }); } }
    if (st.estop && !p.estop) { this.clack(t, 1.0); this.thud(t + 0.02, 0.3); }
    const seg = Math.floor(st.tr.r / 6);
    if (seg !== p.rSeg && Math.abs(st.tr.v) > 0.05) { this.burst(t, { f: 900, Q: 2, dur: 0.05, a: 0.06 }); this.tone(t, { f: 120, f1: 80, dur: 0.06, a: 0.06 }); }
    for (const e of st.ev) {
      if (e.type === 'hoBrakeOff') { this.clack(t, 0.9); this.click(t + 0.015); }
      else if (e.type === 'hoBrakeOn') this.clack(t, 1.0 + Math.min(0.6, (e.mt || 0) / 8));
      else if (e.type === 'trBrakeOff') this.clack(t, 0.45);
      else if (e.type === 'trBrakeOn') this.clack(t, 0.5);
      else if (e.type === 'land') { const k = Math.min(1.2, 0.25 + e.v * 0.8) * Math.min(1.3, 0.5 + e.mass / 4); this.thud(t, k); this.clang(t + 0.01, k * 0.6); this.jingle(t + 0.05, 4, 0.04); }
      else if (e.type === 'lift') { this.jingle(t, 6, 0.05); this.creak(t + 0.05, Math.min(1, e.mass / 5)); }
      else if (e.type === 'attach' || e.type === 'detach') { this.clang(t, 0.5); this.jingle(t + 0.03, 5, 0.05); }
      else if (e.type === 'bump') this.clang(t, Math.min(1.2, 0.3 + e.v));
    }
    st.ev.length = 0;

    // rangidos da estrutura quando o momento muda rápido (ou com vento forte)
    this.creakCool -= dt;
    const dM = dt > 0 ? Math.abs(st.s.M - p.M) / dt : 0;
    if (this.creakCool <= 0 && (dM > 6 || w > 55) && this.rand() < dt * (dM > 6 ? 1.5 : 0.25 * (w / 72))) {
      this.creak(t, Math.min(1, 0.4 + dM / 30));
      this.creakCool = 1.2;
    }

    this.prev = { power: st.power, estop: st.estop, rSeg: seg, M: st.s.M, horn: st.input.horn };
  }

  resetFx() { this.prev = null; this.creakCool = 0; }
}
