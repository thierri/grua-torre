// Roteiro do modo apresentação. Cada cena é só dados (ver documentacao/04-referencia-tecnica.md).
// Os tempos seguem a narração gravada (video/edicao.json): t = segundos desde o começo da cena no vídeo.
// Comandos: trolley (+ para fora), hoist (+ sobe), horn. Piloto automático: auto: [[t, { r, h, catch }]].
// Chaves com sufixo 916 valem no formato 9:16 (cam916, spots916, capPos916, insets916, insetPos916).
import { X, Y } from '../render/svg.js';

const Z = {
  head: { cx: X(0), cy: Y(51), w: 520 },
  cj: { cx: X(-9.5), cy: Y(46.5), w: 430 },
  jib: { cx: X(31), cy: Y(46), w: 860 },
  base: { cx: X(0), cy: Y(6), w: 560 },
  tower: { cx: X(0), cy: Y(25), w: 900 },
};
const follow = (w = 640) => (st) => ({ cx: X(st.tr.r), cy: (Y(45.6) + Y(Math.max(st.hook.y - 3, 0))) / 2, w });

// tenta uma ação a cada 0,2 s numa janela (engatar/soltar só quando a física deixa)
const during = (t0, t1, fn) => {
  const ev = [];
  for (let t = t0; t <= t1 + 1e-6; t += 0.2) ev.push([+t.toFixed(2), fn]);
  return ev;
};
const engatar = (st, P, a) => { if (st.load == null && st.can.attach >= 0) a.hookAction(); };
const soltar = (st, P, a) => { if (st.load != null && st.can.release) a.hookAction(); };
const keys = { sel: '.cmid .keys', pad: 6 };

