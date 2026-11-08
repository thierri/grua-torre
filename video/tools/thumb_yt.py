# Thumbnail 16:9 do YouTube (1920×1080): foto real de uma grua → seta → o simulador, com títulos.
# Uso: python3 -I video/tools/thumb_yt.py   →  exports/thumbnail-youtube.png
# Etapa 1 captura o simulador (interface completa); etapa 2 compõe foto, seta e títulos.
# Foto: "Construction crane on clear sky", Alexandru Panoiu, CC BY 2.0 (Wikimedia Commons),
# em video/thumb-yt/grua-real.jpg (fora do git). Crédito obrigatório na descrição do vídeo.
import os, shutil, subprocess, json, glob, urllib.parse, urllib.request

V = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ROOT = os.path.dirname(V)
P = os.path.join(V, 'thumb-yt')
OUT = os.path.join(ROOT, 'exports', 'thumbnail-youtube.png')
FOTO = 'Construction crane on clear sky (20151112 122747 1JC) (23902449492).jpg'

CENA = {'power': True, 'r': 24, 'attach': 'cacamba', 'hanging': True, 'h': 22}
SIMULAR = 2.0
TITULO = 'Simulador de grua'
DESTAQUE = 'feito com IA'
SELOS = ['Online e grátis', 'Jogue no PC ou celular']
ENDERECO = 'thierri.github.io/grua-torre'


def snapshot(d, out):
    snap = os.path.join(d, '.snap')
    shutil.rmtree(snap, ignore_errors=True)
    subprocess.run(['npx', '--yes', 'hyperframes@0.9.23', 'snapshot', '--at', '0.5', '--no-end', '-o', snap, '--timeout', '120000'],
                   cwd=d, check=True, capture_output=True)
    shutil.copy(glob.glob(os.path.join(snap, '*.png'))[0], out)


os.makedirs(P, exist_ok=True)
foto = os.path.join(P, 'grua-real.jpg')
if not os.path.exists(foto):
    url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(FOTO.replace(' ', '_')) + '?width=2400'
    req = urllib.request.Request(url, headers={'User-Agent': 'grua-torre-thumb/1.0'})
    open(foto, 'wb').write(urllib.request.urlopen(req).read())

# Etapa 1: o simulador com a interface completa, carga pendurada
S = os.path.join(P, 'sim')
os.makedirs(S, exist_ok=True)
for d in ('js', 'css'):
    shutil.rmtree(os.path.join(S, d), ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, d), os.path.join(S, d))
body = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
stage = body[body.index('<div id="stage"'):body.index('<script')].strip()
if stage.endswith('</div>'): stage = stage[:-6]
stage = stage.replace('<div id="stage" class="f169">',
                      '<div id="stage" class="f169" data-composition-id="sim" data-start="0" data-duration="1" data-track-index="0" data-no-timeline>')
open(os.path.join(S, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080">
<link rel="stylesheet" href="css/style.css">
<style>html,body{{margin:0;width:1920px;height:1080px;overflow:hidden}}</style>
<script>window.__VIDEO_MODE = true; window.__VIDEO_FMT = '169';</script></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1920" data-height="1080" data-fps="30" data-no-timeline>
<div id="viewport">{stage}</div></div>
<script type="module" src="js/main.js"></script>
<script type="module">
const wait = (f) => new Promise((r) => {{ const k = () => (f() ? r() : setTimeout(k, 20)); k(); }});
let done = false;
function pose() {{
  if (done) return; done = true;
  const sim = window.sim;
  sim.pres.scenes.push({{ title: '', text: '', prep: {json.dumps(CENA)}, insets: [], duration: 99 }});
  sim.pres.start(sim.pres.scenes.length - 1);
  for (let i = 0; i < {SIMULAR} * 30; i++) sim.tick(1 / 30);
  for (const id of ['caption', 'spot', 'linkBadge', 'speedBadge']) document.getElementById(id).classList.remove('show');
}}
const ready = wait(() => window.sim && window.sim.pres).then(pose);
if (window.__hyperframes) window.__hyperframes.registerFrameSource({{ element: document.getElementById('stage'), ready, render: () => pose() }});
</script></body></html>
''')
snapshot(S, os.path.join(P, 'sim-169.png'))

# Etapa 2: composição
selos = ''.join(f'<span>{s}</span>' for s in SELOS)
open(os.path.join(P, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080">
<style>
  html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#1d4f9c;font-family:Inter,system-ui,sans-serif}}
  #root{{position:relative;width:1920px;height:1080px;overflow:hidden}}
  #foto{{position:absolute;left:-1590px;top:-10px;width:3600px}}
  #sombra{{position:absolute;inset:0;background:linear-gradient(90deg,#0000 30%,#06142ccc 62%,#06142cee 100%)}}
  .tag{{position:absolute;padding:12px 26px;border-radius:14px;font-weight:900;font-size:46px;letter-spacing:.04em;
    text-transform:uppercase;box-shadow:0 8px 30px #0008}}
  #tagReal{{left:70px;top:880px;background:#fff;color:#0b1730}}
  #tagSim{{left:1000px;top:318px;background:#ffd21f;color:#0b1730;z-index:3}}
  #janela{{position:absolute;left:1000px;top:400px;width:860px;border-radius:18px;overflow:hidden;background:#0b1118;
    box-shadow:0 0 0 6px #ffd21f,0 30px 80px #000c}}
  #barra{{height:44px;background:#1b2430;display:flex;align-items:center;gap:10px;padding:0 18px;color:#c9d4e2;font-size:22px;font-weight:600}}
  #barra i{{width:14px;height:14px;border-radius:50%;background:#56606e;display:inline-block}}
  #barra b{{margin-left:18px;background:#0b1118;border-radius:8px;padding:5px 16px;font-weight:600}}
  #janela img{{display:block;width:860px;height:484px}}
  #titulo{{position:absolute;left:1000px;right:50px;top:44px;color:#fff;font-weight:900;font-size:92px;line-height:.98;
    letter-spacing:-.02em;text-shadow:0 6px 30px #000a}}
  #titulo em{{display:block;font-style:normal;color:#ffd21f;font-size:118px}}
  #selos{{position:absolute;left:1000px;top:958px;display:flex;gap:18px}}
  #selos span{{background:#fff;color:#0b1730;font-weight:800;font-size:38px;padding:10px 24px;border-radius:999px;box-shadow:0 8px 24px #0008}}
  #selos span:first-child{{background:#21c35a;color:#fff}}
  svg{{position:absolute;inset:0;z-index:2}}
</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1920" data-height="1080" data-fps="30" data-no-timeline>
<img id="foto" src="grua-real.jpg">
<div id="sombra"></div>
<div id="tagReal" class="tag">Grua real</div>
<svg width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><marker id="ponta" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L4,2 L0,4 Z" fill="#ffd21f" stroke="#0b1730" stroke-width=".35"/></marker></defs>
  <path d="M 420 860 C 560 1010, 820 990, 965 790" fill="none" stroke="#0b1730" stroke-width="38" stroke-linecap="round"/>
  <path d="M 420 860 C 560 1010, 820 990, 965 790" fill="none" stroke="#ffd21f" stroke-width="26" stroke-linecap="round" marker-end="url(#ponta)"/>
</svg>
<div id="titulo">{TITULO}<em>{DESTAQUE}</em></div>
<div id="tagSim" class="tag">Simulador</div>
<div id="janela"><div id="barra"><i></i><i></i><i></i><b>{ENDERECO}</b></div><img src="sim-169.png"></div>
<div id="selos">{selos}</div>
</div></body></html>
''')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
snapshot(P, OUT)
print(OUT)
