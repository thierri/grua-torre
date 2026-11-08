// Gaveta de parâmetros e falhas.
import { LOADS } from '../config.js';
import { fmt } from '../render/svg.js';

export class Params {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.loadSel = 'forma';
    root.innerHTML = `
      <h2>Parâmetros <button class="x" aria-label="Fechar">×</button></h2>
      <h4>Ambiente</h4>
      <div class="prow"><span>Vento médio</span><output id="pWindO"></output><input type="range" id="pWind" min="0" max="90" step="1">
        <small>Alerta a partir de 50 km/h. Acima de 72 km/h a grua para de subir e de levar o carrinho para fora.</small></div>
      <div class="prow"><span>Rajadas variáveis</span><button class="sw b" id="pGusts"></button></div>
      <div class="pbtns"><button class="btn" id="pGustNow">Soprar uma rajada forte</button></div>
      <h4>Grua</h4>
      <div class="prow"><span>Cabos no moitão</span><div class="seg" id="pFalls"><button data-v="2">2 cabos</button><button data-v="4">4 cabos</button></div>
        <small>Com 4 cabos a grua levanta o dobro (8 t), na metade da velocidade. Troque com o gancho vazio.</small></div>
      <div class="prow"><span>Contrapeso</span><output id="pCwO"></output><input type="range" id="pCw" min="8" max="26" step="0.1">
        <small>Veja o momento na base e os tirantes. Com pouco contrapeso a grua carregada força a torre para frente; com muito, a grua vazia força para trás.</small></div>
      <div class="prow"><span>Massa da carga</span><select id="pLoad"></select><output id="pMassO"></output><input type="range" id="pMass" min="0.2" max="12" step="0.1"></div>
      <h4>Falhas</h4>
      <div class="prow"><span>Limitador de momento desligado</span><button class="sw" id="pLim"></button>
        <small>Nunca se faz na vida real. Aqui a grua deixa passar do limite e mostra a estrutura sofrendo.</small></div>
      <div class="prow"><span>Freio gasto</span><button class="sw" id="pBrake"></button>
        <small>Ao parar com carga pesada, o freio patina e a carga escorrega um pouco antes de segurar.</small></div>
      <div class="pbtns"><button class="btn" id="pReset">Recomeçar</button><button class="btn" id="pDefaults">Valores padrão</button></div>`;
    const $ = (s) => root.querySelector(s);
    this.e = { wind: $('#pWind'), windO: $('#pWindO'), gusts: $('#pGusts'), falls: $('#pFalls'), cw: $('#pCw'), cwO: $('#pCwO'),
      lim: $('#pLim'), brake: $('#pBrake'), load: $('#pLoad'), mass: $('#pMass'), massO: $('#pMassO') };
    this.e.load.innerHTML = LOADS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
    this.e.load.value = this.loadSel;
    this.e.load.style.cssText = 'background:#0d151e;color:#e6edf3;border:1px solid #33465c;border-radius:6px;padding:4px;font:inherit';
    $('.x').addEventListener('click', () => app.showDrawer(false));
    this.e.wind.addEventListener('input', () => { app.P.wind = +this.e.wind.value; this.sync(); });
    this.e.gusts.addEventListener('click', () => { app.P.gusts = !app.P.gusts; this.sync(); });
    $('#pGustNow').addEventListener('click', () => app.gust());
    this.e.falls.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled) { app.P.falls = +b.dataset.v; this.sync(); }
    });
    this.e.cw.addEventListener('input', () => { app.P.counterweight = +this.e.cw.value; this.sync(); });
    this.e.lim.addEventListener('click', () => { app.P.limiter = !app.P.limiter; this.sync(); });
    this.e.brake.addEventListener('click', () => { app.P.brakeWorn = !app.P.brakeWorn; this.sync(); });
    this.e.load.addEventListener('change', () => { this.loadSel = this.e.load.value; this.sync(); });
    this.e.mass.addEventListener('input', () => {
      const m = +this.e.mass.value;
      app.P.masses[this.loadSel] = m;
      const l = app.st.loads.find((x) => x.id === this.loadSel);
      if (l) l.mass = m;
      this.sync();
    });
    $('#pReset').addEventListener('click', () => app.reset());
    $('#pDefaults').addEventListener('click', () => app.defaults());
  }

  sync() {
    const P = this.app.P, e = this.e;
    e.wind.value = P.wind; e.windO.textContent = `${P.wind} km/h`;
    e.gusts.classList.toggle('on', P.gusts);
    e.falls.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', +b.dataset.v === P.falls);
      b.disabled = this.app.st.load != null;
    });
    e.cw.value = P.counterweight; e.cwO.textContent = `${fmt(P.counterweight, 1)} t`;
    e.lim.classList.toggle('on', !P.limiter);
    e.brake.classList.toggle('on', P.brakeWorn);
    const l = this.app.st.loads.find((x) => x.id === this.loadSel);
    if (l) { e.mass.value = l.mass; e.massO.textContent = `${fmt(l.mass, 1)} t`; }
  }
}
