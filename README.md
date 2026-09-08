# Ilha das Capivaras

Jogo idle mobile/PWA: colha frutas, contrate capivaras, melhore a produção e expanda uma pequena ilha tropical. Interface em português, instalação na tela inicial e funcionamento offline depois do primeiro carregamento completo.

## Executar

Requer Node.js 22.13 ou superior e npm.

```sh
npm install
npm run dev
```

Acesse o endereço local informado pelo terminal.

## Validar

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

O build estático fica em `dist/client`. Pode ser servido por qualquer hospedagem estática. Não precisa de servidor de aplicação, banco de dados ou credenciais.

## Instalar no celular

Hospede `dist/client` em HTTPS. No Android, use o botão Instalar quando oferecido pelo navegador. No iPhone, abra no Safari e escolha Compartilhar → Adicionar à Tela de Início, mantendo Abrir como App da Web ativado quando a opção existir. O botão Instalar também apresenta essas instruções.

Instale antes de começar no iPhone: o app instalado e o Safari mantêm armazenamentos separados. Não há migração automática de partidas. [Referência WebKit](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

O service worker é gerado ao final do build com a lista e hash dos arquivos, incluindo fontes e ícones. O modo de desenvolvimento não registra service worker, para evitar cache de código em edição. Para validar instalação/offline, use o build publicado ou um servidor estático em localhost. Novas versões aguardam o botão Atualizar ou o fechamento das janelas antigas; atualizar preserva o armazenamento da partida.

## Como jogar

- A primeira capivara já produz uma fruta por segundo. O botão de colher ajuda a acelerar.
- Contrate ajudantes no pomar, na horta e na cozinha. Os preços aumentam a cada contratação.
- Expanda para o Bosque das Mangas (250 frutas) e a Baía do Sol (2.000 frutas). Cada expansão soma 25% à produção e à colheita manual.
- Melhorias dobram a produção de cada atividade. A cesta reforçada aumenta a colheita manual de 2 para 5 frutas, antes do bônus da ilha.
- O jogo salva automaticamente neste navegador e calcula até oito horas de produção por ausência.

## Estrutura

- `app/page.tsx`: interface e ciclo de salvamento/atualização.
- `app/globals.css`: tema e layout responsivo.
- `lib/game.ts`: regras independentes da interface.
- `tests/game.test.ts`: testes de compras, progressão, tempo e salvamento.
- `public/island.webp`: ilustração original gerada para o jogo.
- `app/pwa-controls.tsx`: instalação, estado offline e atualização.
- `scripts/build-pwa.mjs`: geração do cache da PWA sobre o build final.

Stack: React, TypeScript e Vinext/Vite, a partir do starter Sites; componentes Base UI/Shadcn e ícones Lucide. A ilustração é decorativa; os contadores e rótulos mostram a produção real da partida.

## Limites desta primeira versão

O progresso é local ao navegador ou app instalado e dispositivo. Use uma aba por vez; não há sincronização entre abas ou aparelhos. Limpar os dados do navegador remove a partida. O relógio do dispositivo é usado para a produção offline. Partidas malformadas são preservadas na chave `ilha-das-capivaras:v1:backup` antes de iniciar uma nova ilha. Se a leitura inicial falhar, a sessão não sobrescreve o progresso desconhecido. Cada atividade aceita até 250 capivaras.

Sem login, anúncios, compras reais ou servidor. Não há geração de imagens durante o jogo.

## Dependências do starter

A auditoria npm ainda sinaliza componentes de servidor e ferramentas herdadas do starter. A publicação desta versão contém somente arquivos estáticos; não executa esses servidores nem aceita imagens enviadas pelo usuário. Reavaliar e atualizar essas dependências antes de adicionar servidor, uploads ou expor o ambiente de desenvolvimento.
