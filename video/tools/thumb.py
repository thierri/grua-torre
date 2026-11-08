# Thumbnail 9:16 (1080×1920): o próprio simulador, só o desenho da grua (sem interface), e um título branco.
# Uso: python3 -I video/tools/thumb.py   →  exports/thumbnail-916.png
# Ajustes: CENA (estado da grua), CAMERA (enquadramento em px da cena 1400×784), TITULO, SIMULAR (segundos).
import os, shutil, subprocess, json, glob

V = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ROOT = os.path.dirname(V)
P = os.path.join(V, 'thumb')
OUT = os.path.join(ROOT, 'exports', 'thumbnail-916.png')

CENA = {'power': True, 'r': 33, 'attach': 'cacamba', 'hanging': True, 'h': 27}
CAMERA = {'cx': 503, 'cy': 22, 'w': 860}
TITULO = ['Simulador', 'feito com IA']
SUBTITULO = 'Grua de torre'
SIMULAR = 2.0

os.makedirs(P, exist_ok=True)
for d in ('js', 'css'):
    shutil.rmtree(os.path.join(P, d), ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, d), os.path.join(P, d))
body = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
stage = body[body.index('<div id="stage"'):body.index('<script')].strip()
if stage.endswith('</div>'): stage = stage[:-6]
stage = stage.replace('<div id="stage" class="f169">',
                      '<div id="stage" class="f916" data-composition-id="sim" data-start="0" data-duration="1" data-track-index="0" data-no-timeline>')
titulo = '<br>'.join(TITULO)
html = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<link rel="stylesheet" href="css/style.css">
<style>
  html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0b1118}}
  #thumbTitle{{position:absolute;z-index:50;left:72px;right:72px;top:260px;color:#fff;font-family:Inter,system-ui,sans-serif;
    font-weight:900;font-size:150px;line-height:1.0;letter-spacing:-.02em;text-shadow:0 6px 40px #000c}}
  #thumbTitle small{{display:block;margin-top:34px;font-size:56px;font-weight:600;letter-spacing:0;opacity:.85}}
  #thumbShade{{position:absolute;z-index:49;left:0;right:0;top:0;height:1250px;background:linear-gradient(#0b1118 0%,#0b1118 55%,#0b111800 100%)}}
</style>
<script>window.__VIDEO_MODE = true; window.__VIDEO_FMT = '916';</script>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1080" data-height="1920" data-fps="30" data-no-timeline>
<div id="viewport">
  {stage}
</div>
<div id="thumbShade"></div>
<div id="thumbTitle">{titulo}<small>{SUBTITULO}</small></div>
</div>
<script type="module" src="js/main.js"></script>
<script type="module">
const wait = (f) => new Promise((r) => {{ const k = () => (f() ? r() : setTimeout(k, 20)); k(); }});
let done = false;
function pose() {{
  if (done) return; done = true;
  const sim = window.sim;
  sim.pres.scenes.push({{ title: '', text: '', ui: 'clean', prep: {json.dumps(CENA)}, insets: [],
    layers: {{ labels: false, values: false, forces: false }}, cam: {json.dumps(CAMERA)}, duration: 99 }});
  sim.pres.start(sim.pres.scenes.length - 1);
  for (let i = 0; i < {SIMULAR} * 30; i++) sim.tick(1 / 30);
  for (const id of ['caption', 'spot', 'linkBadge', 'speedBadge']) document.getElementById(id).classList.remove('show');
}}
const ready = wait(() => window.sim && window.sim.pres).then(pose);
if (window.__hyperframes) window.__hyperframes.registerFrameSource({{ element: document.getElementById('stage'), ready, render: () => pose() }});
</script>
</body>
</html>
'''
open(os.path.join(P, 'index.html'), 'w', encoding='utf-8').write(html)
snap = os.path.join(P, '.snap')
shutil.rmtree(snap, ignore_errors=True)
subprocess.run(['npx', '--yes', 'hyperframes@0.9.23', 'snapshot', '--at', '0.5', '--no-end', '-o', snap, '--timeout', '120000'],
               cwd=P, check=True, capture_output=True)
png = glob.glob(os.path.join(snap, '*.png'))[0]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
shutil.copy(png, OUT)
print(OUT)
