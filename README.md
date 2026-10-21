# Wastzera • Sorteios — V0.11

Site com skins de CS2, GIFT CARD, código de quatro partes no YouTube e roleta de participantes. Base técnica: Next.js, React, TypeScript, Supabase e Hostinger. O projeto Rocha não é alterado.

## Novidades da V0.11

- Roleta do ADMIN ampliada de 360 px para até **520 px**, conforme o espaço disponível, com nomes e centro maiores.
- Mais espaço para a roleta no desktop; em telas menores, participantes e controles aparecem abaixo, mantendo a roleta circular e sem corte.
- Giro de 50 segundos, música, foto com logo neon e demais recursos mantidos.

**Atualização V0.10 → V0.11:** preserve `.env.local`, atualize os arquivos, execute `npm ci` e `npm run build` e faça o redeploy. Não há nova migração. Instalações anteriores à V0.8 precisam da migração `database/004_twitch_nick.sql` para o campo nick.

## Recursos mantidos

- Campo **Descrição** removido da criação e dos cards. O campo de link do vídeo no YouTube fica em destaque.
- **2.126 skins do catálogo consultado**, com nome e imagem baixada. Lista suspensa agrupada por arma, com filtro opcional por nome no ADMIN. A seleção atualiza a imagem no espaço superior. Cada opção mantém a identidade exata do item, inclusive quando existem nomes parecidos.
- Uma única opção **GIFT CARD**, com valor definido pela organização. Não há opções separadas de Steam, Xbox etc.
- Card público com imagem do prêmio e botão para o vídeo daquele sorteio.
- Central da roleta sem números à direita nem exportação. Botões alinhados e nomes mantidos na lista e na roleta.
- Aba **Participantes** separada: consulta por sorteio, busca por nome e dados completos, com arquivos reais **Excel (.xlsx)** e **Word (.docx)**.

## Conferir as prévias

Extraia o pacote inteiro e mantenha a pasta `public` junto dos arquivos HTML.

- **PREVIA.html**: página inicial e teste local do código **WAST**.
- **PREVIA_ADMIN.html**: painel, catálogo completo, busca, seleção de prêmio, alternância letras/palavras, geração de pistas e giro demonstrativo.
- **PREVIA_PARTICIPANTES.html**: aba com nomes e contatos fictícios.

As prévias não fazem cadastros reais nem alteram o banco. Os downloads de dados reais funcionam no aplicativo configurado e autenticado. As imagens são arquivos locais do pacote, sem dependência de links externos durante o uso.

## Criar e realizar um sorteio

1. Entre em `/admin` com a senha configurada.
2. Crie um sorteio: título, skin ou GIFT CARD, valor, encerramento, limite e regras completas.
3. Defina quatro letras ou quatro palavras na ordem em que deverão aparecer no vídeo.
4. Salve o rascunho. O link pode ser adicionado após a edição/publicação do vídeo.
5. Baixe as quatro pistas em SVG espelhado e insira no vídeo do YouTube. Os SVGs são transparentes, em 1920 × 1080; converta para PNG se o editor exigir.
6. Salve o link do vídeo no rascunho e publique o sorteio.
7. O espectador encontra as quatro partes, digita a combinação no site e libera o formulário de nome, nick da Twitch, telefone e e-mail.
8. A participação é confirmada somente ao enviar o formulário, aceitar as regras e receber um número.
9. Encerre as inscrições no painel e gire a roleta. O resultado é registrado no servidor antes da animação e não pode ser sorteado novamente.
10. Consulte os dados e baixe Word/Excel na aba **Participantes**.

O código não diferencia espaços, acentos ou maiúsculas: `W A S T` equivale a `WAST`, e `MIRA TROPA DROP VITÓRIA` equivale à mesma sequência sem espaços/acentos. O mesmo código é compartilhado pelos espectadores daquele vídeo. Uma participação por e-mail e telefone normalizados em cada sorteio.

O site valida o código, mas não comprova visualização completa, comentários, inscrição no canal ou identidade da conta YouTube. Não edita nem envia vídeos, não cobra pela participação, não envia mensagens e não entrega os prêmios automaticamente.

## Instalar localmente

Use uma pasta nova. Requisitos: Node.js **22**, npm 10+ e projeto Supabase separado.

No PowerShell dentro da pasta:

