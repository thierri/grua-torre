# Concepção: simulador de grua de torre (martelo)

Página 1 do método (`documentacao/02-metodo-novas-maquinas.md`, seção 1). Nada de código antes de
fechar isto.

Decisões já tomadas:

- **Grua martelo**: torre treliçada, lança horizontal com carrinho, contralança com contrapeso e torre do
  topo (ponta) com tirantes.
- **Só vista lateral, sem giro**: o carrinho anda na lança e o gancho sobe e desce. Nada mais.
- **Som 100% sintetizado** a partir da física (Web Audio), compatível com a gravação offline do vídeo.
- **Dois formatos de tela**: 16:9 (computador e vídeo) e 9:16 (celular e vídeo vertical). A apresentação
  funciona nos dois, com enquadramento e holofote próprios em cada um.
- Mesma base da escavadeira: HTML + SVG + JS puro, sem build, `window.sim`, modo vídeo determinístico
  desde o primeiro dia.

---

## 1. Projeção e graus de liberdade

Vista lateral em corte, com a lança apontando para a direita.

| Grau de liberdade | Faixa | Quem comanda |
|---|---|---|
| Raio do carrinho | 2,5 → 60 m | joystick esquerdo (frente/trás) |
| Altura do gancho | 0 → 45 m sob o gancho | joystick direito (sobe/desce) |
| Balanço da carga (pêndulo) | livre, plano lateral | a física (consequência do carrinho e do vento) |

Fora: giro, translação sobre trilhos, telescopagem da torre. O balanço da carga é o grau de liberdade
"de graça" que a vista lateral mostra muito bem.

## 2. Cadeia de energia

```
rede elétrica 380 V → inversores de frequência → motores elétricos → freio + redutor → tambor
→ cabo de aço → polias / moitão → gancho → carga
proteções: limitador de momento, limitador de carga, fins de curso, freio de falha segura, anemômetro
```

E uma segunda cadeia, a de **forças na estrutura** (o "óleo" desta máquina):

```
peso da carga → cabo → carrinho → lança → tirantes → topo → torre → base / fundação
peso do contrapeso → contralança → tirantes traseiros → topo
```

A pergunta central do vídeo: **por que a grua não tomba?** A resposta é o equilíbrio de momentos entre a
carga na lança e o contrapeso na contralança, e o limitador que nunca deixa esse equilíbrio passar do
limite.

## 3. O "miolo" (o que o público nunca viu)

1. **Guincho de elevação** (na contralança, ao lado do contrapeso), em corte: motor elétrico, freio
   eletromagnético (sapatas abrindo e fechando), redutor e tambor girando com o cabo enrolando em camadas.
2. **Caminho do cabo**: do tambor, pela contralança, sobe ao topo, passa pela lança até o carrinho, desce
   ao moitão e volta. Os tracinhos andando mostram o cabo correndo, como o fluxo de óleo na escavadeira.
3. **Moitão com 2 ou 4 cabos (passagens)**: com 4, a força dobra e a velocidade cai pela metade. É o
   "área × pressão" desta máquina.
4. **Guincho do carrinho** (pé da lança): motor menor, cabo em laço fechado puxando o carrinho.
5. **Tirantes e treliça coloridos pelo esforço**: azul (folga) → vermelho (no limite), a mesma escala
   de cores das máquinas anteriores, agora para tração e compressão.
6. **Momento na base da torre**: uma seta curva e uma barra mostrando se a torre está sendo "puxada" para
   frente (carga) ou para trás (contrapeso). Grua descarregada pende para trás, e isso surpreende.
7. **Limitador de momento** em corte: a lâmina/haste que deforma com a tração no tirante e aciona os
   contatos de 90% e 100%.

## 4. Comandos e instrumentos

**Comandos** (o que o operador toca, na cabine ou na botoeira de rádio):

- Botão de energia (liga a grua) e **botão de emergência** (cogumelo vermelho).
- Joystick esquerdo: carrinho para fora / para dentro.
- Joystick direito: gancho sobe / desce.
- Os joysticks têm **degraus de velocidade** (1ª a 4ª marcha, como os reais), com rampa suave no
  inversor.
- Buzina.
- No playground: escolha da carga presa no gancho (palete de blocos, caçamba de concreto, viga de aço,
  feixe de vergalhões), apanhada e solta no chão.

**Instrumentos** (o que o operador lê):

- Carga no gancho (t), raio (m), altura do gancho (m).
- **Momento em %** com faixas verde / amarela (90%) / vermelha (100%).
- **Curva de carga**: o gráfico carga × raio com um ponto vivo mostrando onde a grua está agora. É o
  instrumento mais didático.
- Vento (km/h) com o anemômetro girando no topo.
- Rotação e corrente de cada motor (ponteiros).
- Luzes: pré-alarme, corte por momento, sobrecarga, fim de curso alto/baixo, carrinho no limite, vento.

**Parâmetros (gaveta)**: vento, contrapeso, número de passagens do cabo (2/4), massa da carga
personalizada. **Falhas**: limitador desativado (mostra o que ele evita, sem tombar de verdade: a torre
fica vermelha e a grua "desiste"), freio gasto (a carga escorrega um pouco ao parar), rajada de vento.

## 5. Física mínima (números de uma grua média)

