# Simulador de grua de torre

Uma grua martelo em vista lateral em corte: torre, lança, contralança, tirantes, guinchos, cabos, moitão,
limitador de momento e o equilíbrio que mantém a grua de pé. Roda direto no navegador, sem instalação,
em tela 16:9 (computador) ou 9:16 (celular).

## Rodar

```bash
python3 -m http.server 8765
```

Abra http://localhost:8765. No macOS, rode o servidor pelo terminal (processos iniciados fora dele podem
não ter permissão de ler a pasta Desktop).

Parâmetros da URL:

| Parâmetro | Efeito |
|---|---|
| `?fmt=916` / `?fmt=169` | força o formato (sem ele, vale a proporção da janela; a tecla **F** alterna) |
| `?pres=N` | abre direto na cena N da apresentação |
| `?video` | modo vídeo determinístico: sem laço próprio, `sim.tick(dt, scriptDt)` avança um quadro |

## Comandos

| Ação | Teclado | Toque / mouse | Controle |
|---|---|---|---|
| Energia | L | botão verde | — |
| Emergência | X | cogumelo vermelho | — |
| Carrinho (para dentro / para fora) | ← → ou A D | joystick da esquerda | analógico esquerdo |
| Gancho (sobe / desce) | ↑ ↓ ou W S | joystick da direita | analógico direito |
| Engatar / soltar carga | G | botão do meio | — |
| Buzina | B (segurar) | botão | — |

As teclas aumentam a velocidade degrau a degrau enquanto estão apertadas (1ª a 4ª marcha).

## Modo apresentação

Botão **Apresentação** (ou `?pres=0`). Teclas: **→ / Espaço** próxima, **←** anterior, **R** repete,
**A** automático, **H** só a máquina, **P** pausa, **1–9** vai à cena, **Esc** sai. No celular: toque à
direita avança, à esquerda volta, segure 1 s para sair.

O roteiro está em `js/present/scenes.js` (dados) e a narração em `roteiro-video.md`.

## Estrutura

```
index.html            palco 1920×1080 (16:9) ou 1080×1920 (9:16)
css/style.css         cores em variáveis; regiões por formato (.f169 / .f916)
js/config.js          geometria, massas, motores, cargas e limites
js/sim/simulation.js  física pura sobre `st` (sem DOM): carrinho, guincho, pêndulo, limitador, vento, esforços
js/render/scene.js    desenho SVG da grua, câmera, destaque, quadros do guincho e da legenda
js/render/panel.js    limitador, curva de carga, relógios, momento na base, luzes
js/ui/controls.js     joysticks, teclado, controle, override do roteiro e piloto automático
js/ui/info.js         texto de cada peça
js/ui/params.js       gaveta de parâmetros e falhas
js/audio/sound.js     som sintetizado (Web Audio) com relógio injetável
js/present/           motor da apresentação + cenas
tools/testsim.mjs     teste da física no Node (node tools/testsim.mjs)
```

No console: `sim.st` (estado), `sim.pres.go(n)`, `sim.tick(dt)`, `sim.setFormat('916')`.

## Vídeo

A narração (`Narração.m4a`, fora do git) é cortada por `video/edicao.json` e as cenas seguem os tempos
da fala limpa. Passo a passo:

```bash
whisper-cli -m ~/.cache/hyperframes/whisper/models/ggml-large-v3.bin -l pt -mc 0 -nfa -dtw large.v3 -ojf -of video/build/narracao3 -f video/build/narracao16k.wav
python3 -I video/tools/palavras.py            # palavras com tempo e pausas (para achar os cortes)
python3 -I video/tools/build.py --palavras    # palavras de cada cena no tempo do vídeo
python3 -I video/tools/build.py --916         # corta o áudio e gera video/project (16:9) e video/project-916
python3 -I video/tools/som.py                 # servidor sem cache na porta 8770
# abrir http://localhost:8770/video/project/index.html?audio, esperar "pronto" e rodar o build de novo
npx hyperframes@0.9.23 preview video/project  # prévia no Studio
npx hyperframes@0.9.23 render video/project -o video/build/grua-169.mp4
```

Com `speed: [[t, 2], [t2, 1]]` uma cena acelera a física (selo "▶▶ 2×" na tela).
