// Parâmetros da grua martelo (valores típicos de uma grua média, ordem de grandeza real).
// Unidades: metros, toneladas (t), segundos. y para cima, x para a direita, torre em x = 0.

export const G = 9.81;

export const GEO = {
  jibBot: 46.4,        // banzo inferior da lança (onde o carrinho roda)
  jibTop: 48.0,        // banzo superior
  jibLen: 61.5,        // ponta da lança
  pivotY: 45.6,        // polias do carrinho (ponto de onde o cabo desce)
  apex: [0, 57],       // ponta da torre de cabeça
  jibTie: [36, 48],    // onde o tirante da lança prende
  cjTie: [-16, 47.4],  // onde o tirante da contralança prende
  cjEnd: -19.5,
  cjY0: 46.4, cjY1: 47.4,
  towerHalf: 1.2,      // meia largura da torre
  mastTop: 44.0,
  rMin: 2.5, rMax: 60,
  Lmin: 2.0,           // cabo mínimo entre carrinho e gancho (fim de curso alto)
  hookH: 1.2,          // altura do moitão acima do ponto do gancho
  sling: 2.0,          // comprimento das lingas
  Mcap: 120,           // momento nominal (t·m)
  building: { x0: 24, x1: 46, top: 18.3, floors: 6, fh: 3 },
  base: { x0: -4, x1: 4, top: 0.4 },
};

// Massas da estrutura (t) e braço do centro de massa (m)
export const MASS = {
  jib: [11, 29], cj: [5, -9], winch: [3.5, -11], cwArm: -17.5,
  head: [6, 0], cab: [1, 2.4], mastPerM: 1.2, trolley: 0.5,
  hook2: 0.25, hook4: 0.4,
};

export const DRIVE = {
  trolleyV: 1.0,        // m/s (60 m/min)
  trolleyA: 0.5,        // m/s² (rampa do inversor)
  hoistRope: 2.67,      // velocidade máxima do cabo no tambor (m/s, 160 m/min)
  hoistA: 0.8,
  hoistP: 37,           // kW
  steps: [0, 0.15, 0.35, 0.65, 1.0],   // degraus do joystick (1ª a 4ª)
  hzMax: 87,
};

export const LOADS = [
  { id: 'cacamba', name: 'Caçamba de concreto', mass: 2.4, x: 7, w: 1.6, h: 1.8, area: 3, kind: 'bucket' },
  { id: 'forma', name: 'Forma metálica', mass: 6.0, x: 12, w: 3.4, h: 1.0, area: 4, kind: 'form' },
  { id: 'palete', name: 'Palete de blocos', mass: 1.6, x: 17.5, w: 1.4, h: 1.3, area: 2, kind: 'pallet' },
  { id: 'vergalhao', name: 'Feixe de vergalhões', mass: 1.0, x: 54, w: 6, h: 0.5, area: 3, kind: 'rebar' },
];

export const DEFAULTS = {
  wind: 8,              // km/h
  gusts: true,
  falls: 2,             // passagens do cabo no moitão (2 ou 4)
  counterweight: 17.3,  // t
  limiter: true,
  brakeWorn: false,
  masses: {},           // massa personalizada por carga: { forma: 9 }
};

export const LIMITS = { pre: 0.9, cut: 1.0, windPre: 50, windStop: 72 };

export const SITE_LINK = 'thierri.github.io/grua-torre';
