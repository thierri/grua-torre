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
  para processos iniciados pelo app).
