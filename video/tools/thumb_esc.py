# Thumbnail 16:9 do vídeo da ESCAVADEIRA, no mesmo molde da thumbnail da grua (thumb_yt.py):
# foto real → seta → o simulador (github.com/thierri/escavadeira), título em Oswald.
# Uso: python3 -I video/tools/thumb_esc.py [--so-compor]  →  exports/thumbnail-escavadeira.png
# Foto: "Caterpillar 330 Excavator", Matthew T Rader, CC BY-SA 4.0 (Wikimedia Commons),
# em video/thumb-esc/escavadeira-real.jpg (fora do git). Crédito obrigatório na descrição do vídeo.
import os, sys, shutil, subprocess, glob, urllib.request

V = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ROOT = os.path.dirname(V)
P = os.path.join(V, 'thumb-esc')
OUT = os.path.join(ROOT, 'exports', 'thumbnail-escavadeira.png')
REPO = 'https://github.com/thierri/escavadeira.git'
FOTO_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Caterpillar_330_Excavator.jpg'

POSE = [30, -100, -90]          # lança, braço, caçamba (graus), como em scenes.js
SIMULAR = 1.5
FOTO = 'left:-690px;top:-60px;width:1800px'
SETA = ('M 815 330 Q 990 330 990 545', 'M 964 514 L 990 548 L 1014 512')
TITULO = ['Simulador', 'realista']
FONTE = "font-family:Oswald;font-weight:700;font-size:170px;line-height:.98;text-transform:uppercase"
ENDERECO = 'thierri.github.io/escavadeira'


def snapshot(d, out):
    snap = os.path.join(d, '.snap')
    shutil.rmtree(snap, ignore_errors=True)
    subprocess.run(['npx', '--yes', 'hyperframes@0.9.23', 'snapshot', '--at', '0.5', '--no-end', '-o', snap, '--timeout', '120000'],
                   cwd=d, check=True, capture_output=True)
    shutil.copy(glob.glob(os.path.join(snap, '*.png'))[0], out)


os.makedirs(P, exist_ok=True)
foto = os.path.join(P, 'escavadeira-real.jpg')
if not os.path.exists(foto):
    req = urllib.request.Request(FOTO_URL, headers={'User-Agent': 'grua-torre-thumb/1.0'})
    open(foto, 'wb').write(urllib.request.urlopen(req).read())

# Etapa 1: o simulador da escavadeira (modo livre, interface completa)
src = os.path.join(P, 'escavadeira')
if not os.path.exists(src):
    subprocess.run(['git', 'clone', '-q', '--depth', '1', REPO, src], check=True)
if '--so-compor' not in sys.argv or not os.path.exists(os.path.join(P, 'sim-169.png')):
    S = os.path.join(P, 'sim')
    os.makedirs(S, exist_ok=True)
    for d in ('js', 'css'):
        shutil.rmtree(os.path.join(S, d), ignore_errors=True)
        shutil.copytree(os.path.join(src, d), os.path.join(S, d))
    body = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
    stage = body[body.index('<div id="stage"'):body.index('<script')].strip()
    if stage.endswith('</div>'): stage = stage[:-6]
    stage = stage.replace('<div id="stage">',
                          '<div id="stage" data-composition-id="sim" data-start="0" data-duration="1" data-track-index="0" data-no-timeline>')
    open(os.path.join(S, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080">
<link rel="stylesheet" href="css/style.css">
<style>html,body{{margin:0;width:1920px;height:1080px;overflow:hidden}}</style>
<script>window.__VIDEO_MODE = true;</script></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1920" data-height="1080" data-fps="30" data-no-timeline>
{stage}</div></div>
<script type="module" src="js/main.js"></script>
<script type="module">
const wait = (f) => new Promise((r) => {{ const k = () => (f() ? r() : setTimeout(k, 20)); k(); }});
let done = false;
function pose() {{
  if (done) return; done = true;
  const st = window.sim.st, P = st.params, rad = (d) => d * Math.PI / 180, p = {POSE};
  st.autoIdle = false; st.mode = 'S'; st.throttle = 7; st.locked = false;
  st.j.boom = rad(p[0]); st.j.arm = rad(p[1]); st.j.bucket = rad(p[2]);
  st.key = 1; st.eng.running = true; st.eng.integ = 120; st.eng.coolant = 82; st.oil.T = 48;
  st.eng.rpm = P.idleRpm + ((st.throttle - 1) / 9) * (P.ratedRpm * 0.96 - P.idleRpm);
  st.pilot.supply = P.pilotBar;
  for (let i = 0; i < {SIMULAR} * 30; i++) window.sim.tick(1 / 30);
}}
const ready = wait(() => window.sim && window.sim.st).then(pose);
if (window.__hyperframes) window.__hyperframes.registerFrameSource({{ element: document.getElementById('stage'), ready, render: () => pose() }});
</script></body></html>
''')
    snapshot(S, os.path.join(P, 'sim-169.png'))

# Etapa 2: composição (mesmo molde de thumb_yt.py)
titulo = '<br>'.join(TITULO)
open(os.path.join(P, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080">
<style>
  html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#06142c;font-family:Inter,system-ui,sans-serif}}
  #root{{position:relative;width:1920px;height:1080px;overflow:hidden}}
  #foto{{position:absolute;{FOTO};-webkit-mask-image:linear-gradient(90deg,#000 75%,#0000 100%);mask-image:linear-gradient(90deg,#000 75%,#0000 100%)}}
  #sombra{{position:absolute;inset:0;background:linear-gradient(90deg,#0000 30%,#06142ccc 62%,#06142cee 100%),linear-gradient(#0000 85%,#06142c99 100%)}}
  #janela{{position:absolute;left:1000px;top:430px;width:860px;border-radius:18px;overflow:hidden;background:#0b1118;
    box-shadow:0 0 0 6px #ffd21f,0 30px 80px #000c}}
  #barra{{height:44px;background:#1b2430;display:flex;align-items:center;gap:10px;padding:0 18px;color:#c9d4e2;font-size:22px;font-weight:600}}
  #barra i{{width:14px;height:14px;border-radius:50%;background:#56606e;display:inline-block}}
  #barra b{{margin-left:18px;background:#0b1118;border-radius:8px;padding:5px 16px;font-weight:600}}
  #janela img{{display:block;width:860px;height:484px}}
  #titulo{{position:absolute;left:1000px;right:40px;top:60px;white-space:nowrap;color:#fff;text-shadow:0 6px 30px #000a;{FONTE}}}
  svg{{position:absolute;inset:0;z-index:2}}
</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1920" data-height="1080" data-fps="30" data-no-timeline>
<img id="foto" src="escavadeira-real.jpg">
<div id="sombra"></div>
<svg width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity=".7"/></filter></defs>
  <g filter="url(#sh)" fill="none" stroke="#ffd21f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="{SETA[0]}"/>
    <path d="{SETA[1]}"/>
  </g>
</svg>
<div id="titulo">{titulo}</div>
<script>{{const t=document.getElementById('titulo');let f=parseFloat(getComputedStyle(t).fontSize);
const ok=()=>t.scrollWidth<=t.clientWidth+1&&t.offsetHeight<=350;
document.fonts.ready.then(()=>{{while(!ok()&&f>60){{f-=4;t.style.fontSize=f+'px';}}}});}}</script>
<div id="janela"><div id="barra"><i></i><i></i><i></i><b>{ENDERECO}</b></div><img src="sim-169.png"></div>
</div></body></html>
''')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
snapshot(P, OUT)
print(OUT)