```powershell
.\INICIAR_WASTZERA.ps1
```

O script instala dependências, verifica TypeScript, testes e build. Cria `.env.local` com senhas aleatórias apenas se não existir; preserva um arquivo existente. Não faz commit, push ou publicação.

No SQL Editor do Supabase novo, execute nesta ordem `database/001_wastzera.sql`, `database/003_catalogo.sql` e `database/004_twitch_nick.sql`. Preencha `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=URL do projeto Supabase
SUPABASE_SERVICE_ROLE_KEY=chave secreta do servidor
ADMIN_PASSWORD=senha com ao menos 16 caracteres
ADMIN_COOKIE_SECRET=segredo aleatório com ao menos 32 caracteres
APP_ORIGIN=http://localhost:3000
```

Execute `npm run dev` e abra `http://localhost:3000/admin`.

Sem credenciais do Supabase, o site exibe apenas exemplos marcados como demonstração. Inscrições reais exigem o banco configurado e um sorteio publicado.

## Atualização de versões anteriores

Guarde uma cópia da instalação e preserve `.env.local`.

- **V0.3 → V0.4:** execute `database/003_catalogo.sql`, atualize o aplicativo e a pasta `public`, rode `npm ci` e `npm run build`, depois redeploy. A migração só acrescenta o campo de identificação do item; preserva participantes e resultados.
- **V0.2 → V0.4:** execute também `003_catalogo.sql`.
- **V0.1 → V0.4:** execute `002_codigo_video.sql` e depois `003_catalogo.sql`. A migração 002 interrompe se existirem campanhas antigas abertas: encerre-as na versão anterior antes de trocar o fluxo.

## Hostinger + GitHub

Use um repositório próprio, separado de `conviterocha`. Runtime Node.js 22. Build: `npm ci && npm run build`. Start: `npm run start`.

Cadastre as cinco variáveis no hPanel. Em produção, `APP_ORIGIN` deve ser a origem HTTPS exata. Não envie `.env.local`, logs, `node_modules` ou `.next` ao GitHub. Envie também todas as imagens de `public/skins/all`; elas fazem parte do projeto.

Teste uma campanha completa no Supabase/Hostinger reais antes de abrir inscrições reais. Preencha as regras com responsável, contato, prazo, prêmio, elegibilidade, entrega e tratamento/retenção dos dados.

## Dados e roleta

Nome completo, nick da Twitch, telefone e e-mail ficam restritos à aba administrativa. Na roleta pública, lista pública e resultado, usamos primeiro nome e inicial do último sobrenome. O consentimento informa essa exibição.

A roleta exibe até 16 nomes nos setores para manter a leitura; todos os cadastrados concorrem no servidor. O ganhador sempre é incluído no setor final. O registro guarda número, horário, quantidade e hash do conjunto. A animação representa esse resultado, sem certificação independente de imparcialidade.

A aba Participantes mostra 50 registros por página. Os botões de Excel/Word exportam todos os participantes do sorteio selecionado, mesmo quando há um filtro de busca aplicado na tela.

## Catálogo e imagens

Foram baixadas as **2.126 imagens**, sem falhas, do catálogo agrupado disponível em 19/10/2026: uma entrada por skin/modelo/acabamento do conjunto consultado, sem multiplicar as opções por desgaste, StatTrak ou Souvenir. Não são incluídos preços de mercado.

Fontes: [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API) e CDN da Steam. `ASSET_SOURCES.json` registra cada arquivo e origem. Artes e marcas pertencem aos respectivos titulares. O catálogo é uma fotografia da fonte na data do download; novos itens do jogo precisam de atualização futura.

## Verificação

```powershell
npm run typecheck
npm test
npm run build
npm run check:env
```

`check:env` destina-se à produção e exige HTTPS em APP_ORIGIN. Consulte `VERIFICACAO.md` para o alcance dos testes.

## Testar a música na prévia

Extraia o pacote inteiro e abra `PREVIA_ADMIN.html`. O áudio é local e funciona junto da pasta `public`. Você também pode executar `npm run preview:html` e abrir `http://127.0.0.1:4173/PREVIA_ADMIN.html`. O comando usa apenas Node.js, sem banco. Clique em Ouvir música ou teste o giro demonstrativo; ajuste o volume no player.
