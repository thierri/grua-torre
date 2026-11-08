import { createState, step, attach, release } from '../js/sim/simulation.js';
import { DEFAULTS } from '../js/config.js';
const P = { ...DEFAULTS, gusts:false, wind:0 };
const dt = 1/240;
const st = createState(P, { power:true, r:7, h:20 });
const run = (sec, inp, until) => { for (let i=0;i<sec*240;i++){ Object.assign(st.input, inp); step(st,P,dt); st.ev.length=0; if (until && until()) break; } };
const show = (tag) => { const L = st.load!=null? st.loads[st.load]:null; console.log(tag.padEnd(22), 'r', st.tr.r.toFixed(2), 'L', st.ho.L.toFixed(2), 'hookY', st.hook.y.toFixed(2), 'th°', (st.sw.th*57.3).toFixed(2), 'meas', st.lim.meas, 'util', st.lim.util.toFixed(2), st.lim.pre?'PRE':'', st.lim.cut?'CUT':'', st.lim.slack?'slack':'', 'M', st.s.M.toFixed(1), 'Tj', st.s.Tjib.toFixed(1), 'Tcj', st.s.Tcj.toFixed(1), L? `load ${L.id} x${L.x.toFixed(2)} y${L.y.toFixed(2)} ${L.resting?'rest':'hang'}`:'', 'can', st.can.attach, st.ho.hz.toFixed(0)+'Hz', st.ho.amps.toFixed(0)+'A'); };
show('start');
run(40, {hoist:-1, trolley:0}, ()=>st.lim.slack); show('lowered');
run(1,{hoist:0}); show('stop');
console.log('attach', attach(st,P)); show('attached');
run(30, {hoist:1}, ()=>st.hook.y>26); show('lifted');
run(1, {hoist:0});
run(40, {trolley:1}, ()=>st.tr.r>33); show('moved out');
run(4, {trolley:0}); show('stopped');
for (let k=0;k<6;k++){ run(2,{}); show('swing '+k); }
run(40, {hoist:-1}, ()=>st.loads[0].resting && st.lim.slack); show('landed');
run(1,{hoist:0});
console.log('release', release(st,P));
run(10,{hoist:1}); show('hook up');
// limiter test
const P4={...P,falls:4}; Object.assign(P,P4); const s2 = createState(P,{power:true, r:12, attach:'forma'}); Object.assign(st, s2);
show('forma');
run(10,{hoist:1}, ()=>st.hook.y>10); run(1,{hoist:0}); show('forma lifted');
run(30,{trolley:1}, ()=>st.lim.cut); show('cut reached'); run(5,{trolley:1}); show('push more');
run(3,{trolley:-1,hoist:0}); show('back in');
// overload: forma 9t
const P2={...P, masses:{forma:9}}; Object.assign(st, createState(P2,{power:true,r:12,attach:'forma'}));
for (let i=0;i<240*5;i++){ st.input.hoist=1; step(st,P2,dt); st.ev.length=0;} show('9t try');
// empty base moment
Object.assign(st, createState(P,{power:true,r:10})); show('empty r10');
