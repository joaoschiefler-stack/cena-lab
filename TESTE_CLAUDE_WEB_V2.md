# Teste manual do prompt V2 no Claude Web / Desktop

Os prompts abaixo foram gerados pelo CENA LAB (caminho real do servidor) e estão prontos para colar. **Eles ainda não foram executados no Claude Web**: a qualidade visual da V2 só fica comprovada depois deste teste.

| Arquivo | O que testa |
|---|---|
| `docs/teste-v2/1-comedia-escolar-ab.md` | Cartoon 2D · humor · 60s · final A/B · legendas cinéticas |
| `docs/teste-v2/2-suspense.md` | Cartoon 2D · suspense · 45s · história completa |
| `docs/teste-v2/3-serie-continuacao-ep2.md` | continuação de série (Ep. 2), decisão vencedora A |
| `docs/teste-v2/comparacao-v1-comedia-escolar-ab.md` | o mesmo caso 1 na V1 (para comparar) |

## Passo a passo (faça pelo menos os testes 1 e 2)

1. Abra o Claude (claude.ai ou o app Desktop) numa **conversa nova**, com o mesmo modelo que os compradores vão usar (ex.: Opus 5.5).
2. Abra o arquivo do teste no VS Code, selecione tudo (`Ctrl+A`), copie e cole na conversa. Envie sem acrescentar nada.
3. Espere a resposta inteira. Se ela parar no meio do código, escreva: `continue exatamente de onde parou`.
4. Abra o artifact. Se aparecer erro, cole a mensagem de erro na conversa e peça: `corrija este erro sem mudar o resto`. Anote quantas correções foram necessárias.
5. Clique em reproduzir e assista do começo ao fim **duas vezes**, sem pausar.
6. Preencha a ficha abaixo.
7. Grave um trecho: botão **Modo gravação** → `Win + Alt + R` (Xbox Game Bar) no Windows, ou `Cmd + Shift + 5` no Mac. Grave no computador, em tela cheia, com outras abas fechadas.
8. (Opcional) Repita o teste 1 com o arquivo da V1 numa conversa nova e compare.

## Ficha de avaliação (marque Sim/Não)

| # | Critério | Teste 1 | Teste 2 |
|---|---|---|---|
| 1 | Nos 3 primeiros segundos já acontece algo e dá para entender o problema | | |
| 2 | O protagonista aparece grande (meio corpo ou rosto) em boa parte do vídeo; reações em close | | |
| 3 | Cores fortes; personagem se destaca do fundo | | |
| 4 | Toda cena tem alguém se mexendo/reagindo — não parece slide com zoom | | |
| 5 | A câmera muda de plano quando algo acontece | | |
| 6 | Legendas grandes, 2–4 palavras, contorno preto, perto da ação, sem cobrir rostos | | |
| 7 | Há escalada: cada tentativa piora a situação | | |
| 8 | (Teste 1) Quadro final em tela dividida A/B, legível, ~8s, com "Comenta A ou B" | | — |
| 9 | Animação fluida no navegador (sem engasgos) | | |
| 10 | Funcionou sem correções / quantas correções foram precisas | | |
| 11 | O roteiro de narração veio completo, no formato `=== ROTEIRO DE NARRAÇÃO ===` | | |

## O que me mandar de volta

- A ficha preenchida.
- Prints de 3 momentos de cada vídeo (começo, meio e fim) — salve na pasta Downloads.
- Se possível, a gravação (MP4) na pasta Downloads.
- As mensagens de erro, se houver.

Com isso dá para dizer, com evidência, se a V2 melhorou em relação à V1 e o que ainda falta ajustar no prompt.

## O que não esperar

- O Claude Web não exporta MP4: o vídeo sai da gravação de tela.
- Sem a voz gravada, a sincronia das legendas é estimada. O prompt pede as constantes `CAPTION_OFFSET` e `SPEECH_RATE` no topo do código para ajustar depois de gravar a voz.
- O resultado varia entre execuções: um teste bom não garante todos os próximos.
