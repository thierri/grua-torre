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
TITULO = ['Simulador', 'realista']
FONTE = "font-family:Oswald;font-weight:700;font-size:170px;line-height:.98;text-transform:uppercase"
# python3 -I video/tools/thumb_yt.py --frases  →  exports/thumb-frases/*.png (mesma fonte, outras frases)
FRASES = [
    ['Simulador', 'completo'],
    ['Simulador', 'realista'],
    ['Simulador', 'no PC'],
    ['Opere uma', 'grua de torre'],
    ['Grua de torre', 'no navegador'],
    ['Simulador', 'grátis'],
    ['Fiz com IA', 'um simulador'],
    ['Pilote uma', 'grua real'],
]
# python3 -I video/tools/thumb_yt.py --variantes  →  exports/thumb-variantes/*.png (+ prancha.png)
VARIANTES = {
    '1-inter-maiusculo': ("font-family:Inter;font-weight:900;font-size:128px;line-height:.98;letter-spacing:-.02em;text-transform:uppercase", None),
    '2-inter-minusculo': ("font-family:Inter;font-weight:900;font-size:165px;line-height:.92;letter-spacing:-.04em;text-transform:lowercase", None),
    '3-league-gothic': ("font-family:'League Gothic';font-weight:400;font-size:190px;line-height:.88;letter-spacing:.01em;text-transform:uppercase", None),
    '4-oswald': ("font-family:Oswald;font-weight:700;font-size:170px;line-height:.98;text-transform:uppercase", None),
    '5-archivo-black': ("font-family:'Archivo Black';font-size:116px;line-height:1.05;letter-spacing:-.01em;text-transform:uppercase", None),
    '6-montserrat': ("font-family:Montserrat;font-weight:900;font-size:120px;line-height:1.02;letter-spacing:-.01em;text-transform:uppercase", None),
    '7-poppins-minusculo': ("font-family:Poppins;font-weight:800;font-size:150px;line-height:.98;letter-spacing:-.03em;text-transform:lowercase", None),
    '8-misto': ("font-family:Inter;line-height:1", "<span style=\"display:block;font-weight:700;font-size:96px;letter-spacing:-.02em\">simulador</span>"
               "<span style=\"display:block;font-family:'League Gothic';font-size:250px;line-height:.85;letter-spacing:.01em\">COMPLETO</span>"),
}
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
    url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(FOTO.replace(' ', '_')) + ''
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
import sys
VAR = '--variantes' in sys.argv or '--frases' in sys.argv
if not (VAR and os.path.exists(os.path.join(P, 'sim-169.png'))):
    snapshot(S, os.path.join(P, 'sim-169.png'))


# Etapa 2: composição
def compor(fonte, titulo, out):
    open(os.path.join(P, 'index.html'), 'w', encoding='utf-8').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080">
<style>
  html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#1d4f9c;font-family:Inter,system-ui,sans-serif}}
  #root{{position:relative;width:1920px;height:1080px;overflow:hidden}}
  #foto{{position:absolute;left:-2274px;top:-300px;width:4400px}}
  #sombra{{position:absolute;inset:0;background:linear-gradient(90deg,#0000 30%,#06142ccc 62%,#06142cee 100%),linear-gradient(#0000 85%,#06142c99 100%)}}
  #janela{{position:absolute;left:1000px;top:430px;width:860px;border-radius:18px;overflow:hidden;background:#0b1118;
    box-shadow:0 0 0 6px #ffd21f,0 30px 80px #000c}}
  #barra{{height:44px;background:#1b2430;display:flex;align-items:center;gap:10px;padding:0 18px;color:#c9d4e2;font-size:22px;font-weight:600}}
  #barra i{{width:14px;height:14px;border-radius:50%;background:#56606e;display:inline-block}}
  #barra b{{margin-left:18px;background:#0b1118;border-radius:8px;padding:5px 16px;font-weight:600}}
  #janela img{{display:block;width:860px;height:484px}}
  #titulo{{position:absolute;left:1000px;right:40px;top:60px;white-space:nowrap;color:#fff;text-shadow:0 6px 30px #000a;{fonte}}}
  svg{{position:absolute;inset:0;z-index:2}}
</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1920" data-height="1080" data-fps="30" data-no-timeline>
<img id="foto" src="grua-real.jpg">
<div id="sombra"></div>
<svg width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity=".7"/></filter></defs>
  <g filter="url(#sh)" fill="none" stroke="#ffd21f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 440 680 Q 700 500 958 600"/>
    <path d="M 920 560 L 962 602 L 908 624"/>
  </g>
</svg>
<div id="titulo">{titulo}</div>
<script>{{const t=document.getElementById('titulo');let f=parseFloat(getComputedStyle(t).fontSize);
const ok=()=>t.scrollWidth<=t.clientWidth+1&&t.offsetHeight<=350;
document.fonts.ready.then(()=>{{while(!ok()&&f>60){{f-=4;t.style.fontSize=f+'px';}}}});}}</script>
<div id="janela"><div id="barra"><i></i><i></i><i></i><b>{ENDERECO}</b></div><img src="sim-169.png"></div>
</div></body></html>
''')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    snapshot(P, out)
    print(out)


if '--frases' in sys.argv:
    D = os.path.join(ROOT, 'exports', 'thumb-frases')
    for i, fr in enumerate(FRASES, 1):
        compor(FONTE, '<br>'.join(fr), os.path.join(D, f'{i}.png'))
elif VAR:
    D = os.path.join(ROOT, 'exports', 'thumb-variantes')
    so = [a for a in sys.argv[1:] if not a.startswith('--')]
    for nome, (fonte, html) in VARIANTES.items():
        if so and not any(nome.startswith(x) for x in so): continue
        compor(fonte, html or '<br>'.join(TITULO), os.path.join(D, nome + '.png'))
else:
    compor(FONTE, '<br>'.join(TITULO), OUT)
