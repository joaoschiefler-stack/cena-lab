# Caio e o Áudio Proibido — Ep. 1

Resposta ao `prompt.md` desta pasta (gerado pelo CENA LAB, modo Comédia seriada V1). Escrita por Claude no papel de roteirista, seguindo o prompt, sem edição manual posterior além das correções visuais anotadas no fim.

## 1. ROTEIRO

1. **Gancho** — Quarto. Caio, todo convencido, olha o celular: o áudio dele já está no grupo da turma. Mensagens rindo. "É o diretor????" — Caio entra em pânico.
2. **Tamanho do problema** — Close no pânico. Etiqueta "120 ALUNOS". Risco sobe.
3. **Ameaça com data** — Corte seco para a coordenação: Dona Marta, braços cruzados. Ela lê o grupo toda sexta. Olha para a câmera.
4. **Objetivo e prazo** — Corredor. "Hoje é segunda": Caio aponta, determinado. HUD pisca no prazo de 5 dias.
5. **Plano A** — Sala de aula. Caio discursa pedindo que todos apaguem. Lia dá de ombros.
6. **Consequência (gag)** — Flash: o áudio virou figurinha. Carimbo "FIGURINHA!", susto, risco a 60%.
7. **Plano B** — Corredor. Caio tenta convencer a Lia a assumir a voz. Ela olha para a câmera.
8. **Custo (gag)** — Close na Lia convencida: "3 MESES DE LANCHE".
9. **Falha** — Ela imita o diretor ainda pior. Caio, mão na cara. ❌.
10. **Reviravolta** — Pátio. Notificação do diretor de verdade: "Quem é o comediante desse áudio?". Susto, risco a 85%.
11. **Alívio falso** — Close: ele amou! Caio comemora… e quer o comediante apresentando a festa de sexta. Pânico de novo.
12. **Risco máximo** — Corte seco: coordenação. A festa onde a Dona Marta vai estar. Ela sorri. 💀 Risco 100%.
13. **Decisão A/B** — A: assumir e apresentar a festa (vira estrela, mas a coordenação descobre). B: jogar a culpa na Lia (se livra hoje, perde a melhor amiga).

## 2. TEXTO DA VOZ

```
L01: O Caio acabou de mandar um áudio no grupo da escola.
L02: Um áudio imitando o diretor. Com sotaque e tudo.
L03: Detalhe: o grupo tem cento e vinte alunos.
L04: E a coordenadora lê esse grupo toda sexta.
L05: Hoje é segunda. O Caio tem cinco dias para sumir com esse áudio.
L06: Plano A: pedir para todo mundo apagar.
L07: Resultado: o áudio virou figurinha.
L08: Plano B: convencer a Lia a dizer que a voz era dela.
L09: A Lia cobrou três meses de lanche.
L10: E ela imita o diretor ainda pior.
L11: Aí o diretor de verdade respondeu no grupo.
L12: Ele amou. E quer o comediante apresentando a festa de sexta.
L13: A festa onde a coordenadora vai estar.
L14: O Caio assume o áudio ou joga a culpa na Lia? Comenta A ou B.
```

128 palavras (orçamento do prompt: 130–140).

## 3. STORYBOARD

| Beat | Começa em | Cenário | Plano | Ação / reação | HUD |
|---|---|---|---|---|---|
| B01 | L01 | quarto | aberto | Caio convencido no celular → conversa do grupo → pânico + tremor | — |
| B02 | L03 | quarto | close Caio | pânico; etiqueta 120 ALUNOS | risco 40% |
| B03 | L04 (smash) | coordenação | aberto | Marta braços cruzados → olha a câmera; 👀 | — |
| B04 | L05 | corredor | médio Caio | nervoso → aponta, determinado | prazo pisca (5 dias) |
| B05 | L06 | sala de aula | aberto | Caio discursa; Lia dá de ombros | — |
| B06 | L07 (flash) | sala de aula | médio Caio | susto; carimbo FIGURINHA! | risco 60% |
| B07 | L08 (whip) | corredor | aberto | Caio negocia; Lia malandra | — |
| B08 | L09 | corredor | close Lia | convencida; 3 MESES DE LANCHE | — |
| B09 | L10 | corredor | aberto | Lia imita; Caio mão na cara; ❌ | — |
| B10 | L11 (whip) | pátio | aberto | notificação do diretor; susto | risco 85% |
| B11 | L12 | pátio | close Caio | comemora → FESTA DE SEXTA → pânico | — |
| B12 | L13 (smash) | coordenação | médio Marta | sorriso convencido; 💀 | risco 100% |
| Votação | L14 | — | tela dividida | A: Caio comemorando · B: Caio se esgueirando | — |

## 4. JSON

`episode.json` nesta pasta.

## Correções feitas depois da revisão de frames

- O selo de localização "PÁTIO" encobria a notificação do diretor → o motor esconde o selo enquanto houver notificação (correção no motor, vale para todos os episódios).
- Palavras grudadas na legenda ("VERDADERESPONDEU") → mais espaço entre palavras e destaque menor na palavra ativa (motor).
- A caveira cobria o rosto da coordenadora no close → B12 passou para plano médio (JSON).
- Legenda da votação encostando na consequência → rótulos das opções mais compactos (motor).