- Lança 60 m, contralança 18 m, altura sob o gancho 45 m.
- Carga máxima 8 t (4 cabos) ou 4 t (2 cabos). Carga na ponta: 2 t.
- Curva de carga: `Q(r) = min(Qmáx, M / r)`, com `M ≈ 120 t·m` (8 t até 15 m, 2 t a 60 m).
- Elevação: motor de 37 kW com potência constante. Carga leve sobe a até 80 m/min e carga pesada a
  20–40 m/min. Com 4 cabos, a velocidade cai pela metade.
- Carrinho: até 60 m/min, com rampas de aceleração.
- **Pêndulo**: comprimento = cabo entre carrinho e gancho, período `2π√(L/g)` (cerca de 11 s com 30 m). O
  carrinho acelerando faz a carga ficar para trás e balançar. Vento empurra a carga e a lança.
- Estrutura: momento na base = carga × raio + peso próprio da lança − contrapeso × braço. Tração nos
  tirantes por equilíbrio estático do topo. Nada de elementos finitos: equilíbrio de momentos basta.
- Limitador: aos 90% acende o pré-alarme e corta a 4ª marcha; aos 100% bloqueia subir e carrinho para fora,
  e só deixa descer e trazer para dentro.
- Fins de curso de altura e raio com desaceleração antes do batente.
- Freio: aplicado sempre que o motor não tem comando ou energia (falha segura).

## 6. Som (mapa física → som)

| Som | Ligado a |
|---|---|
| Motor do guincho de elevação | frequência do inversor: tom grave do motor + harmônicos; mais carga = mais "pesado" |
| Chiado do inversor | assobio agudo de chaveamento (o som característico das gruas modernas), subindo e descendo com a rampa |
| Redutor | zumbido de engrenagem proporcional à rotação |
| Freio eletromagnético | "clac" do solenoide ao soltar e ao aplicar |
| Contator | clique seco ao ligar cada movimento |
| Cabo e polias | rangido e chiado leve proporcionais à velocidade do cabo; tilintar do moitão |
| Motor do carrinho | igual ao de elevação, menor e mais agudo; rodas do carrinho rolando na lança |
| Estrutura | estalos e rangidos metálicos graves quando o momento muda rápido |
| Vento | ruído filtrado com rajadas, ligado à velocidade do vento; anemômetro girando |
| Carga | baque ao tocar o chão, correntes/lingas batendo |
| Alarmes | bipe intermitente no pré-alarme, contínuo no corte; buzina do operador |

Hierarquia de volume: parada < movimento leve < elevação pesada < alarme de corte.

## 7. Layout nos dois formatos

**16:9 (1920×1080)**: igual à escavadeira. Cena de 1400×784 à esquerda (a grua é larga e cabe bem), painel
de instrumentos à direita e comandos embaixo.

**9:16 (1080×1920)**: cena no alto (1080×≈1000), com a câmera seguindo o carrinho quando a grua inteira
não couber; instrumentos compactos no meio (momento, curva de carga, carga/raio/altura); comandos de toque
embaixo (dois joysticks grandes para o polegar e botões). A gaveta de parâmetros vira uma folha que sobe da
parte de baixo.

O formato é escolhido pela proporção da janela. Cada cena da apresentação tem `cam` e `spots` para os dois
formatos (`cam` e `cam916`, por exemplo).

## 8. Demonstrações-chave do vídeo

1. **O limitador de momento**: 4 t perto da torre sobem sem problema. O carrinho vai saindo, o momento
   sobe, o ponto anda na curva de carga, o pré-alarme bipa e, aos 100%, o carrinho para. Só dá para voltar.
2. **Por que o contrapeso**: grua vazia pende para trás, grua carregada pende para frente. O momento na
   base troca de sinal e o contrapeso escolhe o meio-termo.
3. **2 cabos × 4 cabos**: a mesma carga sobe com metade da força em cada cabo e na metade da velocidade.
4. **O balanço da carga**: o carrinho para de repente e a carga balança. Depois, o operador "pega" o
   balanço com um toque no carrinho no momento certo.
5. **Freio de falha segura**: o botão de emergência corta a energia e a carga para no ar.
6. (Extra) **Vento**: o anemômetro sobe, a carga é empurrada, o alarme de vento toca.

## 9. Roteiro do vídeo (esqueleto)

1. Abertura + link.
2. Tour da tela (diagrama, instrumentos, comandos, barra).
3. A estrutura: torre, lança, contralança, topo, tirantes.
4. O guincho de elevação por dentro e o caminho do cabo.
5. O moitão: 2 × 4 cabos.
6. O carrinho.
7. Equilíbrio e contrapeso.
8. Curva de carga e limitador de momento.
9. O balanço da carga.
10. Segurança: freio, emergência, vento.
11. Ciclo completo: pegar a caçamba de concreto no chão e levar até o alto da obra.
12. Encerramento: "agora é a sua vez".

---

## Pontos em aberto (pode responder junto com a aprovação)

- Cenário: um prédio em construção ao lado da torre, para dar escala e destino às cargas? (proposta: sim,
  com lajes para pousar a carga)
- Nome do repositório e publicação no GitHub Pages (`thierri/grua-torre`?).
- A pasta ainda não é um repositório git. Posso dar `git init` quando começar o código.
