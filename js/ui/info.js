// Painel de informação: o que é cada peça (2 ou 3 frases, com um "porquê") e valores ao vivo.
import { fmt } from '../render/svg.js';

const T = {
  tower: ['Torre', 'Uma treliça de aço montada em módulos empilhados. Ela leva todo o peso para o chão e aguenta o momento que tenta dobrá-la. Os dois montantes mudam de cor: o do lado da carga é mais comprimido quando a grua está carregada.',
    (s) => `montante da frente ${fmt(s.s.Ff, 0)} t · de trás ${fmt(s.s.Fb, 0)} t`],
  foundation: ['Base de concreto', 'Um bloco de concreto armado com chumbadores. Ele não pode deixar a torre girar nem afundar: segura o peso e o momento na base, que muda de sentido conforme a carga.',
    (s) => `momento na base ${fmt(s.s.M, 0)} t·m · peso ${fmt(s.s.N, 0)} t`],
  turntable: ['Mesa giratória', 'Rolamento gigante que deixa a parte de cima girar sobre a torre. Neste simulador, que é uma vista lateral, o giro está travado.'],
  cab: ['Cabine', 'Onde o operador trabalha, a dezenas de metros do chão. Hoje muitas gruas também são operadas por uma botoeira de rádio, lá de baixo.'],
  head: ['Topo (torre de cabeça)', 'A ponta acima da torre. Ela serve de apoio para os tirantes, que penduram a lança e a contralança como uma balança.'],
  pendants: ['Tirantes', 'Barras de aço que penduram a lança e a contralança no topo. A cor mostra a força: o tirante da lança fica mais vermelho quanto mais longe e mais pesada a carga.',
    (s) => `lança ${fmt(s.s.Tjib, 1)} t · contralança ${fmt(s.s.Tcj, 1)} t`],
  anemometer: ['Anemômetro', 'Mede o vento no ponto mais alto. Acima de 50 km/h acende o alerta; acima de 72 km/h a grua para de subir carga e de levar o carrinho para fora.',
    (s) => `vento ${fmt(s.wind.v, 0)} km/h`],
  counterjib: ['Contralança', 'O braço curto, do lado oposto da lança. Ela carrega o contrapeso e o guincho de elevação, que também ajuda a equilibrar.'],
  counterweight: ['Contrapeso', 'Blocos de concreto que equilibram a lança. Ele é escolhido para que a grua vazia penda um pouco para trás e a grua carregada penda um pouco para frente: assim a torre trabalha pouco nos dois casos.',
    (s, P) => `${fmt(P.counterweight, 1)} t a ${fmt(17.5, 1)} m do eixo`],
  hoistWinch: ['Guincho de elevação', 'Motor elétrico, freio, redutor e tambor. O motor é controlado por um inversor de frequência, que muda a velocidade suavemente. O freio é de falha segura: sem energia, ele fecha sozinho.',
    (s) => `${fmt(s.ho.hz, 0)} Hz · ${fmt(s.ho.amps, 0)} A · freio ${s.ho.brake ? 'aplicado' : 'solto'}`],
  jib: ['Lança', 'A treliça horizontal por onde o carrinho anda. Aqui ela tem 60 m de alcance. Quanto mais longe da torre, menor a carga permitida.'],
  trolleyWinch: ['Guincho do carrinho', 'Um motor menor que puxa o carrinho por um cabo em laço fechado: um lado puxa para fora, o outro para dentro.',
    (s) => `${fmt(s.tr.hz, 0)} Hz · ${fmt(Math.abs(s.tr.v) * 60, 0)} m/min`],
  hoistRope: ['Cabo de elevação', 'Sai do tambor, passa pelo topo, corre pela lança, desce até o moitão e volta. Os tracinhos andam no sentido em que o cabo corre.',
    (s, P) => `${P.falls} cabos no moitão · ${fmt((s.ho.mt * 9.81) / P.falls, 1)} kN em cada`],
  trolleyRope: ['Cabo do carrinho', 'Um laço fechado entre o guincho do carrinho e a ponta da lança. Quando um lado enrola, o outro desenrola.'],
  trolley: ['Carrinho', 'Anda sobre o banzo de baixo da lança e define o raio da carga. Ele acelera e freia em rampas para não fazer a carga balançar.',
    (s) => `raio ${fmt(s.tr.r, 1)} m · ${fmt(s.tr.v * 60, 0)} m/min`],
  hook: ['Moitão e gancho', 'O moitão tem polias por onde o cabo passa. Com 4 cabos (passagens) a força em cada um cai pela metade, e a velocidade também: é o mesmo truque de uma talha.',
    (s) => `altura ${fmt(s.hook.y, 1)} m · cabo ${fmt(s.ho.L, 1)} m`],
  moment: ['Momento na base', 'O "torque" que tenta tombar a torre: peso vezes distância ao eixo. A carga puxa para frente e o contrapeso para trás. A seta mostra o resultado.',
    (s) => `${fmt(s.s.M, 0)} t·m`],
  building: ['Prédio em obra', 'O destino das cargas. Uma carga baixa não pode entrar pela lateral: a zona proibida para o carrinho antes de bater.'],
};

const LOAD_TXT = {
  bucket: 'Caçamba de concreto: leva o concreto até a laje.',
  form: 'Forma metálica: pesada, boa para ver o limitador de momento em ação.',
  pallet: 'Palete de blocos: carga média, para levar ao prédio.',
  rebar: 'Feixe de vergalhões: comprido e leve, mas fica longe, no fim da lança.',
};

const DEFAULT = ['Como usar', 'Ligue a energia e use os joysticks: o da esquerda leva o carrinho, o da direita sobe e desce o gancho. Desça o gancho logo acima de uma carga e engate. Clique em qualquer peça para saber o que ela faz.'];

export class Info {
  constructor(box, card) {
    this.box = box;
    this.card = card;
    this.sel = null;
    this.lastLive = '';
    card.addEventListener('click', (e) => { if (e.target.closest('.x')) this.show(null); });
  }

  text(id, st) {
    if (id && id.startsWith('load-')) {
      const l = st.loads.find((x) => 'load-' + x.id === id);
      if (l) return [l.name, `${LOAD_TXT[l.kind]} Massa: ${fmt(l.mass, 1)} t.`, null];
    }
    return T[id] || DEFAULT;
  }

  show(id, st, P) {
    this.sel = id;
    this.render(st, P, true);
  }

  render(st, P, force = false) {
    const [h, p, live] = this.text(this.sel, st || this.st);
    if (st) this.st = st;
    const lv = live && st ? live(st, P) : '';
    if (!force && lv === this.lastLive) return;
    this.lastLive = lv;
    const html = `<h3>${h}</h3><p>${p}</p>${lv ? `<div class="live">${lv}</div>` : ''}`;
    if (force || this.box.dataset.k !== this.sel) { this.box.innerHTML = html; this.box.dataset.k = this.sel; }
    else { const e = this.box.querySelector('.live'); if (e) e.textContent = lv; }
    if (this.sel) {
      if (force) this.card.innerHTML = `<button class="x">×</button>` + html;
      else { const e = this.card.querySelector('.live'); if (e) e.textContent = lv; }
    }
    this.card.classList.toggle('show', !!this.sel);
  }
}