export const SCENES = [
  // ================= Parte 1 · Mostrando o simulador =================
  {
    title: 'Um simulador de grua de torre',
    text: 'Feito com inteligência artificial.',
    prep: { power: true, r: 28, attach: 'palete', hanging: true, h: 25.5 },
    insets: ['legend', 'winch'],
    auto: [[0.3, { r: 28.6, h: 25.5, tmax: 0.3 }], [12.6, { h: 25.5 }], [21.8, { h: 21.2, hk: 1.6 }], [27.6, { h: 26.5, hmax: 0.7 }]],
    moves: [[12.8, 2.8, { trolley: 1 }], [15.6, 2.7, { trolley: -1 }], [19.6, 1.8, { trolley: 1 }], [21.4, 1.4, { trolley: -0.8 }]],
    cams: [[0, 'default'], [16.6, follow(760)], [22.4, 'default']],
    events: [[22.6, (st, P, a) => a.gust()], [33.2, (st, P, a) => a.power(false)], ...during(25.6, 27, soltar)],
    focuses: [[0, []], [16.6, ['hook', 'load-palete', 'hoistRope', 'trolley']], [22.4, ['anemometer', 'load-palete', 'hook']], [24.4, ['hook', 'load-palete']], [27.2, []]],
    spots: [[11.8, keys], [14.3, null], [27.6, 'panel'], [32.6, null]],
    spots916: [[11.8, 'controls'], [14.3, null], [27.6, 'panel'], [32.6, null]],
    link: [4.6, 11.4],
    notes: [
      [4.5, 'Está aberto na internet: dá para usar no navegador do computador ou do celular.'],
      [11.7, 'Dá para controlar a grua pelo teclado e jogar o carrinho para frente e para trás.'],
      [16.6, 'Repare na inércia do moitão e do gancho quando o carrinho anda.'],
      [22.4, 'Simula o efeito do vento.'],
      [24.4, 'Engata e desengata cargas.'],
      [27.4, 'E tem um painel de instrumentos bem próximo ao de uma grua real.'],
    ],
    duration: 36,
  },
  {
    title: 'Ligando a grua',
    text: 'Primeiro, a energia: os inversores ligam e os freios soltam.',
    prep: { power: false, r: 14, h: 24 },
    insets: ['winch'],
    events: [[0.9, (st, P, a) => a.power(true)]],
    spots: [[0.4, 'power'], [6.5, 'joyT'], [8.4, 'joyH'], [10.2, keys], [13.6, 'joyT'], [19.8, null]],
    spots916: [[0.4, 'power'], [6.5, 'joyT'], [8.4, 'joyH'], [13.6, 'joyT'], [19.8, null]],
    moves: [
      [6.9, 1.4, { trolley: 0.4 }], [8.6, 1.4, { hoist: 0.6 }],
      [13.8, 1.5, { trolley: 0.2 }], [15.0, 1.5, { trolley: 0.45 }], [16.2, 1.5, { trolley: 0.7 }], [17.4, 1.2, { trolley: 0.95 }],
      [18.6, 1.6, { trolley: -0.95 }],
    ],
    notes: [
      [6.4, 'O joystick da esquerda é o carrinho; o da direita, o gancho.'],
      [10.1, 'No teclado, as setas.'],
      [13.6, 'Quanto mais longe o comando, mais rápido: são 4 velocidades para frente e para trás.'],
    ],
    capPos916: 'top',
    insets916: [],
    duration: 21,
  },
  {
    title: 'A inércia da carga',
    text: 'Quando o carrinho arranca, a carga fica para trás.',
    prep: { power: true, r: 8, attach: 'palete', hanging: true, h: 23 },
    cam: follow(780),
    insets: [],
    focus: ['load-palete', 'hook', 'trolley', 'hoistRope'],
    moves: [[1.3, 3.8, { trolley: 1 }]],
    auto: [[11.8, { catch: true }]],
    notes: [
      [4.4, 'Quando ele para, ela continua indo e fica balançando.'],
      [8.2, 'Isso é inércia: o maior inimigo de quem opera uma grua.'],
      [12.4, 'Para segurar, leve o carrinho para baixo da carga no momento certo.'],
      [16.7, 'Pronto, parou.'],
    ],
    duration: 17.8,
  },
  {
    title: 'Pegando uma carga',
    text: 'O gancho desce até a caçamba de concreto.',
    prep: { power: true, r: 18, h: 6.5, loads: { cacamba: { x: 18 }, palete: { x: 8 } } },
    insets: ['legend'],
    auto: [[1.5, { r: 18, h: 2.3, hk: 2 }], [5.0, { r: 18, h: 24, hk: 1.5 }], [12.4, { r: 25.8, h: 24, hk: 1.5, rk: 1.5 }], [16.6, { r: 25.8, h: 21.2, hmax: 0.5, hk: 1.4 }], [23.5, { r: 25.8, h: 25 }]],
    speed: [[6.0, 2], [17.6, 1]],
    events: [...during(3.9, 5.0, engatar), ...during(20.3, 26, soltar)],
    spots: [[6.3, 'lmi'], [11.4, null], [24.2, 'lmi'], [31.2, 'chart'], [36.0, 'dials'], [38.2, 'base'], [40.1, 'lights']],
    spots916: [[6.3, 'lmi'], [11.4, null], [24.2, 'lmi'], [31.2, 'chart'], [38.2, 'base'], [40.1, 'lights']],
    notes: [
      [4.2, 'Engata e sobe. O limitador já mostra quase 2,5 toneladas no gancho.'],
      [11.5, 'Até o prédio, sempre com a caçamba mais alta que a laje, para não bater na obra.'],
      [18.2, 'Desce devagar, apoia e solta.'],
      [21.3, 'O mais importante do painel é o limitador de momento: quanto tem no gancho e quanto a grua aguenta ali.'],
      [31.2, 'A curva de carga, com o ponto mostrando onde a grua está.'],
      [36.0, 'E ainda: vento, motor, esforço na base da torre e luzes de aviso.'],
    ],
    duration: 41,
  },
  {
    title: 'Mexendo nos parâmetros',
    text: 'Aqui em cima dá para mexer em tudo.',
    prep: { power: true, r: 24, h: 26 },
    insets: ['legend'],
    events: [
      [3.0, (st, P, a) => a.showDrawer(true)],
      [14.5, (st, P, a) => a.showDrawer(false)],
      [15.6, (st, P, a) => a.setLayers({ ropes: false })],
      [16.1, (st, P, a) => a.setLayers({ labels: false })],
      [16.7, (st, P, a) => a.setLayers({ values: false })],
      [17.9, (st, P, a) => a.setLayers({ ropes: true, labels: true, values: true })],
    ],
    spots: [
      [0.3, { sel: '#btnParams', pad: 8 }], [3.6, { sel: '#drawer .prow', i: 0 }], [4.3, { sel: '#drawer .prow', i: 3 }],
      [5.8, { sel: '#drawer .prow', i: 2 }], [7.1, { sel: '#drawer .prow', i: 4 }], [8.5, null],
      [12.2, { sel: '#drawer .prow', i: 5 }], [13.5, { sel: '#drawer .prow', i: 6 }], [14.5, { sel: '#layers', pad: 8 }], [18.2, null],
    ],
    spots916: [
      [0.3, { sel: '#btnParams', pad: 8 }], [3.6, { sel: '#drawer .prow', i: 0 }], [4.3, { sel: '#drawer .prow', i: 3 }],
      [5.8, { sel: '#drawer .prow', i: 2 }], [7.1, { sel: '#drawer .prow', i: 4 }], [8.5, null],
      [12.2, { sel: '#drawer .prow', i: 5 }], [13.5, { sel: '#drawer .prow', i: 6 }], [14.5, null],
    ],
    notes: [
      [3.1, 'Vento, contrapeso, número de cabos, peso das cargas…'],
      [9.8, 'E até falhas, como o limitador desligado ou o freio gasto.'],
      [14.6, 'Dá para esconder os cabos, os nomes e os valores do desenho.'],
    ],
    capPos916: 'top',
    duration: 18.5,
  },

  // ================= Parte 2 · Por dentro da grua =================
  {
    title: 'Os principais componentes',
    text: 'Agora, as principais partes da grua.',
    prep: { power: true, r: 20, h: 30 },
    cams: [[0, 'default'], [3.8, Z.tower], [5.8, Z.jib], [9.0, Z.cj]],
    focuses: [[0, []], [3.8, ['tower', 'foundation']], [5.8, ['jib', 'trolley', 'hook', 'pendants']], [9.0, ['counterjib', 'counterweight', 'hoistWinch']]],
    moves: [[6.3, 3.0, { trolley: 0.6 }]],
    notes: [
      [3.8, 'A torre: uma treliça de aço.'],
      [5.8, 'A lança, onde o carrinho anda levando o gancho.'],
      [9.0, 'Do outro lado, a contralança, com o contrapeso de concreto.'],
    ],
    insets: [],
    duration: 13.1,
  },
  {
    title: 'Por que ela não tomba',
    text: 'O contrapeso equilibra a carga, como numa balança.',
    prep: { power: true, r: 12, attach: 'forma', slack: true, params: { falls: 4 } },
    insets: [],
    focuses: [[0, ['counterweight', 'moment', 'tower', 'pendants', 'load-forma']], [6.3, ['load-forma', 'moment', 'tower', 'hook', 'pendants']]],
    spots: [[4.2, 'base']],
    auto: [[5.6, { h: 13 }]],
    notes: [
      [4.2, 'Vazia, a grua pende um pouco para trás.'],
      [6.3, 'Com 6 toneladas no gancho, ela passa a pender para frente.'],
    ],
    duration: 9.7,
  },
  {
    title: 'O limitador de momento',
    text: 'Quanto mais longe a carga, menos a grua aguenta.',
    prep: { power: true, r: 15.5, attach: 'forma', hanging: true, h: 22, params: { falls: 4 } },
    insets: [],
    auto: [[0.3, { h: 22, r: 26 }]],
    spots: [[0.3, 'chart'], [6.1, 'lmi'], [10.2, 'lights']],
    focus: ['load-forma', 'trolley', 'hook', 'pendants'],
    notes: [
      [4.2, 'Passou do limite: o limitador bipa e depois corta.'],
      [10.2, 'O carrinho não sai mais do lugar.'],
    ],
    duration: 12.3,
  },
  {
    title: 'O guincho',
    text: 'Motor, freio e tambor, que enrola o cabo.',
    prep: { power: true, r: 7, attach: 'cacamba' },
    cam: { cx: X(-6), cy: Y(44), w: 640 },
    cam916: { cx: X(-6), cy: Y(40), w: 600 },
    insets: ['winch'],
    insetPos: { winch: [30, 470], legend: [14, 520] },
    focus: ['hoistWinch', 'hoistRope', 'counterjib'],
    spots: [[0.3, { sel: '[data-inset="winch"]' }]],
    auto: [[0.4, { h: 12 }]],
    duration: 5.9,
  },
  {
    title: 'O moitão: 2 ou 4 cabos',
    text: 'O cabo pode passar pelo moitão com 2 ou 4 cabos.',
    prep: { power: true, r: 17.5, h: 6, params: { falls: 2 } },
    cam: (st) => ({ cx: X(st.tr.r), cy: Y(st.hook.y + 3), w: 640 }),
    insets: [],
    focus: ['hook', 'hoistRope', 'trolley'],
    auto: [[0.4, { h: 40 }]],
    events: [[3.2, (st, P) => { P.falls = 4; }]],
    spots: [[7.5, 'chart']],
    notes: [
      [4.2, 'Com 4, o gancho sobe na metade da velocidade…'],
      [7.5, '…mas aguenta o dobro do peso: de 4 para 8 toneladas.'],
    ],
    duration: 8.9,
  },
  {
    title: 'Emergência',
    text: 'Se der algum problema, é só apertar a emergência.',
    prep: { power: true, r: 26, attach: 'cacamba', hanging: true, h: 34 },
    cam: follow(700),
    insets: ['winch'],
    insetPos916: { winch: [16, 590], legend: [764, 16] },
    focus: ['hoistWinch', 'hook', 'load-cacamba', 'trolley', 'hoistRope'],
    moves: [[0.1, 7.4, { hoist: -1 }]],
    events: [[2.9, (st, P, a) => a.estop(true)]],
    spots: [[2.6, 'estop'], [4.1, { sel: '[data-inset="winch"]' }]],
    notes: [[3.6, 'Os freios fecham sozinhos e a carga para no ar, onde estiver.']],
    capPos916: 'top',
    duration: 7.5,
  },
  {
    title: 'O vento',
    text: 'No topo, o anemômetro mede o vento.',
    prep: { power: true, r: 30, attach: 'palete', hanging: true, h: 30, params: { wind: 25, gusts: true } },
    insets: [],
    focuses: [[0, ['anemometer', 'head']], [3.8, ['anemometer', 'load-palete', 'hook', 'head']]],
    spots: [[3.8, 'dials'], [9.4, 'lights']],
    spots916: [[9.4, 'lights']],
    events: [[4.6, (st, P) => { P.wind = 45; }], [6.4, (st, P) => { P.wind = 62; }], [8.0, (st, P) => { P.wind = 90; P.gusts = false; }]],
    notes: [[8.0, 'Se o vento ficar forte demais, a grua para automaticamente.']],
    duration: 11.8,
  },
  {
    title: 'Agora é a sua vez',
    text: 'Acesse o simulador e brinque um pouco. Que máquina você quer ver depois?',
    prep: { power: true, r: 30, h: 30 },
    insets: ['legend', 'winch'],
    moves: [[1.5, 4, { trolley: -0.6 }], [6, 4, { hoist: 0.7 }]],
    link: [0, 99],
    duration: 14.7,
  },
];
