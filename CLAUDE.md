# Grua de torre — notas para o Claude

Simulador interativo de grua martelo no mesmo método da escavadeira (`documentacao/`, privada e fora do git).
HTML + SVG + JS puro (módulos ES), sem build. Leia `README.md` para estrutura e comandos.

## Regras do projeto

- **Dois formatos**: 16:9 (palco 1920×1080) e 9:16 (palco 1080×1920). Toda mudança de layout precisa ser
  conferida nos dois (`?fmt=916`). No 9:16 o palco vira ~390 px num celular: textos pequenos somem.
  Os textos da cena SVG são ampliados 1,75× no 9:16 e encolhem com o zoom da câmera (`scene.update`).
- **Física separada do desenho**: `js/sim/simulation.js` não toca no DOM. Teste com `node tools/testsim.mjs`.
- **Só vista lateral**: sem giro. Graus de liberdade: raio do carrinho, cabo do gancho, balanço da carga.
- **Modo vídeo determinístico** (`?video`): sem requestAnimationFrame, `Math.random` com semente por cena
  (`app.onSceneStart`), transições CSS desligadas, som com `sound.clock`. Nada que apareça no quadro pode
  depender do relógio real.
- **Cenas são dados** (`js/present/scenes.js`). Chaves com sufixo `916` valem no 9:16. Confira cada cena
  pelos números (`sim.pres.go(n)` + `sim.tick(1/60)` em laço + `sim.st`) antes de olhar o visual.
- **Som** só sintetizado; hierarquia: parada < movimento < elevação pesada < alarme de corte. Meça com
  `OfflineAudioContext` (pico < 0,8).
- Servidor local: `python3 -m http.server 8765` rodado pelo terminal (o macOS bloqueia a pasta Desktop
  para processos iniciados pelo app). Ele deixa o navegador guardar os módulos em cache: para testar
  mudanças use `python3 -I video/tools/som.py` (porta 8770, sem cache).
- Som: os estalos (freios, engate, pouso) vão pelo canal `fx`, mais baixo, e há um limitador no fim da
  cadeia. Pico do som gravado < 0,8.

## Vídeo (ver README, seção Vídeo)

- A narração gravada manda: os tempos de `scenes.js` são segundos desde o começo da cena **no vídeo
  editado** (`python3 -I video/tools/build.py --palavras` lista as palavras de cada cena nesse tempo).
  Se `video/edicao.json` mudar (cortes, pausas, início das cenas), confira os tempos das cenas de novo.
- Depois de mexer em cenas, física ou som: `build.py --916`, regravar o som da máquina
  (`localhost:8770/video/project/index.html?audio`) e `build.py --916` outra vez para mixar.
- Ação física mais lenta que a fala: use `speed: [[t, 2], [t2, 1]]` na cena (física em 2× com selo na
  tela), nunca esconda o tempo.
- Engatar e soltar no roteiro: use `during(t0, t1, engatar|soltar)`, que tenta a cada 0,2 s, e confira pelos
  números se acontece na palavra certa.
- O vídeo 9:16 sai sem legendas (cobririam os comandos); o 16:9 mostra legendas ao lado dos comandos.
- O HyperFrames reserva `data-layer`, `data-start`, `data-duration` e `data-track-index`: não use no app.
- Render: `npx hyperframes@0.9.23 render video/project -o exports/grua-torre-169.mp4` (e `project-916`).
  Cerca de 3 min cada no Mac. `exports/` fica fora do git.
