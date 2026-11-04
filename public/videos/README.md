# Vídeos da galeria

Coloque aqui apenas animações **reais**, produzidas com prompts do CENA LAB e com direito de uso.

## Como publicar um vídeo

1. **Exporte o vídeo** em MP4 vertical (9:16, de preferência 1080×1920, H.264 + AAC).
   Para carregar rápido no celular, mire em até ~8–15 MB para 60s.
2. **Crie uma miniatura** 9:16 em JPG ou WEBP (ex.: 720×1280), com o mesmo nome do vídeo.
3. **Copie os arquivos** para esta pasta:
   ```
   public/videos/30-dias-casamento-ep1.mp4
   public/videos/30-dias-casamento-ep1.jpg
   ```
4. **Edite `src/data/videos.ts`** e preencha o registro do vídeo:
   - `description`: uma ou duas frases sobre a história;
   - `idea`: a ideia exatamente como foi digitada no estúdio;
   - `durationSec`, `style`, `settings`, `series`: o que foi usado de verdade;
   - `process.tools`, `process.steps` e `process.manualEdits`: relato honesto de como foi feito (inclusive edições fora do Claude);
   - `published: true`.
5. Rode `npm run build`. O vídeo aparece em `/exemplos` e, se `featured: true`, como destaque na homepage.

## Regras de exibição

O site só mostra um vídeo quando:

- `published` está `true`;
- o arquivo de `src` existe nesta pasta;
- `description`, `idea` e `process` estão preenchidos.

Se algo faltar, o vídeo fica oculto e o build mostra um aviso `[galeria]` no terminal. A miniatura é opcional: sem ela, o player usa o primeiro quadro do vídeo.

Os vídeos nunca tocam sozinhos com som.
